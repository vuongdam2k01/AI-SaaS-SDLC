import path from "node:path";
import { CLASSIFICATION_LABELS } from "./types.js";
import type { Artifact, ArtifactGraph, BaselineManifest, ChangeRecord, ClassificationLabel, ValidationFinding } from "./types.js";
import { buildGraph } from "./graph.js";
import { calculateImpact } from "./impact.js";
import { loadChangeRecords } from "./change-records.js";
import { scanArtifacts } from "./artifacts.js";
import { loadActiveFlow } from "./state.js";
import { loadBaseline, loadChange, refreshProject } from "./project.js";
import { assertSafeManagedPath, prepareSafeManagedPath, projectPaths } from "./paths.js";
import { writeJsonAtomic } from "./utils.js";
import { withProjectLock } from "./project-lock.js";
import { SdlcError } from "./errors.js";

export interface UnclassifiedImpactEntry {
  /** The artifact reached by the closure and carrying no recorded decision. */
  id: string;
  file: string;
  changeId: string;
  /** `open` while the change can still act; `standing` once it has baselined. */
  phase: "open" | "standing";
  /** The baseline the change produced, present in the standing phase. */
  baselineId?: string;
}

function changeNumber(id: string): number {
  return Number(id.slice(4));
}

/**
 * Every classification recorded by this change or any later one. A ripple debt
 * an earlier change left is legitimately answered by a later change that
 * inspected the same artifact, so the derivation looks forward from the owning
 * change rather than at it alone.
 */
function classifiedFrom(changes: ChangeRecord[], owner: string): Set<string> {
  const floor = changeNumber(owner);
  const classified = new Set<string>();
  for (const change of changes) {
    if (!Number.isFinite(changeNumber(change.id)) || changeNumber(change.id) < floor) continue;
    for (const id of Object.keys(change.classification ?? {})) classified.add(id);
  }
  return classified;
}

/**
 * Artifacts a semantic change reached through the reverse closure and never
 * decided about.
 *
 * Two phases, one condition. While the change is open the closure is live, and
 * the remainder is what the author still has to rule in or out. Once the change
 * has baselined the closure is frozen into the record, and the remainder
 * survives as debt for exactly as long as the artifact stays untouched: editing
 * it later is itself the answer, and so is a later change classifying it. A
 * change record without the `classification` key predates the ledger and
 * observes nothing, which is what keeps an upgraded repository quiet about
 * history it was never asked to record.
 */
export function unclassifiedImpactEntries(
  artifacts: Artifact[],
  graph: ArtifactGraph,
  baseline: BaselineManifest | null,
  activeChange: ChangeRecord | null,
  changes: ChangeRecord[]
): UnclassifiedImpactEntry[] {
  const byId = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
  const entry = (id: string, changeId: string, phase: "open" | "standing", baselineId?: string): UnclassifiedImpactEntry | null => {
    const artifact = byId.get(id);
    if (!artifact) return null;
    return { id, file: artifact.file, changeId, phase, ...(baselineId ? { baselineId } : {}) };
  };
  if (activeChange && activeChange.status === "active") {
    const impact = calculateImpact(artifacts, graph, baseline);
    const classified = classifiedFrom(changes, activeChange.id);
    return impact.ripple
      .filter((id) => !classified.has(id))
      .map((id) => entry(id, activeChange.id, "open"))
      .filter((item): item is UnclassifiedImpactEntry => item !== null);
  }
  if (!baseline) return [];
  const owner = changes.find((change) => change.successor_baseline === baseline.id
    && (change.status === "baselined" || change.status === "closed")
    && change.classification !== undefined
    && change.impact !== undefined);
  if (!owner?.impact) return [];
  const classified = classifiedFrom(changes, owner.id);
  const baselineHashes = new Map(baseline.artifacts.map((item) => [item.id, item.hash]));
  // A record stored before the ripple set was derived carries no `ripple` key
  // and is asked nothing, exactly like one stored before the ledger existed.
  return (owner.impact.ripple ?? [])
    .filter((id) => !classified.has(id))
    // Untouched since the baseline that recorded the reach. An artifact whose
    // content has moved has been answered by whatever moved it; the debt was
    // about a document nobody went back to.
    .filter((id) => byId.get(id)?.hash === baselineHashes.get(id))
    .map((id) => entry(id, owner.id, "standing", baseline.id))
    .filter((item): item is UnclassifiedImpactEntry => item !== null);
}

/**
 * Warning, never error. Which decision an affected artifact deserves is a
 * judgement — the engine proves the artifact was reached, not what should
 * happen to it — and a baseline must not fail on a judgement. What the engine
 * can insist on is that the judgement was made and written down somewhere a
 * later reader can find it.
 */
export async function impactClassificationFindings(root: string, artifacts: Artifact[], graph: ArtifactGraph): Promise<ValidationFinding[]> {
  let entries: UnclassifiedImpactEntry[] = [];
  try {
    const baseline = await loadBaseline(root).catch(() => null);
    const flow = await loadActiveFlow(root).catch(() => null);
    const changes = await loadChangeRecords(root);
    const activeChange = flow?.change_id ? changes.find((change) => change.id === flow.change_id) ?? null : null;
    entries = unclassifiedImpactEntries(artifacts, graph, baseline, activeChange, changes);
  } catch {
    return [];
  }
  return entries.map((item) => ({
    severity: "warning" as const,
    code: "IMPACT_UNCLASSIFIED",
    message: item.phase === "open"
      ? `${item.id} is reached by ${item.changeId}'s affected closure but carries no recorded ripple decision; record one with \`impact classify --id ${item.id} --as ${CLASSIFICATION_LABELS.join("|")}\`, or edit the artifact in this flow — a direct change is the modify decision and needs no classification.`
      : `${item.id} was reached by ${item.changeId}'s closure into ${item.baselineId}, was never classified, and its content has not moved since; classify it from a later change with \`impact classify\`, edit it through a flow that owns the consequence, or let this warning stand as the durable record of ripple debt nobody serviced.`,
    file: item.file
  }));
}

/**
 * Record one ripple decision on the active change.
 *
 * Classification is engine-owned for the same reason every record under
 * `.ai-saas-sdlc/` is: the ledger is evidence about what a change decided, and
 * evidence an agent can hand-write is not evidence. The verb is legal while the
 * change is open and while it has baselined but not closed — a decision made
 * after the successor baseline still describes that change's closure.
 */
export async function classifyImpact(root: string, id: string, label: string, reason?: string): Promise<ChangeRecord> {
  return classifyImpacts(root, [id], label, reason);
}

// A ripple set is sized by the change, not by the author's patience: servicing
// one of a few hundred per process spawn turned classification into a long
// serial loop, and a loop that dies mid-call is what leaves a lock behind. One
// invocation now takes the whole batch under a single lock and one refresh.
export async function classifyImpacts(root: string, ids: string[], label: string, reason?: string): Promise<ChangeRecord> {
  if (ids.length === 0) throw new SdlcError("Classification needs at least one artifact ID.");
  return withProjectLock(root, async () => {
    if (!CLASSIFICATION_LABELS.includes(label as ClassificationLabel)) {
      throw new SdlcError(`Unsupported classification: ${label}. Expected ${CLASSIFICATION_LABELS.join("|")}.`);
    }
    if (label === "not-affected" && !reason?.trim()) {
      throw new SdlcError("A not-affected classification requires --reason: ruling a reached artifact out is only a decision when the concrete ground for it is recorded.");
    }
    const flow = await loadActiveFlow(root);
    if (!flow?.change_id) throw new SdlcError("Classification records a decision on a semantic change; open an evolution or reconciliation flow first.");
    const change = await loadChange(root, flow.change_id);
    if (!change) throw new SdlcError(`Change record ${flow.change_id} not found.`);
    if (change.status !== "active" && change.status !== "baselined") throw new SdlcError(`${change.id} is ${change.status}; a closed change cannot take new classifications.`);
    const artifacts = await scanArtifacts(root);
    const scope = change.status === "active"
      ? calculateImpact(artifacts, buildGraph(artifacts), await loadBaseline(root))
      : change.impact ?? { direct: [], affected: [], stale: [], ripple: [] };
    // Every ID is checked before any is written: a batch that failed halfway
    // would record a decision the invocation did not finish making.
    for (const id of ids) {
      if (scope.direct.includes(id)) {
        throw new SdlcError(`${id} is a direct change of ${change.id} and counts as modify by definition; classification records decisions about artifacts the closure reached but the change did not edit.`);
      }
      if (!(scope.ripple ?? []).includes(id)) {
        throw new SdlcError(`${id} is not in ${change.id}'s ripple set — nothing this change revised reaches it; run \`impact --json\` to see what this change put in question.`);
      }
    }
    const entry = { label: label as ClassificationLabel, ...(reason?.trim() ? { reason: reason.trim() } : {}) };
    const updated: ChangeRecord = {
      ...change,
      classification: { ...(change.classification ?? {}), ...Object.fromEntries(ids.map((id) => [id, entry])) }
    };
    const file = path.join(projectPaths(root).changes, `${change.id}.json`);
    await assertSafeManagedPath(root, file);
    await prepareSafeManagedPath(root, file);
    await writeJsonAtomic(file, updated);
    return updated;
  }).then(async (updated) => {
    // The change-impact projection carries the ledger, so a classification that
    // did not refresh would leave the repository one GENERATED_DRIFT behind.
    await refreshProject(root, false);
    return updated;
  });
}
