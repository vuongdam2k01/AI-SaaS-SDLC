import type { Artifact, ArtifactGraph, BaselineManifest } from "./types.js";
import { reverseClosure, rippleClosure } from "./graph.js";
import { buildGraph } from "./graph.js";

export interface ImpactReport {
  direct: string[];
  affected: string[];
  stale: string[];
  /**
   * The artifacts this change put in question: reached through consequence
   * rather than through reading. Always a subset of `stale`.
   *
   * The difference is between a prerequisite and a dependent. A new feature
   * cites the invariants, the error catalog and the test policy, and the
   * reading closure reaches all of them; none is at risk, because nothing they
   * say has changed. Editing the entity three features already write, or
   * becoming the fourth writer of it, puts those features in question. Only the
   * second kind is a decision somebody owes an answer to, and only this set is
   * what IMPACT_UNCLASSIFIED asks about.
   */
  ripple: string[];
}

function relationships(value: Pick<Artifact, "depends_on" | "decisions" | "supersedes" | "writes_to">): string {
  return JSON.stringify({
    depends_on: [...value.depends_on].sort(), decisions: [...value.decisions].sort(),
    supersedes: value.supersedes, writes_to: [...value.writes_to].sort()
  });
}

export function calculateImpact(
  artifacts: Artifact[],
  graph: ArtifactGraph,
  baseline: BaselineManifest | null
): ImpactReport {
  const previous = new Map((baseline?.artifacts ?? []).map((item) => [item.id, item]));
  const current = new Map(artifacts.map((item) => [item.id, item]));
  const direct = new Set<string>();
  for (const artifact of artifacts) {
    const old = previous.get(artifact.id);
    if (!old || old.hash !== artifact.hash || old.status !== artifact.status || relationships(old) !== relationships(artifact)) direct.add(artifact.id);
  }
  for (const old of previous.values()) if (!current.has(old.id)) direct.add(old.id);
  const priorArtifacts = (baseline?.artifacts ?? []).map((item) => ({
    ...item, title: item.id, body: "", metadata_issues: []
  } as Artifact));
  const priorGraph = buildGraph(priorArtifacts);
  const nodeMap = new Map(priorGraph.nodes.map((node) => [node.id, node]));
  for (const node of graph.nodes) nodeMap.set(node.id, node);
  const edgeMap = new Map([...priorGraph.edges, ...graph.edges].map((edge) => [`${edge.from}\u0000${edge.to}\u0000${edge.relation}`, edge]));
  const unionGraph: ArtifactGraph = { schema_version: 1, nodes: [...nodeMap.values()], edges: [...edgeMap.values()] };
  const affected = reverseClosure(unionGraph, direct);
  const ripple = rippleClosure(unionGraph, direct).filter((id) => !direct.has(id));
  return { direct: [...direct].sort(), affected, stale: affected.filter((id) => !direct.has(id)), ripple };
}
