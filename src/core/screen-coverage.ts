import { TEST_TYPES, claimsLocalId } from "./claims.js";
import { dataRows, sectionBody } from "./markdown.js";
import type { Artifact, ValidationFinding } from "./types.js";
import { isLiveStatus } from "./types.js";

/** The screen sections whose rows declare behavior a case can observe. */
const DECLARING_SECTIONS = [
  { heading: "Actions", pattern: /^E-[0-9]{2}$/ },
  { heading: "Validation", pattern: /^V-[0-9]{2}$/ }
] as const;

export interface ScreenCoverageEntry {
  /** Qualified reference, e.g. SCR-APPROVAL-001#E-01. */
  reference: string;
  screen: string;
  localId: string;
  file: string;
  /** Live verification specifications that claim it. */
  claimants: string[];
  /** True when the ledger carries the behavior as an open question instead. */
  questioned: boolean;
  covered: boolean;
}

/**
 * The local IDs a screen declares as observable behavior.
 *
 * Read from the Local-ID column of the Actions and Validation tables rather
 * than by scanning the body, because a screen that references another screen's
 * `E-01` in a transition guard would otherwise appear to declare it. What a
 * screen owns is what its own tables enumerate.
 */
export function declaredScreenIds(screen: Artifact): string[] {
  return DECLARING_SECTIONS.flatMap(({ heading, pattern }) => {
    const section = sectionBody(screen.body, heading);
    if (!section) return [];
    return dataRows(section).map((row) => (row[0] ?? "").replace(/`/g, "").trim()).filter((id) => pattern.test(id));
  });
}

/**
 * Where each screen action and validation rule ends up.
 *
 * A screen's Actions and Validation rows are the densest behavioral surface the
 * documents own, and the largest group by volume in any derived specification.
 * Closure here is the same three-destination rule the flows already state in
 * prose: a declared behavior is proven by a case, handed to another level
 * through an exclusion the receiving specification carries, or recorded as an
 * open question. What it may not be is absent from all three, which is how a
 * behavior disappears without anyone deciding that it should.
 */
export function screenCoverageEntries(artifacts: Artifact[]): ScreenCoverageEntry[] {
  const screens = artifacts.filter((artifact) => artifact.artifact_type === "screen" && isLiveStatus(artifact.status));
  const specs = artifacts.filter((artifact) => TEST_TYPES.has(artifact.artifact_type) && isLiveStatus(artifact.status));
  const ledger = artifacts.find((artifact) => artifact.artifact_type === "question_ledger");
  return screens.flatMap((screen) => declaredScreenIds(screen).map((localId) => {
    const claimants = specs.filter((spec) => claimsLocalId(spec, screen.id, localId)).map((spec) => spec.id);
    // The ledger must name the behavior in qualified form. A bare E-01 in a
    // question would match every screen's first action, which is the ambiguity
    // qualification exists to remove.
    const questioned = ledger?.body.includes(`${screen.id}#${localId}`) ?? false;
    return {
      reference: `${screen.id}#${localId}`,
      screen: screen.id,
      localId,
      file: screen.file,
      claimants,
      questioned,
      covered: claimants.length > 0 || questioned
    };
  }));
}

export function screenCoverageFindings(artifacts: Artifact[]): ValidationFinding[] {
  return screenCoverageEntries(artifacts).filter((entry) => !entry.covered).map((entry) => ({
    severity: "warning" as const,
    code: "SCREEN_BEHAVIOR_UNCLAIMED",
    message: `${entry.reference} is declared behavior no active verification specification claims; prove it in a case, hand it to another level through an exclusion the receiving specification carries, or record the undefined part as a question in QUESTIONS.`,
    file: entry.file
  }));
}

function cell(values: string[]): string {
  return values.length > 0 ? values.map((value) => `\`${value}\``).join(", ") : "—";
}

export function screenCoverage(artifacts: Artifact[]): string {
  const rows = screenCoverageEntries(artifacts).map((entry) => [
    `\`${entry.reference}\``,
    `\`${entry.screen}\``,
    cell(entry.claimants),
    entry.questioned ? "yes" : "no",
    entry.covered ? "covered" : "unclaimed"
  ]);
  const head = "| Declared behavior | Screen | Claimed by | Open question | Status |";
  const divider = "| --- | --- | --- | --- | --- |";
  const body = rows.length > 0 ? rows.map((row) => `| ${row.join(" | ")} |`).join("\n") : "| — | — | — | — | — |";
  return `# Screen Behavior Coverage\n\nEvery action and validation rule a live screen declares reaches one of three destinations: a verification case that proves it, an exclusion handed to a level that can, or an open question. A row that reaches none is a behavior nothing decided about.\n\n${head}\n${divider}\n${body}\n`;
}
