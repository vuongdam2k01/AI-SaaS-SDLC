import type { Artifact, ArtifactGraph } from "./types.js";
import { uniqueSorted } from "./utils.js";

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
  const reverse = new Map<string, Set<string>>();
  const convergenceForward = new Map<string, Set<string>>();
  const contractTypes = new Set(["openapi_contract", "physical_schema", "screen_transitions"]);
  const typeById = new Map(graph.nodes.map((node) => [node.id, node.type]));
  for (const edge of graph.edges) {
    const values = reverse.get(edge.to) ?? new Set<string>();
    values.add(edge.from);
    reverse.set(edge.to, values);
    if (edge.relation === "writes_to" || edge.relation === "supersedes" || (edge.relation === "depends_on" && contractTypes.has(typeById.get(edge.from) ?? ""))) {
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
