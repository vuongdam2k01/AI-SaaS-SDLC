import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import type { Artifact, ArtifactGraph, BaselineManifest, ExecutionRecord, ProjectConfig, QueryRecord, RetrievalRecord } from "./types.js";
import { isLiveStatus } from "./types.js";
import type { ImpactReport } from "./impact.js";
import { topologicalOrder } from "./graph.js";
import { assertSafeManagedPath, isWithin, prepareSafeManagedPath, projectPaths } from "./paths.js";
import { pathExists } from "./state.js";
import { normalizeText, stableJson, uniqueSorted } from "./utils.js";
import { acceptanceCoverage, evidenceClaimCoverage, ruleCoverage } from "./coverage-derivation.js";
import { declaredPlatformIds, livePlatformTargets, platformContradiction } from "./platform-evidence.js";
import { latestExecution, matchesDefinitionEvidence } from "./execution-selection.js";

export interface ProjectionSet { [relative: string]: string }

export function changeImpactProjection(changeId: string, impact: ImpactReport): string {
  return `# Change Impact: ${changeId}\n\n## Direct\n\n${impact.direct.map((id) => `- \`${id}\``).join("\n") || "None."}\n\n## Affected closure\n\n${impact.affected.map((id) => `- \`${id}\``).join("\n") || "None."}\n`;
}

function table(headers: string[], rows: string[][]): string {
  const head = `| ${headers.join(" | ")} |`;
  const line = `| ${headers.map(() => "---").join(" | ")} |`;
  return `${head}\n${line}\n${rows.map((row) => `| ${row.join(" | ")} |`).join("\n") || `| ${headers.map(() => "—").join(" | ")} |`}\n`;
}

// The declaration/observation join for one platform target. Every state is
// derived through the same predicates the validate warnings use, so this view
// can never disagree with a finding: `missing` mirrors PLATFORM_EVIDENCE_MISSING
// and `contradicted` calls the exact function behind PLATFORM_EVIDENCE_CONTRADICTED.
function platformEvidenceState(target: Artifact, declared: Set<string>, records: ExecutionRecord[]): string {
  if (!isLiveStatus(target.status)) return "not live";
  if (!declared.has(target.id)) return "missing";
  const declaring = records.filter((record) => (record.platforms ?? []).includes(target.id));
  if (declaring.length === 0) return "declared, not executed";
  if (!declaring.some((record) => record.host)) return "executed, host unrecorded";
  if (!target.host_os) return "observed";
  return platformContradiction(target, records) ? "contradicted" : "observed on declared host";
}

function platformCoverageProjection(artifacts: Artifact[], config: ProjectConfig | null, records: ExecutionRecord[]): string {
  const targets = artifacts.filter((artifact) => artifact.artifact_type === "platform_target").sort((a, b) => a.id.localeCompare(b.id));
  const declared = declaredPlatformIds(config);
  const levels = ["unit", "integration", "system"] as const;
  const declaringCommands = (targetId: string): string[] =>
    config ? levels.flatMap((level) => config.verification[level].filter((command) => (command.platforms ?? []).includes(targetId)).map((command) => `${level}:${command.id}`)) : [];
  const targetRows = targets.map((target) => {
    const observed = uniqueSorted(records.filter((record) => (record.platforms ?? []).includes(target.id) && record.host).map((record) => record.host?.os ?? ""));
    return [
      `\`${target.id}\``,
      target.status,
      target.host_os ?? "—",
      declaringCommands(target.id).map((value) => `\`${value}\``).join(", ") || "none",
      observed.join(", ") || "—",
      platformEvidenceState(target, declared, records)
    ];
  });
  const commandRows = config
    ? levels.flatMap((level) => config.verification[level].filter((command) => command.platforms).map((command) => {
        const latest = latestExecution(records.filter((record) => record.level === level && matchesDefinitionEvidence(record, command)));
        return [
          level,
          `\`${command.id}\``,
          (command.platforms ?? []).map((value) => `\`${value}\``).join(", "),
          latest ? `\`${latest.id}\`` : "none",
          latest ? String(latest.exit_code) : "—",
          latest ? latest.host?.os ?? "not recorded" : "—",
          latest ? latest.ended_at : "—"
        ];
      }))
    : [];
  const liveTargetIds = new Set(livePlatformTargets(artifacts).map((target) => target.id));
  const unknown = [...declared].filter((declaration) => !liveTargetIds.has(declaration)).sort();
  return `# Platform Coverage\n\nDeclarations are human claims; recorded hosts are machine facts. This view joins them without merging them.\n\n## Targets\n\n${table(
    ["Target", "Status", "Declared host_os", "Declaring commands", "Observed hosts", "Evidence state"],
    targetRows
  )}\n## Declaring commands\n\nA row matches executions through the same predicate the baseline verdict uses: identical command identity, text, working directory and platform declaration. Unlike the verdict, it looks across every flow — latest evidence ever, not latest in the active flow.\n\n${table(
    ["Level", "Command", "Declares", "Latest matching execution", "Exit code", "Observed host", "Finished at"],
    commandRows
  )}\n## Unknown declarations\n\n${unknown.map((declaration) => `- \`${declaration}\``).join("\n") || "None."}\n`;
}

// One markdown cell; a URL or query text may legitimately contain a pipe.
function projectionCell(value: string): string {
  return value.replaceAll("|", "\\|");
}

/**
 * The retrieval sections appended to research-coverage.md when — and only
 * when — retrieval records exist. A rung-0 repository must keep its projection
 * byte-identical, because GENERATED_DRIFT is an error and an upgrade must not
 * fail every existing repository until someone runs refresh.
 */
function retrievalCoverageSections(retrievals: RetrievalRecord[], queries: QueryRecord[]): string {
  const retrievalRows = retrievals.map((record) => [
    `\`${record.id}\``,
    projectionCell(record.url),
    `${record.instrument}${record.escalation ? " (escalated)" : ""}`,
    record.via,
    String(record.capability_rung),
    record.ok ? "ok" : "failed",
    record.ok ? `${record.body_bytes}B${record.truncated ? " (truncated)" : ""}` : "—"
  ]);
  const queryRows = queries.map((record) => [
    `\`${record.id}\``,
    record.kind,
    record.pass ?? "—",
    projectionCell(record.query || record.url || ""),
    record.ok ? String(record.result_count) : "failed",
    (record.unresponsive_engines ?? []).map(projectionCell).join(", ") || "—"
  ]);
  const count = (predicate: (ok: boolean) => boolean) => ({
    searxng: queries.filter((record) => record.instrument === "searxng" && predicate(record.ok)).length,
    firecrawlQueries: queries.filter((record) => record.instrument === "firecrawl" && predicate(record.ok)).length,
    firecrawl: retrievals.filter((record) => record.instrument === "firecrawl" && predicate(record.ok)).length,
    camofox: retrievals.filter((record) => record.instrument === "camofox" && predicate(record.ok)).length
  });
  const ok = count((value) => value);
  const failed = count((value) => !value);
  return `\n## Retrieval provenance\n\nEngine-performed page retrievals; each row is an immutable record under \`.ai-saas-sdlc/retrievals/\` with a hashed stored body.\n\n${table(
    ["Record", "URL", "Instrument", "Via", "Rung", "Outcome", "Body"],
    retrievalRows
  )}\n## Query passes\n\n${table(
    ["Record", "Kind", "Pass", "Query", "Results", "Unresponsive engines"],
    queryRows
  )}\n## Instrument usage\n\n- SearXNG searches: ${ok.searxng} ok, ${failed.searxng} failed\n- Firecrawl maps: ${ok.firecrawlQueries} ok, ${failed.firecrawlQueries} failed\n- Firecrawl retrievals: ${ok.firecrawl} ok, ${failed.firecrawl} failed\n- Camofox retrievals: ${ok.camofox} ok, ${failed.camofox} failed\n`;
}

export function buildProjections(
  artifacts: Artifact[],
  graph: ArtifactGraph,
  impact: ImpactReport,
  baseline: BaselineManifest | null,
  activeChange: string | null,
  config: ProjectConfig | null,
  records: ExecutionRecord[],
  retrievals: RetrievalRecord[] = [],
  queries: QueryRecord[] = []
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
  )}${retrievals.length + queries.length > 0 ? retrievalCoverageSections(retrievals, queries) : ""}`;
  projections["evidence-claim-coverage.md"] = evidenceClaimCoverage(artifacts);
  projections["acceptance-coverage.md"] = acceptanceCoverage(artifacts);
  projections["rule-coverage.md"] = ruleCoverage(artifacts);
  // Emitted only when platform targets exist, per the roadmap contract: a
  // repository without them sees no new generated file and therefore no drift.
  // Gated on existence rather than liveness so the file cannot flip in and out
  // of the expected set when the last target leaves the live statuses.
  if (artifacts.some((artifact) => artifact.artifact_type === "platform_target")) {
    projections["platform-coverage.md"] = platformCoverageProjection(artifacts, config, records);
  }

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
  // An accepted ADR is immutable, so a superseded one keeps `accepted` and `active`
  // in its own frontmatter forever. Deriving the reverse edge here is the only way
  // the index can show that a later decision has taken over, without rewriting
  // history in the artifact itself.
  const decisions = artifacts.filter((item) => item.artifact_type === "architectural_decision");
  const supersededBy = new Map<string, string[]>();
  for (const decision of decisions) {
    if (!decision.supersedes) continue;
    supersededBy.set(decision.supersedes, [...(supersededBy.get(decision.supersedes) ?? []), decision.id]);
  }
  projections["decision-index.md"] = `# Decision Index\n\n${table(
    ["ID", "Decision status", "Artifact status", "In force", "Title", "Supersedes", "Superseded by"],
    decisions.map((item) => {
      const successors = supersededBy.get(item.id) ?? [];
      return [
        `\`${item.id}\``,
        item.adr_status ?? "",
        item.status,
        successors.length > 0 ? "no" : "yes",
        item.title,
        item.supersedes ? `\`${item.supersedes}\`` : "—",
        successors.length > 0 ? successors.map((id) => `\`${id}\``).join(", ") : "—"
      ];
    })
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
