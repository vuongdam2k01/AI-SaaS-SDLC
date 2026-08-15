import type { Artifact, ArtifactGraph } from "./types.js";
import { uniqueSorted } from "./utils.js";
import { CONTRACT_ARTIFACT_TYPES } from "./contract-authorities.js";

export function buildGraph(artifacts: Artifact[]): ArtifactGraph {
  const nodes = artifacts
    .filter((artifact) => artifact.id)
    .map((artifact) => ({
      id: artifact.id,
      type: artifact.artifact_type,
      status: artifact.status,
      file: artifact.file,
      depends_on: uniqueSorted(artifact.depends_on),
      decisions: uniqueSorted(artifact.decisions),
      supersedes: artifact.supersedes,
      writes_to: uniqueSorted(artifact.writes_to),
      implementation: uniqueSorted(artifact.implementation)
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const edges = nodes.flatMap((node) => [
    ...node.depends_on.map((target) => ({ from: node.id, to: target, relation: "depends_on" as const })),
    ...node.decisions.map((target) => ({ from: node.id, to: target, relation: "decision" as const })),
    ...node.writes_to.map((target) => ({ from: node.id, to: target, relation: "writes_to" as const })),
    ...(node.supersedes ? [{ from: node.id, to: node.supersedes, relation: "supersedes" as const }] : [])
  ]).sort((a, b) => `${a.from}:${a.to}:${a.relation}`.localeCompare(`${b.from}:${b.to}:${b.relation}`));
  return { schema_version: 1, nodes, edges };
}

export function reverseClosure(graph: ArtifactGraph, seeds: Iterable<string>): string[] {
  return walkClosure(graph, seeds, true);
}

/**
 * The closure restricted to consequence.
 *
 * `reverseClosure` also lets a fixed-contract artifact converge forward into
 * the documents it depends on, which is right for "what should I read": the
 * interface file and the architecture it was written under belong in one
 * reading. It is wrong for "what did this change endanger", because the walk
 * then continues *down* from that foundation into everything else citing it —
 * so adding a single feature reports the invariants, the error catalog and
 * every other consumer of them as reached, and the signal drowns.
 *
 * Dropping that one hop leaves the two convergences that carry real
 * consequence: a shared target somebody new began writing, and a supersession.
 * Both mean an old contract has to be re-argued. A prerequisite being cited
 * does not.
 */
export function rippleClosure(graph: ArtifactGraph, seeds: Iterable<string>): string[] {
  return walkClosure(graph, seeds, false);
}

function walkClosure(graph: ArtifactGraph, seeds: Iterable<string>, contractPrerequisites: boolean): string[] {
  const reverse = new Map<string, Set<string>>();
  const convergenceForward = new Map<string, Set<string>>();
  const typeById = new Map(graph.nodes.map((node) => [node.id, node.type]));
  const contractNodeCounts = new Map<string, number>();
  for (const node of graph.nodes) {
    if (CONTRACT_ARTIFACT_TYPES.has(node.type)) contractNodeCounts.set(node.type, (contractNodeCounts.get(node.type) ?? 0) + 1);
  }
  // A depends_on edge into a contract family that holds sibling files is a
  // declared ownership edge: the instance converges into its own authority
  // file and, through it, into that file's other owners — never into the
  // whole surface. With a single file per family the auto-derived contract
  // edges already carry the convergence, so the gate keeps single-file
  // repositories on the exact pre-sibling walk.
  const declaredAuthorityTarget = (id: string) => {
    const type = typeById.get(id);
    return type !== undefined && CONTRACT_ARTIFACT_TYPES.has(type) && (contractNodeCounts.get(type) ?? 0) >= 2;
  };
  for (const edge of graph.edges) {
    const values = reverse.get(edge.to) ?? new Set<string>();
    values.add(edge.from);
    reverse.set(edge.to, values);
    if (edge.relation === "writes_to" || edge.relation === "supersedes"
      || (contractPrerequisites && edge.relation === "depends_on" && CONTRACT_ARTIFACT_TYPES.has(typeById.get(edge.from) ?? ""))
      || (edge.relation === "depends_on" && declaredAuthorityTarget(edge.to))) {
      const targets = convergenceForward.get(edge.from) ?? new Set<string>();
      targets.add(edge.to);
      convergenceForward.set(edge.from, targets);
    }
  }
  const seen = new Set(seeds);
  const queue = [...seen];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    for (const dependent of reverse.get(current) ?? []) {
      if (!seen.has(dependent)) {
        seen.add(dependent);
        queue.push(dependent);
      }
    }
    for (const convergence of convergenceForward.get(current) ?? []) {
      if (!seen.has(convergence)) {
        seen.add(convergence);
        queue.push(convergence);
      }
    }
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}

export function topologicalOrder(graph: ArtifactGraph): { order: string[]; cycles: string[] } {
  const nodes = new Set(graph.nodes.map((node) => node.id));
  const indegree = new Map([...nodes].map((id) => [id, 0]));
  const outgoing = new Map<string, Set<string>>();
  const counted = new Set<string>();
  for (const edge of graph.edges.filter((item) => (item.relation === "depends_on" || item.relation === "writes_to") && nodes.has(item.to))) {
    const pair = `${edge.from}\u0000${edge.to}`;
    if (counted.has(pair)) continue;
    counted.add(pair);
    indegree.set(edge.from, (indegree.get(edge.from) ?? 0) + 1);
    const values = outgoing.get(edge.to) ?? new Set<string>();
    values.add(edge.from);
    outgoing.set(edge.to, values);
  }
  const ready = [...nodes].filter((id) => (indegree.get(id) ?? 0) === 0).sort();
  const order: string[] = [];
  while (ready.length > 0) {
    const id = ready.shift();
    if (!id) continue;
    order.push(id);
    for (const dependent of outgoing.get(id) ?? []) {
      const next = (indegree.get(dependent) ?? 1) - 1;
      indegree.set(dependent, next);
      if (next === 0) {
        ready.push(dependent);
        ready.sort();
      }
    }
  }
  return { order, cycles: [...nodes].filter((id) => !order.includes(id)).sort() };
}
