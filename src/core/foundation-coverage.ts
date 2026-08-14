import { FOUNDATION_REFERENCES, TEST_TYPES, bodyIds, claimsGlobalId } from "./claims.js";
import type { Artifact, ValidationFinding } from "./types.js";
import { isLiveStatus } from "./types.js";

export interface FoundationCoverageEntry {
  /** The declared row ID, e.g. ACCESS-001. */
  id: string;
  /** The foundation that declares it. */
  owner: string;
  file: string;
  /** Warning code raised when nothing claims it. */
  code: string;
  /** Human label for the family, used in messages. */
  label: string;
  /** Live verification specifications whose bodies claim it. */
  claimants: string[];
  covered: boolean;
}

/**
 * Which verification specification claims each foundation row.
 *
 * The test-derivation protocol already states that an access rule, invariant,
 * error code and UX rule each carry a required test consequence. Nothing
 * derived whether any specification actually took one, so a rule could reach a
 * baseline with a stated obligation and no oracle anywhere — the same gap
 * RULE_UNVERIFIED closed for business rules, one layer up. Claimants are test
 * specifications only: a screen naming ACCESS-002 records where the rule
 * applies, which is traceability, not proof that the denial was ever exercised.
 */
export function foundationCoverageEntries(artifacts: Artifact[]): FoundationCoverageEntry[] {
  const specs = artifacts.filter((artifact) => TEST_TYPES.has(artifact.artifact_type) && isLiveStatus(artifact.status));
  return FOUNDATION_REFERENCES.flatMap((reference) => {
    const owner = artifacts.find((artifact) => artifact.artifact_type === reference.artifactType && isLiveStatus(artifact.status));
    if (!owner) return [];
    return bodyIds(owner.body, reference.pattern).map((id) => {
      const claimants = specs.filter((spec) => claimsGlobalId(spec, id)).map((spec) => spec.id);
      return {
        id,
        owner: owner.id,
        file: owner.file,
        code: reference.warningCode,
        label: reference.label,
        claimants,
        covered: claimants.length > 0
      };
    });
  });
}

export function foundationCoverageFindings(artifacts: Artifact[]): ValidationFinding[] {
  return foundationCoverageEntries(artifacts).filter((entry) => !entry.covered).map((entry) => ({
    severity: "warning" as const,
    code: entry.code,
    message: `${entry.id} is a declared ${entry.label} no active verification specification claims; claim it from the level that can observe it being violated, or record why it cannot be verified in TEST-POLICY.`,
    file: entry.file
  }));
}

function cell(values: string[]): string {
  return values.length > 0 ? values.map((value) => `\`${value}\``).join(", ") : "—";
}

export function foundationCoverage(artifacts: Artifact[]): string {
  const rows = foundationCoverageEntries(artifacts).map((entry) => [
    `\`${entry.id}\``,
    `\`${entry.owner}\``,
    cell(entry.claimants),
    entry.covered ? "covered" : "unverified"
  ]);
  const head = "| Foundation row | Owner | Claimed by | Status |";
  const divider = "| --- | --- | --- | --- |";
  const body = rows.length > 0 ? rows.map((row) => `| ${row.join(" | ")} |`).join("\n") : "| — | — | — | — |";
  return `# Foundation Rule Coverage\n\nEvery access rule, system invariant, error code and UX rule a live foundation declares must be claimed by at least one active verification specification. Which level claims it is a derivation judgement; having a level at all is a contract.\n\n${head}\n${divider}\n${body}\n`;
}
