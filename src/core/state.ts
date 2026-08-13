import { access, rm } from "node:fs/promises";
import type { ActiveFlow, ChangeRecord, CurrentState, FlowStage, FlowType } from "./types.js";
import { FLOW_STAGES, FLOW_TYPES, stageIndex } from "./types.js";
import { SdlcError } from "./errors.js";
import { formatId, readJson, sha256, stableJson, writeJsonAtomic } from "./utils.js";
import { assertSafeManagedPath, prepareSafeManagedPath, projectPaths } from "./paths.js";
import { isActiveFlow, isChangeRecord } from "./record-validation.js";
import { scanArtifacts } from "./artifacts.js";
import { withProjectLock } from "./project-lock.js";
import { implementationSnapshotHash } from "./implementation-snapshot.js";

async function snapshotHash(root: string): Promise<string> {
  const artifacts = await scanArtifacts(root);
  return sha256(stableJson(artifacts.map((artifact) => ({ id: artifact.id, file: artifact.file, hash: artifact.hash, status: artifact.status }))));
}

export async function pathExists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

export async function loadCurrentState(root: string): Promise<CurrentState> {
  const file = projectPaths(root).current;
  if (!(await pathExists(file))) throw new SdlcError("No AI SaaS SDLC documentation repository here (missing .ai-saas-sdlc/state/current.json). This engine manages a separate, dedicated documentation repository: run ai-saas-sdlc init inside an empty docs repository — never inside a code repository — or cd to the existing docs repository.");
  await assertSafeManagedPath(root, file);
  const candidate = await readJson<unknown>(file);
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) throw new SdlcError(`Invalid state schema: ${file}`);
  const state = candidate as CurrentState;
  const questionAges = state.question_first_baseline;
  const valid = Object.keys(state).every((key) => ["schema_version", "project_id", "active_baseline", "evidence_revision", "next_change", "next_flow", "next_execution", "id_registry", "question_first_baseline", "next_retrieval", "next_query"].includes(key))
    && state.schema_version === 1
    && typeof state.project_id === "string" && /^[a-z0-9][a-z0-9-]*$/.test(state.project_id)
    && (state.active_baseline === null || /^BL-[0-9]{3,}$/.test(state.active_baseline))
    && [state.evidence_revision, state.next_change, state.next_flow, state.next_execution].every(Number.isInteger)
    && state.evidence_revision >= 0 && state.next_change >= 1 && state.next_flow >= 1 && state.next_execution >= 1
    && (state.next_retrieval === undefined || (Number.isInteger(state.next_retrieval) && state.next_retrieval >= 1))
    && (state.next_query === undefined || (Number.isInteger(state.next_query) && state.next_query >= 1))
    && Boolean(state.id_registry) && typeof state.id_registry === "object" && !Array.isArray(state.id_registry)
    && Object.keys(state.id_registry).every((key) => /^[A-Z][A-Z0-9-]*$/.test(key))
    && Object.values(state.id_registry).every((value) => typeof value === "string")
    && (questionAges === undefined || (typeof questionAges === "object" && questionAges !== null && !Array.isArray(questionAges)
      && Object.keys(questionAges).every((key) => /^QST-[A-Z0-9-]+$/.test(key))
      && Object.values(questionAges).every((value) => typeof value === "string" && /^BL-[0-9]{3,}$/.test(value))));
  if (!valid) throw new SdlcError(`Invalid state schema: ${file}`);
  return state;
}

export async function saveCurrentState(root: string, state: CurrentState): Promise<void> {
  await prepareSafeManagedPath(root, projectPaths(root).current);
  await writeJsonAtomic(projectPaths(root).current, state);
}

export async function loadActiveFlow(root: string): Promise<ActiveFlow | null> {
  const file = projectPaths(root).activeFlow;
  if (!(await pathExists(file))) return null;
  await assertSafeManagedPath(root, file);
  const flow = await readJson<ActiveFlow>(file);
  if (!isActiveFlow(flow)) throw new SdlcError(`Invalid active flow schema: ${file}`);
  return flow;
}

async function startFlowUnlocked(root: string, type: string, input: string, targetStage?: FlowStage, intent?: string): Promise<ActiveFlow> {
  if (!FLOW_TYPES.includes(type as FlowType)) throw new SdlcError(`Unsupported flow type: ${type}`);
  if (intent !== undefined && intent !== "implementation") throw new SdlcError(`Unsupported flow intent: ${intent}. Expected implementation.`);
  if (intent === "implementation" && type !== "evolution") throw new SdlcError("An implementation intent rides Product Evolution; flow types remain exactly four.");
  if (await loadActiveFlow(root)) throw new SdlcError("An active flow already exists. Close it before starting another.");
  const state = await loadCurrentState(root);
  if (type === "genesis" && state.active_baseline) throw new SdlcError("Genesis is only valid before the first product baseline.");
  if (type !== "genesis" && !state.active_baseline) throw new SdlcError(`${type} requires an existing product baseline.`);
  const semantic = type === "evolution" || type === "reconciliation";
  const changeId = semantic ? formatId("CHG", state.next_change) : null;
  const flow: ActiveFlow = {
    schema_version: 1,
    id: formatId("FLOW", state.next_flow),
    type: type as FlowType,
    input,
    started_at: new Date().toISOString(),
    base_baseline: state.active_baseline,
    change_id: changeId,
    stop_blocked_once: false,
    start_snapshot_hash: await snapshotHash(root),
    implementation_snapshot_hash: await implementationSnapshotHash(root),
    ...(intent === "implementation" ? { intent } : {}),
    ...(targetStage ? { target_stage: targetStage } : {})
  };
  state.next_flow += 1;
  if (semantic) state.next_change += 1;
  await saveCurrentState(root, state);
  await prepareSafeManagedPath(root, projectPaths(root).activeFlow);
  await writeJsonAtomic(projectPaths(root).activeFlow, flow);
  if (changeId) {
    const changeFile = `${projectPaths(root).changes}/${changeId}.json`;
    await prepareSafeManagedPath(root, changeFile);
    await writeJsonAtomic(changeFile, {
      schema_version: 1,
      id: changeId,
      flow_id: flow.id,
      type,
      input,
      status: "active",
      base_baseline: state.active_baseline,
      started_at: flow.started_at
    });
  }
  return flow;
}

/**
 * Record how far an open flow has come, and optionally where this turn should
 * stop. Checkpoints only move forward: re-reaching an earlier one is a no-op
 * rather than an error, because continuing a flow legitimately revisits work.
 */
export async function checkpointFlow(root: string, reached: string, target?: string): Promise<ActiveFlow> {
  return withProjectLock(root, async () => {
    if (!FLOW_STAGES.includes(reached as FlowStage)) throw new SdlcError(`Unsupported flow stage: ${reached}. Expected ${FLOW_STAGES.join("|")}.`);
    if (target !== undefined && !FLOW_STAGES.includes(target as FlowStage)) throw new SdlcError(`Unsupported flow stage: ${target}. Expected ${FLOW_STAGES.join("|")}.`);
    const flow = await loadActiveFlow(root);
    if (!flow) throw new SdlcError("No active flow exists. A checkpoint only describes a flow that is open.");
    const furthest = flow.reached_stage && stageIndex(flow.reached_stage) > stageIndex(reached) ? flow.reached_stage : (reached as FlowStage);
    // An explicit --until always wins. Absent one, a continued flow that reaches
    // past its recorded stop raises the target with it, so the record cannot go
    // on claiming the turn was asked to stop at a checkpoint it has already left.
    // An absent target (run-to-baseline) is never materialized: leaving it unset
    // keeps the run-to-baseline meaning intact.
    const raisedTarget = target === undefined && flow.target_stage && stageIndex(furthest) > stageIndex(flow.target_stage)
      ? furthest
      : undefined;
    const nextTarget = target !== undefined ? (target as FlowStage) : raisedTarget;
    const updated: ActiveFlow = {
      ...flow,
      reached_stage: furthest,
      ...(nextTarget !== undefined ? { target_stage: nextTarget } : {})
    };
    await prepareSafeManagedPath(root, projectPaths(root).activeFlow);
    await writeJsonAtomic(projectPaths(root).activeFlow, updated);
    return updated;
  });
}

export async function startFlow(root: string, type: string, input: string, targetStage?: FlowStage, intent?: string): Promise<ActiveFlow> {
  return withProjectLock(root, () => startFlowUnlocked(root, type, input, targetStage, intent));
}

async function closeFlowUnlocked(root: string): Promise<ActiveFlow> {
  const flow = await loadActiveFlow(root);
  if (!flow) throw new SdlcError("No active flow exists.");
  const snapshot = await import("./project.js").then(({ projectSnapshot }) => projectSnapshot(root));
  const currentImplementation = await implementationSnapshotHash(root);
  const cancelled = !flow.baseline_created
    && await snapshotHash(root) === flow.start_snapshot_hash
    && currentImplementation === flow.implementation_snapshot_hash;
  if (!flow.baseline_created && !cancelled) throw new SdlcError(`Flow ${flow.id} has unbaselined changes and cannot close: ${snapshot.impact.direct.join(", ") || "snapshot changed"}`);
  if (flow.baseline_created && snapshot.impact.direct.length > 0) throw new SdlcError(`Flow ${flow.id} has changes made after baseline ${flow.baseline_created}: ${snapshot.impact.direct.join(", ")}`);
  if (flow.baseline_created && currentImplementation !== flow.baseline_implementation_snapshot_hash) throw new SdlcError(`Flow ${flow.id} has implementation changes made after baseline ${flow.baseline_created}.`);
  if (flow.change_id) {
    const changeFile = `${projectPaths(root).changes}/${flow.change_id}.json`;
    await assertSafeManagedPath(root, changeFile);
    const change = await readJson<ChangeRecord>(changeFile);
    if (!isChangeRecord(change)) throw new SdlcError(`Invalid change record schema: ${changeFile}`);
    await prepareSafeManagedPath(root, changeFile);
    await writeJsonAtomic(changeFile, cancelled
      ? { ...change, status: "cancelled", closed_at: new Date().toISOString() }
      : { ...change, status: "closed", closed_at: new Date().toISOString() });
  }
  await prepareSafeManagedPath(root, projectPaths(root).activeFlow);
  await rm(projectPaths(root).activeFlow);
  return flow;
}

export async function closeFlow(root: string): Promise<ActiveFlow> {
  return withProjectLock(root, () => closeFlowUnlocked(root));
}
