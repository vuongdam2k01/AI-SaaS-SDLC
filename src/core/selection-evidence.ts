import type { ActiveFlow, Artifact, ArtifactGraph, BaselineManifest, ExecutionRecord, ValidationFinding } from "./types.js";
import { calculateImpact } from "./impact.js";
import { selectTests } from "./test-selection.js";
import { loadExecutionRecords } from "./execution-records.js";
import { loadActiveFlow } from "./state.js";
import { loadBaseline } from "./project.js";

export interface SelectionEvidenceEntry {
  /** A specification the affected closure selected for this flow. */
  spec: string;
  file: string;
  flowId: string;
}

/**
 * Specifications the impact closure selected that no ingested report of this
 * flow attributes a case to.
 *
 * Selection has always been derived and executions have always been recorded,
 * but nothing compared them: a flow could select six specifications, run one
 * command, and close with a green level verdict that said nothing about the
 * other five. The comparison is only meaningful once the flow has executed
 * something — before that the baseline's own not-run gate owns the gap, and
 * warning about it would be noise on every flow that has not reached
 * verification yet.
 *
 * The claim is deliberately narrow. A command with no declared report attributes
 * no cases, and an ambiguous symbol join records a null spec_id, so an entry
 * here means "nothing joins this specification", never "this specification did
 * not run". The message has to say so.
 */
export function selectionEvidenceEntries(
  artifacts: Artifact[],
  graph: ArtifactGraph,
  baseline: BaselineManifest | null,
  flow: ActiveFlow | null,
  records: ExecutionRecord[]
): SelectionEvidenceEntry[] {
  if (!flow || (flow.type !== "evolution" && flow.type !== "reconciliation")) return [];
  const flowRecords = records.filter((record) => record.flow_id === flow.id);
  if (flowRecords.length === 0) return [];
  const impact = calculateImpact(artifacts, graph, baseline);
  const selection = selectTests(artifacts, graph, impact.affected);
  const selected = [...new Set([...selection.selected.unit, ...selection.selected.integration, ...selection.selected.system])].sort();
  const attributed = new Set(flowRecords.flatMap((record) => (record.cases ?? []).map((item) => item.spec_id).filter((id): id is string => Boolean(id))));
  const byId = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
  return selected
    .filter((spec) => !attributed.has(spec))
    .flatMap((spec) => {
      const artifact = byId.get(spec);
      return artifact ? [{ spec, file: artifact.file, flowId: flow.id }] : [];
    });
}

/**
 * Warning, never error. Whether a selected specification had to be exercised in
 * this flow is a judgement about scope, and an unwired or partially reported
 * repository would fail every baseline if this were hard. The finding is the
 * record that selection outran attributable execution.
 */
export async function selectionEvidenceFindings(root: string, artifacts: Artifact[], graph: ArtifactGraph): Promise<ValidationFinding[]> {
  let entries: SelectionEvidenceEntry[] = [];
  try {
    const baseline = await loadBaseline(root).catch(() => null);
    const flow = await loadActiveFlow(root).catch(() => null);
    entries = selectionEvidenceEntries(artifacts, graph, baseline, flow, await loadExecutionRecords(root));
  } catch {
    return [];
  }
  return entries.map((entry) => ({
    severity: "warning" as const,
    code: "SPEC_EXECUTION_UNATTRIBUTED",
    message: `${entry.spec} was selected by ${entry.flowId}'s affected closure, but no ingested report of this flow attributes a case to it — a command that declares no report attributes nothing, and an ambiguous symbol join records no specification; declare a report on the covering command, repair the Implementation mapping rows so its cases join, or let this warning stand as the record that selection outran attributable execution.`,
    file: entry.file
  }));
}
