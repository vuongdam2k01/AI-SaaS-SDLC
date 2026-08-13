import type { Artifact, ArtifactGraph, ExecutionRecord, ProjectConfig } from "./types.js";
import { activeFeatures, featureImplementationState, unprovenLevels, IMPLEMENTATION_LEVELS } from "./implementation-evidence.js";
import { latestExecution, matchesDefinitionEvidence } from "./execution-selection.js";
import { topologicalOrder } from "./graph.js";

function table(headers: string[], rows: string[][]): string {
  const head = `| ${headers.join(" | ")} |`;
  const divider = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.length > 0 ? rows.map((row) => `| ${row.join(" | ")} |`).join("\n") : `| ${headers.map(() => "—").join(" | ")} |`;
  return `${head}\n${divider}\n${body}\n`;
}

function cell(values: string[]): string {
  return values.length > 0 ? values.map((value) => `\`${value}\``).join(", ") : "—";
}

// One markdown cell; a mapping path may legitimately contain a pipe.
function projectionCell(value: string): string {
  return value.replaceAll("|", "\\|");
}

const CONFIG_LEVELS = [
  { key: "unit", label: "UT" },
  { key: "integration", label: "IT" },
  { key: "system", label: "ST" }
] as const;

/**
 * The per-feature implementation dashboard. Every mapping state derives
 * through the exact predicates behind the IMPLEMENTATION_MAPPING_MISSING and
 * IMPLEMENTATION_LEVEL_UNPROVEN warnings, so this view can never disagree
 * with a finding. Mapped is a claim about declared paths; execution verdicts
 * live in the commands table below and in RESULT records, never in this
 * column.
 */
export function implementationCoverageProjection(artifacts: Artifact[], graph: ArtifactGraph, config: ProjectConfig, records: ExecutionRecord[]): string {
  const states = activeFeatures(artifacts).map((feature) => featureImplementationState(feature, artifacts, graph));
  const featureRows = states.map((state) => {
    const unproven = unprovenLevels(state).map(({ level }) => level);
    const mappingState = !state.anyOwnMapped
      ? "unmapped"
      : unproven.length > 0
        ? `partial: ${unproven.join(", ")} unproven`
        : "fully mapped";
    return [
      `\`${state.feature.id}\``,
      `${state.mapped.length}/${state.mappable.length}`,
      ...state.levels.map(({ specs, mapped }) => (specs.length === 0 ? "—" : `${mapped.length}/${specs.length}`)),
      mappingState
    ];
  });
  const commandRows = CONFIG_LEVELS.flatMap(({ key, label }) =>
    config.verification[key].map((command) => {
      const latest = latestExecution(records.filter((record) => record.level === key && matchesDefinitionEvidence(record, command)));
      return [
        label,
        `\`${command.id}\``,
        latest ? `\`${latest.id}\`` : "none",
        latest ? String(latest.exit_code) : "—",
        latest ? latest.ended_at : "—"
      ];
    })
  );
  const seen = new Set<string>();
  const unmapped: string[][] = [];
  for (const state of states) {
    for (const candidate of state.mappable) {
      if (candidate.implementation.length > 0 || seen.has(candidate.id)) continue;
      seen.add(candidate.id);
      const features = states.filter((other) => other.closureIds.has(candidate.id)).map((other) => other.feature.id);
      unmapped.push([`\`${candidate.id}\``, candidate.artifact_type, cell(features)]);
    }
  }
  unmapped.sort((a, b) => (a[0] ?? "").localeCompare(b[0] ?? ""));
  return `# Implementation Coverage\n\nMapping states derive through the same predicates as the IMPLEMENTATION_MAPPING_MISSING and IMPLEMENTATION_LEVEL_UNPROVEN warnings, so this view never disagrees with a finding. A mapping is a declared path, not a verdict; execution evidence lives in the commands table and in RESULT records.\n\n## Features\n\n${table(
    ["Feature", "Design mapped", "UT specs mapped", "IT specs mapped", "ST specs mapped", "Mapping state"],
    featureRows
  )}\n## Configured commands\n\nA row matches executions through the same predicate the baseline verdict uses — identical command identity, text, working directory and platform declaration — but looks across every flow: latest evidence ever, not latest in the active flow.\n\n${table(
    ["Level", "Command", "Latest matching execution", "Exit code", "Finished at"],
    commandRows
  )}\n## Unmapped active design artifacts\n\n${table(["Artifact", "Type", "In closure of"], unmapped)}`;
}

const CONTRACT_DEPENDENCY = /^(?:WIRE|SCHEMA|TRANSITIONS)-/;

const FOUNDATION_REFERENCES = [
  { artifactType: "access_control", heading: "Access rules referenced", pattern: /\bACCESS-\d[A-Z0-9-]*\b/g },
  { artifactType: "system_invariants", heading: "System invariants referenced", pattern: /\bINV-\d[A-Z0-9-]*\b/g },
  { artifactType: "error_catalog", heading: "Error codes referenced", pattern: /\bERROR-[A-Z][A-Z0-9]*-\d+\b/g }
] as const;

function bodyIds(body: string, pattern: RegExp): string[] {
  return [...new Set(body.match(pattern) ?? [])].sort();
}

/** The verbatim `## Test cases` table of one specification, when present. */
function testCaseTableLines(body: string): string[] {
  const normalized = body.replace(/\r\n/g, "\n");
  const section = normalized.split(/^## Test cases\s*$/m)[1];
  if (!section) return [];
  const untilNextHeading = section.split(/^## /m)[0] ?? "";
  return untilNextHeading.split("\n").filter((line) => line.trimStart().startsWith("|"));
}

/**
 * One work packet per active feature: the closure in dependency order with its
 * mappings and owning contract files, the foundation rows the closure
 * references, the covering specifications with their verbatim test-case
 * tables, and the configured commands per level. A derived view for reading
 * and planning — the artifacts and contract files own their content, and
 * nothing here is authority or evidence.
 */
export function implementationPlanProjections(artifacts: Artifact[], graph: ArtifactGraph, config: ProjectConfig): Record<string, string> {
  const projections: Record<string, string> = {};
  const byId = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
  const order = topologicalOrder(graph).order;
  const foundations = FOUNDATION_REFERENCES.map((reference) => ({
    ...reference,
    artifact: artifacts.find((artifact) => artifact.artifact_type === reference.artifactType)
  }));
  for (const feature of activeFeatures(artifacts)) {
    const state = featureImplementationState(feature, artifacts, graph);
    const closureInOrder = order.filter((id) => state.closureIds.has(id)).map((id) => byId.get(id)).filter((artifact): artifact is Artifact => Boolean(artifact));
    const closureRows = closureInOrder.map((artifact) => [
      `\`${artifact.id}\``,
      artifact.artifact_type,
      artifact.status,
      `\`${artifact.file}\``,
      artifact.implementation.length > 0 ? artifact.implementation.map((mapping) => `\`${projectionCell(mapping)}\``).join(", ") : "—",
      cell(artifact.depends_on.filter((dependency) => CONTRACT_DEPENDENCY.test(dependency)))
    ]);
    const closureBodies = closureInOrder.map((artifact) => artifact.body).join("\n");
    const foundationSections = foundations.map(({ heading, pattern, artifact }) => {
      const vocabulary = artifact ? bodyIds(artifact.body, pattern) : [];
      const referenced = vocabulary.filter((id) => new RegExp(`\\b${id}\\b`).test(closureBodies));
      return `### ${heading}\n\n${referenced.map((id) => `- \`${id}\``).join("\n") || "None referenced by this closure."}\n`;
    });
    const specSections = IMPLEMENTATION_LEVELS.map(({ level }) => {
      const specs = state.levels.find((candidate) => candidate.level === level)?.specs ?? [];
      const bodies = specs.map((spec) => {
        const lines = testCaseTableLines(spec.body);
        return `#### \`${spec.id}\` — ${spec.title}\n\nSource: \`${spec.file}\`${spec.implementation.length > 0 ? `\nMapped: ${spec.implementation.map((mapping) => `\`${projectionCell(mapping)}\``).join(", ")}` : "\nMapped: not yet"}\n\n${lines.length > 0 ? `${lines.join("\n")}\n` : "No test-case table found.\n"}`;
      });
      return `### ${level}\n\n${bodies.join("\n") || "No active specifications at this level.\n"}`;
    });
    const commandSections = CONFIG_LEVELS.map(({ key, label }) => {
      const commands = config.verification[key];
      if (commands.length === 0) return `- **${label}**: no configured command`;
      return `- **${label}**:\n${commands.map((command) => `  - \`${command.id}\`: \`${projectionCell(command.command)}\` (cwd \`${projectionCell(command.cwd)}\`)`).join("\n")}`;
    });
    projections[`implementation-plan/${feature.id}.md`] = `# Implementation Plan: ${feature.id}\n\n${feature.title}\n\nDerived work packet joining this feature's closure in dependency order with its mappings, contract files, referenced foundation rows, covering specifications and configured commands. A view for reading and planning — the artifacts and contract files own their content, and nothing here is authority or evidence.\n\n## Closure in dependency order\n\n${table(
      ["Artifact", "Type", "Status", "File", "Implementation mappings", "Contract dependencies"],
      closureRows
    )}\n## Foundation rows referenced by this closure\n\n${foundationSections.join("\n")}\n## Covering specifications\n\n${specSections.join("\n")}\n## Configured verification commands\n\n${commandSections.join("\n")}\n`;
  }
  return projections;
}
