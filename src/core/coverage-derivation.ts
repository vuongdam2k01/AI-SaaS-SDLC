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
const designTypes = new Set(["screen", "component", "subsystem", "api_processing", "entity", "external_integration", "job", "event", "platform_target"]);
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

/**
 * Which verification level claims each declared business rule.
 *
 * A feature's business rules are the commitments the product makes. Nothing
 * previously derived whether any test specification claimed them, so a rule
 * could reach a baseline with no oracle at any level and no signal that it had.
 * Which level holds a rule is a derivation judgement and stays that way; that
 * *some* level holds it is a contract, and this projection is what makes it
 * checkable.
 */
export function ruleCoverage(artifacts: Artifact[]): string {
  const rows = ruleCoverageEntries(artifacts).map((entry) => [
    `\`${entry.rule}\``,
    `\`${entry.feature}\``,
    cell(entry.unit),
    cell(entry.integration),
    cell(entry.system),
    entry.covered ? "covered" : "unverified"
  ]);
  return `# Business Rule Coverage\n\nEvery business rule declared by a live feature must be claimed by at least one verification specification. The level is a derivation judgement; having a level at all is a contract.\n\n${table(["Business rule", "Feature", "Unit", "Integration", "System", "Status"], rows)}`;
}

export interface RuleCoverageEntry {
  rule: string;
  feature: string;
  file: string;
  unit: string[];
  integration: string[];
  system: string[];
  covered: boolean;
}

const unitTypes = new Set(["unit_test_backend", "unit_test_frontend", "unit_test_job"]);

export function ruleCoverageEntries(artifacts: Artifact[]): RuleCoverageEntry[] {
  const features = artifacts.filter((artifact) => artifact.artifact_type === "feature"
    && artifact.status !== "retired" && artifact.status !== "superseded");
  return features.flatMap((feature) => ids(feature.body, /\bBR-[A-Z0-9-]+\b/g).map((rule) => {
    const qualified = `${feature.id}#${rule}`;
    // Either form counts as a claim: the qualified reference, or a bare rule ID
    // inside a specification that already declares the owning feature upstream.
    const claimants = artifacts.filter((artifact) => testTypes.has(artifact.artifact_type)
      && (artifact.body.includes(qualified)
        || (artifact.depends_on.includes(feature.id) && new RegExp(`\\b${rule}\\b`).test(artifact.body))));
    const unit = claimants.filter((artifact) => unitTypes.has(artifact.artifact_type)).map((artifact) => artifact.id);
    const integration = claimants.filter((artifact) => artifact.artifact_type === "integration_test").map((artifact) => artifact.id);
    const system = claimants.filter((artifact) => artifact.artifact_type === "system_test").map((artifact) => artifact.id);
    return { rule: qualified, feature: feature.id, file: feature.file, unit, integration, system, covered: claimants.length > 0 };
  }));
}
