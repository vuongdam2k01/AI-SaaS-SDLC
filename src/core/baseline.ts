import path from "node:path";
import { readdir } from "node:fs/promises";
import fg from "fast-glob";
import type { BaselineManifest, ChangeRecord, ExecutionRecord } from "./types.js";
import { scanArtifacts } from "./artifacts.js";
import { buildGraph, reverseClosure } from "./graph.js";
import { calculateImpact } from "./impact.js";
import { selectTests } from "./test-selection.js";
import { validateProject } from "./validation.js";
import { loadConfig } from "./config.js";
import { gitCommit } from "./git.js";
import { loadActiveFlow, loadCurrentState, pathExists, saveCurrentState } from "./state.js";
import { loadBaseline, refreshProject } from "./project.js";
import { assertSafeManagedPath, prepareSafeManagedPath, projectPaths } from "./paths.js";
import { formatId, readJson, writeJsonAtomic } from "./utils.js";
import { SdlcError } from "./errors.js";
import { isChangeRecord, isExecutionRecord } from "./record-validation.js";
import { loadRetrievalRecords } from "./retrieval-records.js";
import { latestExecution, matchesDefinitionEvidence } from "./execution-selection.js";
import { withProjectLock } from "./project-lock.js";
import { enforceFlowArtifactBoundaries } from "./baseline-flow-rules.js";
import { implementationSnapshotHash } from "./implementation-snapshot.js";
import { openQuestions } from "./question-ledger.js";

function nextBaselineId(current: string | null): string {
  if (!current) return "BL-000";
  const number = Number(current.slice(3));
  if (!Number.isInteger(number)) throw new SdlcError(`Invalid active baseline ID: ${current}`);
  return formatId("BL", number + 1);
}

async function flowExecutions(root: string, flowId: string): Promise<ExecutionRecord[]> {
  const executionsDirectory = projectPaths(root).executions;
  if (!(await pathExists(executionsDirectory))) return [];
  await assertSafeManagedPath(root, path.join(executionsDirectory, ".managed-probe"));
  for (const entry of await readdir(executionsDirectory, { withFileTypes: true })) if (entry.isSymbolicLink() && /^EXEC-.*\.json$/.test(entry.name)) throw new SdlcError(`Execution record cannot be a symlink: ${entry.name}`);
  const files = await fg("EXEC-*.json", { cwd: executionsDirectory, absolute: true, followSymbolicLinks: false });
  const records: ExecutionRecord[] = [];
  for (const file of files) {
    await assertSafeManagedPath(root, file);
    const record = await readJson<ExecutionRecord>(file);
    if (!isExecutionRecord(record)) throw new SdlcError(`Invalid execution record schema: ${file}`);
    if (record.flow_id === flowId) records.push(record);
  }
  return records;
}

async function createBaselineUnlocked(root: string): Promise<BaselineManifest> {
  const flow = await loadActiveFlow(root);
  if (!flow) throw new SdlcError("A baseline can only be created inside an active flow.");
  if (flow.baseline_created) throw new SdlcError(`Flow ${flow.id} already created baseline ${flow.baseline_created}.`);
  const config = await loadConfig(root);
  const artifacts = await scanArtifacts(root);
  const validation = await validateProject(root, artifacts);
  if (!validation.valid) throw new SdlcError(`Baseline blocked by validation errors:\n${validation.findings.filter((item) => item.severity === "error").map((item) => `- ${item.code}: ${item.message}`).join("\n")}`);
  const previous = await loadBaseline(root);
  const graph = buildGraph(artifacts);
  const impact = calculateImpact(artifacts, graph, previous);
  const flowRetrievals = (await loadRetrievalRecords(root)).filter((record) => record.flow_id === flow.id && record.ok);
  enforceFlowArtifactBoundaries(flow, artifacts, previous, impact, flowRetrievals);
  if (flow.type === "evolution" || flow.type === "reconciliation") {
    const tests = selectTests(artifacts, graph, impact.affected);
    if (tests.missing.length > 0) throw new SdlcError(`Baseline blocked by missing test specifications:\n${tests.missing.map((item) => `- ${item}`).join("\n")}`);
    const unfinished = artifacts.filter((artifact) => artifact.created_by_change === flow.change_id && artifact.status === "draft");
    if (unfinished.length > 0) throw new SdlcError(`Baseline blocked by draft artifacts created by ${flow.change_id}: ${unfinished.map((item) => item.id).join(", ")}`);
    for (const feature of artifacts.filter((artifact) => artifact.artifact_type === "feature" && artifact.status === "active")) {
      const closure = new Set(reverseClosure(graph, [feature.id]));
      const types = new Set(artifacts.filter((artifact) => closure.has(artifact.id) && artifact.status === "active").map((artifact) => artifact.artifact_type));
      const coverage = [
        { types: ["use_case"], label: "UC" },
        { types: ["business_flow"], label: "FLOW" },
        { types: ["unit_test_backend", "unit_test_frontend", "unit_test_job"], label: "UT" },
        { types: ["integration_test"], label: "IT" },
        { types: ["system_test"], label: "ST" }
      ];
      const missingTypes = coverage.filter((item) => !item.types.some((candidate) => types.has(candidate))).map((item) => item.label);
      if (missingTypes.length > 0) throw new SdlcError(`${feature.id} lacks active downstream coverage: ${missingTypes.join(", ")}`);
      // Before 1.11.0 configured implementation sources turned mapping presence
      // into a baseline error over every active feature — which made wiring a
      // codebase retroactively demand whole-repository conformance in a single
      // flow, and made a documentation-only evolution of a new feature illegal
      // in a wired repository (a mapping cannot even be authored before its
      // target file exists on disk). Mapping absence is now a standing warning
      // (IMPLEMENTATION_MAPPING_MISSING / IMPLEMENTATION_LEVEL_UNPROVEN in
      // implementation-evidence.ts): partiality is recorded, never blocking,
      // never silent — the platform-evidence doctrine applied to code.
    }
  }
  await refreshProject(root, false);
  const state = await loadCurrentState(root);
  if (flow.type === "genesis" || flow.type === "reassessment") state.evidence_revision += 1;
  let id = state.active_baseline;
  if (flow.type !== "reassessment") id = nextBaselineId(state.active_baseline);
  if (!id) throw new SdlcError("Evidence reassessment requires an existing product baseline.");
  const executions = await flowExecutions(root, flow.id);
  const verification = Object.fromEntries((["unit", "integration", "system"] as const).map((level) => {
    const definitions = config.verification[level];
    const records = executions.filter((record) => record.level === level);
    if (definitions.length === 0) return [level, "not-configured"];
    // Evidence matching is the shared predicate; its declare-after-run rationale
    // lives with matchesDefinitionEvidence in execution-selection.ts.
    const latest = definitions.map((definition) => latestExecution(records.filter((record) => matchesDefinitionEvidence(record, definition))));
    if (latest.some((record) => !record)) return [level, "not-run"];
    return [level, latest.every((record) => record?.exit_code === 0) ? "passed" : "failed"];
  })) as BaselineManifest["verification"];
  if (Object.values(verification).includes("failed")) throw new SdlcError("Baseline blocked because a configured verification command failed.");
  if ((flow.type === "evolution" || flow.type === "reconciliation") && Object.values(verification).includes("not-run")) throw new SdlcError("Baseline blocked because configured verification commands were not run in the active flow.");
  if (flow.type === "reconciliation") {
    const repairedCanonical = artifacts.some((artifact) => impact.direct.includes(artifact.id) && artifact.artifact_type !== "issue" && artifact.artifact_type !== "test_result" && artifact.id !== "SDLC-CONFIG");
    const successfulExecution = executions.some((record) => record.exit_code === 0);
    if (!repairedCanonical && !successfulExecution) throw new SdlcError("Reconciliation requires a repaired canonical artifact or a successful execution proving a code/configuration-only repair.");
  }
  if ((flow.type === "evolution" || flow.type === "reconciliation") && config.implementation_sources.length > 0) {
    const required = selectTests(artifacts, graph, impact.affected).required;
    const missingExecutionLevel = (Object.keys(required) as Array<keyof typeof required>).filter((level) => required[level] && verification[level] === "not-configured");
    if (missingExecutionLevel.length > 0) throw new SdlcError(`Configured implementation sources require verification commands for: ${missingExecutionLevel.join(", ")}`);
  }
  const manifest: BaselineManifest = {
    schema_version: 1,
    id,
    evidence_revision: `EVR-${String(state.evidence_revision).padStart(3, "0")}`,
    created_at: new Date().toISOString(),
    git_commit: gitCommit(root),
    flow_type: flow.type,
    flow_id: flow.id,
    artifacts: artifacts.map((artifact) => ({
      id: artifact.id,
      title: artifact.title,
      file: artifact.file,
      hash: artifact.hash,
      status: artifact.status,
      artifact_type: artifact.artifact_type,
      created_by_change: artifact.created_by_change,
      depends_on: artifact.depends_on,
      decisions: artifact.decisions,
      supersedes: artifact.supersedes,
      writes_to: artifact.writes_to,
      implementation: artifact.implementation,
      ...(artifact.adr_status ? { adr_status: artifact.adr_status } : {})
    })).sort((a, b) => a.id.localeCompare(b.id)),
    executions: executions.map((record) => record.id).sort(),
    verification
  };
  for (const artifact of artifacts) state.id_registry[artifact.id] ??= artifact.file;
  // Stamp every open question with the baseline it was first seen open at, and
  // forget the ones that closed. A question that is later reopened therefore
  // ages from its reopening rather than from a history it no longer has.
  const open = openQuestions(artifacts);
  const ages: Record<string, string> = {};
  for (const question of open) ages[question.id] = state.question_first_baseline?.[question.id] ?? id;
  state.question_first_baseline = ages;
  state.active_baseline = id;
  await saveCurrentState(root, state);
  await prepareSafeManagedPath(root, projectPaths(root).baseline);
  await writeJsonAtomic(projectPaths(root).baseline, manifest);
  flow.baseline_created = id;
  flow.baseline_implementation_snapshot_hash = await implementationSnapshotHash(root);
  await prepareSafeManagedPath(root, projectPaths(root).activeFlow);
  await writeJsonAtomic(projectPaths(root).activeFlow, flow);
  if (flow.change_id) {
    const file = path.join(projectPaths(root).changes, `${flow.change_id}.json`);
    await assertSafeManagedPath(root, file);
    const change = await readJson<ChangeRecord>(file);
    if (!isChangeRecord(change)) throw new SdlcError(`Invalid change record schema: ${file}`);
    await prepareSafeManagedPath(root, file);
    await writeJsonAtomic(file, { ...change, status: "baselined", successor_baseline: id, impact });
  }
  await refreshProject(root, false);
  return manifest;
}

export async function createBaseline(root: string): Promise<BaselineManifest> {
  return withProjectLock(root, () => createBaselineUnlocked(root));
}

async function syncRepresentationChangesUnlocked(root: string): Promise<string[]> {
  const flow = await loadActiveFlow(root);
  if (flow) return [];
  const baseline = await loadBaseline(root);
  if (!baseline) return [];
  const artifacts = await scanArtifacts(root);
  const validation = await validateProject(root, artifacts);
  const errors = validation.findings.filter((item) => item.severity === "error");
  if (errors.length > 0) throw new SdlcError(`Editorial synchronization requires a structurally valid repository:\n${errors.map((item) => `- ${item.code}: ${item.message}`).join("\n")}`);
  const current = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
  const synchronized: string[] = [];
  for (const entry of baseline.artifacts) {
    const artifact = current.get(entry.id);
    const relationsUnchanged = artifact
      && artifact.artifact_type === entry.artifact_type
      && artifact.title === entry.title
      && artifact.created_by_change === entry.created_by_change
      && artifact.status === entry.status
      && artifact.supersedes === entry.supersedes
      && JSON.stringify(artifact.depends_on) === JSON.stringify(entry.depends_on)
      && JSON.stringify(artifact.decisions) === JSON.stringify(entry.decisions)
      && JSON.stringify(artifact.writes_to) === JSON.stringify(entry.writes_to)
      && JSON.stringify(artifact.implementation) === JSON.stringify(entry.implementation)
      && artifact.adr_status === entry.adr_status;
    if (!artifact || artifact.file !== entry.file || artifact.hash === entry.hash || !relationsUnchanged) continue;
    const immutable = entry.artifact_type === "original_idea"
      || entry.artifact_type === "evidence_ledger"
      || entry.artifact_type === "test_result"
      || (entry.artifact_type === "architectural_decision" && entry.adr_status === "accepted")
      || entry.status === "retired" || entry.status === "superseded"
      || ["engine_configuration", "openapi_contract", "physical_schema", "screen_transitions"].includes(entry.artifact_type);
    if (immutable) continue;
    entry.hash = artifact.hash;
    synchronized.push(entry.id);
  }
  if (synchronized.length > 0) {
    await prepareSafeManagedPath(root, projectPaths(root).baseline);
    await writeJsonAtomic(projectPaths(root).baseline, baseline);
  }
  return synchronized.sort();
}

export async function syncRepresentationChanges(root: string): Promise<string[]> {
  return withProjectLock(root, () => syncRepresentationChangesUnlocked(root));
}
