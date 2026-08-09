import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import type { Artifact, ArtifactGraph, BaselineManifest } from "./types.js";
import type { ImpactReport } from "./impact.js";
import { topologicalOrder } from "./graph.js";
import { assertSafeManagedPath, isWithin, prepareSafeManagedPath, projectPaths } from "./paths.js";
import { pathExists } from "./state.js";
import { normalizeText, stableJson, uniqueSorted } from "./utils.js";
import { acceptanceCoverage, evidenceClaimCoverage } from "./coverage-derivation.js";

export interface ProjectionSet { [relative: string]: string }

export function changeImpactProjection(changeId: string, impact: ImpactReport): string {
  return `# Change Impact: ${changeId}\n\n## Direct\n\n${impact.direct.map((id) => `- \`${id}\``).join("\n") || "None."}\n\n## Affected closure\n\n${impact.affected.map((id) => `- \`${id}\``).join("\n") || "None."}\n`;
}

function table(headers: string[], rows: string[][]): string {
  const head = `| ${headers.join(" | ")} |`;
  const line = `| ${headers.map(() => "---").join(" | ")} |`;
  return `${head}\n${line}\n${rows.map((row) => `| ${row.join(" | ")} |`).join("\n") || `| ${headers.map(() => "—").join(" | ")} |`}\n`;
}

export function buildProjections(
  artifacts: Artifact[],
  graph: ArtifactGraph,
  impact: ImpactReport,
  baseline: BaselineManifest | null,
  activeChange: string | null
): ProjectionSet {
  const projections: ProjectionSet = {};
  projections["artifact-graph.json"] = stableJson(graph);
  projections["artifact-index.md"] = `# Artifact Index\n\n${table(
    ["ID", "Type", "Status", "Source"],
    graph.nodes.map((node) => [`\`${node.id}\``, node.type, node.status, `\`${node.file}\``])
  )}`;
  projections["traceability.md"] = `# Traceability\n\nRelations are declared by the downstream artifact. Reverse views are generated.\n\n${table(
    ["Downstream", "Relation", "Upstream"],
    graph.edges.map((edge) => [`\`${edge.from}\``, edge.relation, `\`${edge.to}\``])
  )}`;

  const evidence = artifacts.find((item) => item.artifact_type === "evidence_ledger");
  const evidenceIds = evidence?.body.match(/^## EVD-[A-Z0-9-]+/gm)?.map((value) => value.slice(3)) ?? [];
  const discoveryTypes = ["idea_definition", "market_landscape", "customer_and_problem", "competitive_and_commercial", "feasibility_and_risk", "opportunity_definition"];
  projections["research-coverage.md"] = `# Research Coverage\n\n- Evidence entries: **${evidenceIds.length}**\n- Research mode: **public-web-only**\n\n${table(
    ["Area", "Artifact", "Status"],
    discoveryTypes.map((type) => {
      const artifact = artifacts.find((item) => item.artifact_type === type);
      return [type, artifact ? `\`${artifact.id}\`` : "missing", artifact?.status ?? "missing"];
    })
  )}`;
  projections["evidence-claim-coverage.md"] = evidenceClaimCoverage(artifacts);
  projections["acceptance-coverage.md"] = acceptanceCoverage(artifacts);

  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const featureRows = graph.nodes.filter((node) => node.type === "feature").map((feature) => {
    const consumers = graph.edges.filter((edge) => edge.to === feature.id).map((edge) => nodesById.get(edge.from)).filter(Boolean);
    const types = uniqueSorted(consumers.map((node) => node?.type ?? ""));
    return [`\`${feature.id}\``, feature.status, types.join(", ") || "none"];
  });
  projections["feature-coverage.md"] = `# Feature Coverage\n\n${table(["Feature", "Status", "Direct downstream types"], featureRows)}`;

  const writers = new Map<string, string[]>();
  for (const node of graph.nodes) for (const target of node.writes_to) writers.set(target, [...(writers.get(target) ?? []), node.id]);
  projections["interaction-map.md"] = `# Interaction Map\n\n${table(
    ["Shared target", "Writers", "Conflict review"],
    [...writers.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([target, ids]) => [target, uniqueSorted(ids).map((id) => `\`${id}\``).join(", "), ids.length > 1 ? "required" : "single writer"])
  )}`;
  projections["implementation-map.md"] = `# Implementation Map\n\n${table(
    ["Artifact", "Implementation paths"],
    graph.nodes.filter((node) => node.implementation.length > 0).map((node) => [`\`${node.id}\``, node.implementation.map((value) => `\`${value}\``).join(", ")])
  )}`;
  const order = topologicalOrder(graph);
  projections["implementation-order.md"] = `# Implementation Order\n\n${order.order.map((id, index) => `${index + 1}. \`${id}\``).join("\n") || "No artifacts."}\n`;
  projections["stale-artifacts.md"] = `# Stale Artifacts\n\nBaseline: **${baseline?.id ?? "none"}**\n\n${impact.stale.map((id) => `- \`${id}\``).join("\n") || "No indirectly affected artifacts."}\n`;
  projections["issue-index.md"] = `# Issue Index\n\n${table(
    ["ID", "Status", "Title"],
    artifacts.filter((item) => item.artifact_type === "issue").map((item) => [`\`${item.id}\``, item.status, item.title])
  )}`;
  projections["decision-index.md"] = `# Decision Index\n\n${table(
    ["ID", "Decision status", "Artifact status", "Title", "Supersedes"],
    artifacts.filter((item) => item.artifact_type === "architectural_decision").map((item) => [`\`${item.id}\``, item.adr_status ?? "", item.status, item.title, item.supersedes ? `\`${item.supersedes}\`` : "—"])
  )}`;
  for (const adr of artifacts.filter((item) => item.artifact_type === "architectural_decision")) {
    const affected = graph.edges.filter((edge) => edge.relation === "decision" && edge.to === adr.id).map((edge) => edge.from);
    const successors = graph.edges.filter((edge) => edge.relation === "supersedes" && edge.to === adr.id).map((edge) => edge.from);
    projections[`decision-impact/${adr.id}.md`] = `# Decision Impact: ${adr.id}\n\n## Current dependents\n\n${affected.map((id) => `- \`${id}\``).join("\n") || "No artifact currently declares this decision."}\n\n## Successors\n\n${successors.map((id) => `- \`${id}\``).join("\n") || "No successor."}\n`;
  }
  if (activeChange) {
    projections[`change-impact/${activeChange}.md`] = changeImpactProjection(activeChange, impact);
  }
  return projections;
}

export async function applyProjections(root: string, projections: ProjectionSet, check: boolean): Promise<string[]> {
  const base = projectPaths(root).generated;
  const drift: string[] = [];
  const protect = check ? assertSafeManagedPath : prepareSafeManagedPath;
  await protect(root, path.join(base, ".managed-probe"));
  for (const [relative, expectedRaw] of Object.entries(projections).sort(([a], [b]) => a.localeCompare(b))) {
    const file = path.join(base, relative);
    if (!isWithin(base, file)) throw new Error(`Projection path escapes generated directory: ${relative}`);
    await protect(root, file);
    const expected = normalizeText(expectedRaw);
    let actual = "";
    if (await pathExists(file)) actual = normalizeText(await readFile(file, "utf8"));
    if (actual !== expected) {
      drift.push(relative);
      if (!check) {
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, expected, "utf8");
      }
    }
  }
  if (await pathExists(base)) {
    const expectedFiles = new Set(Object.keys(projections).map((value) => value.replaceAll("\\", "/")));
    const existing = await fg("**/*", { cwd: base, onlyFiles: true, dot: true });
    for (const relative of existing.sort()) {
      if (relative.endsWith(".gitkeep") || relative === "baseline-manifest.json" || expectedFiles.has(relative.replaceAll("\\", "/"))) continue;
      drift.push(`unexpected:${relative.replaceAll("\\", "/")}`);
      if (!check) {
        const file = path.join(base, relative);
        if (!isWithin(base, file)) throw new Error(`Unexpected projection escapes generated directory: ${relative}`);
        await prepareSafeManagedPath(root, file);
        await rm(file);
      }
    }
  }
  return drift.sort();
}
