import path from "node:path";
import { readdir } from "node:fs/promises";
import fg from "fast-glob";
import type { Artifact, ChangeRecord, ExecutionRecord, QueryRecord, RetrievalRecord, ValidationFinding } from "./types.js";
import { executionProvenanceIssues, resultBindingIssues } from "./execution-provenance.js";
import { queryProvenanceIssues, retrievalProvenanceIssues } from "./retrieval-provenance.js";
import { isChangeRecord, isExecutionRecord, isQueryRecord, isRetrievalRecord } from "./record-validation.js";
import { loadBaseline } from "./project.js";
import { loadActiveFlow, loadCurrentState, pathExists } from "./state.js";
import { assertSafeManagedPath, projectPaths } from "./paths.js";
import { readJson } from "./utils.js";

function numberOf(id: string): number {
  return Number(id.split("-").at(-1));
}

export async function validateInternalRecords(root: string, artifacts: Artifact[]): Promise<ValidationFinding[]> {
  const findings: ValidationFinding[] = [];
  const results = artifacts.filter((artifact) => artifact.artifact_type === "test_result");
  const resultByExecution = new Map<string, Artifact>();
  for (const result of results) {
    if (!result.execution_id) findings.push({ severity: "error", code: "RESULT_WITHOUT_EXECUTION", message: `${result.id} has no execution_id`, file: result.file });
    else if (resultByExecution.has(result.execution_id)) findings.push({ severity: "error", code: "EXECUTION_RESULT_DUPLICATE", message: `Multiple results reference ${result.execution_id}`, file: result.file });
    else resultByExecution.set(result.execution_id, result);
  }

  const executions = new Map<string, ExecutionRecord>();
  let executionsSafe = true;
  if (await pathExists(projectPaths(root).executions)) {
    try { await assertSafeManagedPath(root, path.join(projectPaths(root).executions, ".managed-probe")); } catch { executionsSafe = false; }
    if (!executionsSafe) findings.push({ severity: "error", code: "INTERNAL_PATH_ESCAPE", message: "Execution records directory escapes the project through a symlink" });
  }
  if (executionsSafe && await pathExists(projectPaths(root).executions)) {
    for (const entry of await readdir(projectPaths(root).executions, { withFileTypes: true })) if (entry.isSymbolicLink()) findings.push({ severity: "error", code: "INTERNAL_RECORD_SYMLINK", message: `Execution record entry cannot be a symlink: ${entry.name}` });
    const jsonFiles = await fg("*.json", { cwd: projectPaths(root).executions, absolute: true, followSymbolicLinks: false });
    for (const file of jsonFiles) {
      try {
        await assertSafeManagedPath(root, file);
        const record = await readJson<ExecutionRecord>(file);
        if (!isExecutionRecord(record) || path.basename(file) !== `${record.id}.json`) throw new Error("schema or filename mismatch");
        executions.set(record.id, record);
        for (const issue of await executionProvenanceIssues(root, record)) findings.push({ severity: "error", code: "EXECUTION_PROVENANCE_INVALID", message: `${record.id}: ${issue}` });
        const result = resultByExecution.get(record.id);
        if (!result) findings.push({ severity: "error", code: "EXECUTION_WITHOUT_RESULT", message: `${record.id} has no generated RESULT artifact` });
        else for (const issue of resultBindingIssues(result, record)) findings.push({ severity: "error", code: "RESULT_BINDING_INVALID", message: `${result.id}: ${issue}`, file: result.file });
      } catch (error) {
        findings.push({ severity: "error", code: "EXECUTION_INVALID", message: `Invalid execution record ${file}: ${String(error)}` });
      }
    }
    const logFiles = await fg("*.log", { cwd: projectPaths(root).executions, followSymbolicLinks: false });
    for (const log of logFiles) {
      const executionId = path.basename(log, ".log");
      if (!executions.has(executionId)) findings.push({ severity: "error", code: "EXECUTION_LOG_ORPHAN", message: `${log} has no execution record` });
    }
  }
  for (const [executionId, result] of resultByExecution) {
    if (!executions.has(executionId)) findings.push({ severity: "error", code: "RESULT_WITHOUT_EXECUTION", message: `${result.id} references missing execution ${executionId}`, file: result.file });
  }

  // Retrieval provenance mirrors execution provenance: the strict pass here
  // is the single place a broken RET/QRY record becomes a finding; the
  // lenient loaders silently skip what this loop reports.
  const retrievalRecords = new Map<string, RetrievalRecord>();
  const queryRecords = new Map<string, QueryRecord>();
  let retrievalsSafe = true;
  if (await pathExists(projectPaths(root).retrievals)) {
    try { await assertSafeManagedPath(root, path.join(projectPaths(root).retrievals, ".managed-probe")); } catch { retrievalsSafe = false; }
    if (!retrievalsSafe) findings.push({ severity: "error", code: "INTERNAL_PATH_ESCAPE", message: "Retrieval records directory escapes the project through a symlink" });
  }
  if (retrievalsSafe && await pathExists(projectPaths(root).retrievals)) {
    for (const entry of await readdir(projectPaths(root).retrievals, { withFileTypes: true })) if (entry.isSymbolicLink()) findings.push({ severity: "error", code: "INTERNAL_RECORD_SYMLINK", message: `Retrieval record entry cannot be a symlink: ${entry.name}` });
    const jsonFiles = await fg("*.json", { cwd: projectPaths(root).retrievals, absolute: true, followSymbolicLinks: false });
    for (const file of jsonFiles) {
      const name = path.basename(file);
      try {
        await assertSafeManagedPath(root, file);
        const record = await readJson<unknown>(file);
        if (name.startsWith("RET-")) {
          if (!isRetrievalRecord(record) || name !== `${record.id}.json`) throw new Error("schema or filename mismatch");
          retrievalRecords.set(record.id, record);
          for (const issue of await retrievalProvenanceIssues(root, record)) findings.push({ severity: "error", code: "RETRIEVAL_PROVENANCE_INVALID", message: `${record.id}: ${issue}` });
        } else if (name.startsWith("QRY-")) {
          if (!isQueryRecord(record) || name !== `${record.id}.json`) throw new Error("schema or filename mismatch");
          queryRecords.set(record.id, record);
          for (const issue of queryProvenanceIssues(record)) findings.push({ severity: "error", code: "RETRIEVAL_PROVENANCE_INVALID", message: `${record.id}: ${issue}` });
        } else {
          throw new Error("unrecognized record name");
        }
      } catch (error) {
        findings.push({ severity: "error", code: "RETRIEVAL_INVALID", message: `Invalid retrieval record ${file}: ${String(error)}` });
      }
    }
    const bodyFiles = await fg("*.md", { cwd: projectPaths(root).retrievals, followSymbolicLinks: false });
    for (const body of bodyFiles) {
      const retrievalId = path.basename(body, ".md");
      if (!retrievalRecords.has(retrievalId)) findings.push({ severity: "error", code: "RETRIEVAL_BODY_ORPHAN", message: `${body} has no retrieval record` });
    }
  }

  const changes = new Map<string, ChangeRecord>();
  let changesSafe = true;
  if (await pathExists(projectPaths(root).changes)) {
    try { await assertSafeManagedPath(root, path.join(projectPaths(root).changes, ".managed-probe")); } catch { changesSafe = false; }
    if (!changesSafe) findings.push({ severity: "error", code: "INTERNAL_PATH_ESCAPE", message: "Change records directory escapes the project through a symlink" });
  }
  if (changesSafe && await pathExists(projectPaths(root).changes)) {
    for (const entry of await readdir(projectPaths(root).changes, { withFileTypes: true })) if (entry.isSymbolicLink()) findings.push({ severity: "error", code: "INTERNAL_RECORD_SYMLINK", message: `Change record entry cannot be a symlink: ${entry.name}` });
    const files = await fg("*.json", { cwd: projectPaths(root).changes, absolute: true, followSymbolicLinks: false });
    for (const file of files) {
      try {
        await assertSafeManagedPath(root, file);
        const change = await readJson<ChangeRecord>(file);
        if (!isChangeRecord(change) || path.basename(file) !== `${change.id}.json`) throw new Error("schema or filename mismatch");
        changes.set(change.id, change);
      } catch (error) {
        findings.push({ severity: "error", code: "CHANGE_RECORD_INVALID", message: `Invalid change record ${file}: ${String(error)}` });
      }
    }
  }
  const resultDirectory = path.join(root, "04-verification", "results");
  if (await pathExists(resultDirectory)) for (const entry of await readdir(resultDirectory, { withFileTypes: true })) if (entry.isSymbolicLink()) findings.push({ severity: "error", code: "RESULT_PATH_INVALID", message: `Result entry cannot be a symlink: ${entry.name}` });
  for (const artifact of artifacts) {
    if (artifact.artifact_type === "test_result") {
      try { await assertSafeManagedPath(root, path.join(root, artifact.file)); } catch (error) { findings.push({ severity: "error", code: "RESULT_PATH_INVALID", message: `${artifact.id}: ${String(error)}`, file: artifact.file }); }
    }
    if (/^CHG-[0-9]{3,}$/.test(artifact.created_by_change) && !changes.has(artifact.created_by_change)) findings.push({ severity: "error", code: "CREATION_CHANGE_MISSING", message: `${artifact.id} cites missing ${artifact.created_by_change}`, file: artifact.file });
  }

  try {
    const state = await loadCurrentState(root);
    const baseline = await loadBaseline(root);
    const activeFlow = await loadActiveFlow(root);
    if ((baseline?.id ?? null) !== state.active_baseline) findings.push({ severity: "error", code: "STATE_BASELINE_MISMATCH", message: `State baseline ${state.active_baseline ?? "none"} does not match manifest ${baseline?.id ?? "none"}` });
    if (baseline && Number(baseline.evidence_revision.slice(4)) !== state.evidence_revision) findings.push({ severity: "error", code: "STATE_EVIDENCE_MISMATCH", message: `State evidence revision does not match ${baseline.evidence_revision}` });
    if (baseline) {
      for (const artifact of baseline.artifacts) if (state.id_registry[artifact.id] !== artifact.file) findings.push({ severity: "error", code: "ID_REGISTRY_MISSING", message: `${artifact.id} is not permanently registered at ${artifact.file}` });
      for (const executionId of baseline.executions) {
        const execution = executions.get(executionId);
        if (!execution) findings.push({ severity: "error", code: "BASELINE_EXECUTION_MISSING", message: `${baseline.id} references missing ${executionId}` });
        else if (execution.flow_id !== baseline.flow_id) findings.push({ severity: "error", code: "BASELINE_EXECUTION_FLOW_MISMATCH", message: `${executionId} belongs to ${execution.flow_id}, not ${baseline.flow_id}` });
      }
      if (baseline.flow_type === "evolution" || baseline.flow_type === "reconciliation") {
        const change = [...changes.values()].find((candidate) => candidate.flow_id === baseline.flow_id);
        if (!change || change.successor_baseline !== baseline.id || change.status === "active") findings.push({ severity: "error", code: "BASELINE_CHANGE_MISMATCH", message: `${baseline.id} is not bound to a baselined or closed change record` });
      }
    }
    const maxExecution = Math.max(0, ...[...executions].map(([id]) => numberOf(id)));
    const maxChange = Math.max(0, ...[...changes].map(([id]) => numberOf(id)));
    const flowIds = [baseline?.flow_id, activeFlow?.id, ...[...changes.values()].map((change) => change.flow_id)].filter((value): value is string => Boolean(value));
    const maxFlow = Math.max(0, ...flowIds.map(numberOf));
    if (state.next_execution <= maxExecution) findings.push({ severity: "error", code: "EXECUTION_COUNTER_REUSED", message: `next_execution must be greater than existing EXEC-${String(maxExecution).padStart(3, "0")}` });
    if (state.next_change <= maxChange) findings.push({ severity: "error", code: "CHANGE_COUNTER_REUSED", message: `next_change must be greater than existing CHG-${String(maxChange).padStart(3, "0")}` });
    if (state.next_flow <= maxFlow) findings.push({ severity: "error", code: "FLOW_COUNTER_REUSED", message: `next_flow must be greater than existing flow ${maxFlow}` });
    const maxRetrieval = Math.max(0, ...[...retrievalRecords.keys()].map(numberOf));
    const maxQuery = Math.max(0, ...[...queryRecords.keys()].map(numberOf));
    if ((state.next_retrieval ?? 1) <= maxRetrieval) findings.push({ severity: "error", code: "RETRIEVAL_COUNTER_REUSED", message: `next_retrieval must be greater than existing RET-${String(maxRetrieval).padStart(3, "0")}` });
    if ((state.next_query ?? 1) <= maxQuery) findings.push({ severity: "error", code: "RETRIEVAL_COUNTER_REUSED", message: `next_query must be greater than existing QRY-${String(maxQuery).padStart(3, "0")}` });
    if (activeFlow?.change_id) {
      const change = changes.get(activeFlow.change_id);
      if (!change || change.flow_id !== activeFlow.id || change.type !== activeFlow.type) findings.push({ severity: "error", code: "ACTIVE_CHANGE_MISMATCH", message: `${activeFlow.id} does not match ${activeFlow.change_id}` });
      else if (activeFlow.baseline_created ? change.status !== "baselined" || change.successor_baseline !== activeFlow.baseline_created : change.status !== "active") findings.push({ severity: "error", code: "ACTIVE_CHANGE_LIFECYCLE", message: `${change.id} lifecycle does not match ${activeFlow.id}` });
    }
    for (const change of changes.values()) if (change.status === "active" && activeFlow?.change_id !== change.id) findings.push({ severity: "error", code: "ORPHAN_ACTIVE_CHANGE", message: `${change.id} is active without its flow` });
    if (activeFlow?.baseline_created && (!baseline || baseline.id !== activeFlow.baseline_created || baseline.flow_id !== activeFlow.id)) findings.push({ severity: "error", code: "ACTIVE_BASELINE_MISMATCH", message: `${activeFlow.id} does not own ${activeFlow.baseline_created}` });
  } catch (error) {
    findings.push({ severity: "error", code: "STATE_INVALID", message: `Invalid internal state: ${String(error)}` });
  }
  return findings;
}
