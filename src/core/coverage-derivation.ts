import type { Artifact } from "./types.js";

function ids(body: string, pattern: RegExp): string[] {
  return [...new Set(body.match(pattern) ?? [])].sort();
}

function cell(values: string[]): string {
  return values.length > 0 ? values.map((value) => `\`${value}\``).join(", ") : "—";
}

function table(headers: string[], rows: string[][]): string {
  const head = `| ${headers.join(" | ")} |`;
  const divider = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.length > 0 ? rows.map((row) => `| ${row.join(" | ")} |`).join("\n") : `| ${headers.map(() => "—").join(" | ")} |`;
  return `${head}\n${divider}\n${body}\n`;
}

export function evidenceClaimCoverage(artifacts: Artifact[]): string {
  const ledger = artifacts.find((artifact) => artifact.artifact_type === "evidence_ledger");
  const evidenceIds = ids(ledger?.body ?? "", /\bEVD-[A-Z0-9-]+\b/g);
  const rows = evidenceIds.map((evidenceId) => {
    const consumers = artifacts.filter((artifact) => artifact.id !== ledger?.id && new RegExp(`\\b${evidenceId}\\b`).test(artifact.body)).map((artifact) => artifact.id);
    return [`\`${evidenceId}\``, cell(consumers), consumers.length > 0 ? "consumed" : "unconsumed"];
  });
  return `# Evidence-to-Claim Coverage\n\nThis projection shows which canonical synthesis artifacts explicitly consume each evidence entry.\n\n${table(["Evidence", "Referenced by", "Status"], rows)}`;
}

const behaviorTypes = new Set(["use_case", "business_flow"]);
const designTypes = new Set(["screen", "component", "subsystem", "api_processing", "entity", "external_integration", "job", "event"]);
const testTypes = new Set(["unit_test_backend", "unit_test_frontend", "unit_test_job", "integration_test", "system_test"]);

export function acceptanceCoverage(artifacts: Artifact[]): string {
  const acceptanceIds = artifacts.filter((artifact) => artifact.artifact_type === "feature" && artifact.status !== "retired" && artifact.status !== "superseded")
    .flatMap((artifact) => ids(artifact.body, /\bAC-[A-Z0-9-]+\b/g).map((id) => ({ id, feature: artifact.id })));
  const rows = acceptanceIds.map(({ id, feature }) => {
    const qualified = `${feature}#${id}`;
    const consumers = artifacts.filter((artifact) => artifact.id !== feature
      && (artifact.body.includes(qualified) || artifact.depends_on.includes(feature) && new RegExp(`\\b${id}\\b`).test(artifact.body)));
    const behavior = consumers.filter((artifact) => behaviorTypes.has(artifact.artifact_type)).map((artifact) => artifact.id);
    const design = consumers.filter((artifact) => designTypes.has(artifact.artifact_type)).map((artifact) => artifact.id);
    const tests = consumers.filter((artifact) => testTypes.has(artifact.artifact_type)).map((artifact) => artifact.id);
    return [`\`${qualified}\``, `\`${feature}\``, cell(behavior), cell(design), cell(tests), behavior.length > 0 && tests.length > 0 ? "covered" : "gap"];
  });
  return `# Acceptance Coverage\n\nDesign is conditional; behavior and verification references are required for complete coverage.\n\n${table(["Acceptance criterion", "Feature", "Behavior", "Design", "Tests", "Status"], rows)}`;
}
