import type { Artifact, ValidationFinding } from "./types.js";
import { isLiveStatus } from "./types.js";
import { completedRow, dataRows, headingKey, sectionBody } from "./markdown.js";
import { openQuestions } from "./question-ledger.js";

/** A committed token row carries an identifier, not a narrative: `DT-01`, never "Not yet committed". */
const TOKEN_ID = /\bDT-[0-9]{2}\b/;

/**
 * The qualified form a deferring question must cite. A bare "design" or
 * "visual" match would suppress the warning on any question that mentions the
 * word; requiring the section-qualified reference keeps the deferral
 * deliberate and unambiguous, the same doctrine screen coverage applies to
 * `SCR-*#E-NN` citations.
 */
export const DESIGN_TOKENS_CITATION = "UX-RULES#design-tokens";

function column(columns: string[], name: string): number {
  return columns.map(headingKey).indexOf(headingKey(name));
}

/**
 * The single source of truth for "this repository has committed a visual
 * system": at least one completed Design tokens row whose Token cell carries a
 * DT-NN identifier. Read from the ux_rules artifact in any status — like the
 * question ledger, the section is the authority whether or not the foundation
 * has been activated yet — and tolerant of tables written in blocks, hence
 * dataRows over the strict parser. A placeholder narrative row ("Not yet
 * committed") completes the row without committing anything, which is exactly
 * why the identifier, not row presence, is the predicate.
 */
export function committedDesignTokens(artifacts: Artifact[]): boolean {
  const uxRules = artifacts.find((artifact) => artifact.artifact_type === "ux_rules");
  if (!uxRules) return false;
  const section = sectionBody(uxRules.body, "Design tokens");
  if (!section) return false;
  const rows = dataRows(section);
  const header = rows.find((row) => column(row, "Token") >= 0 && column(row, "Value") >= 0);
  if (!header) return false;
  const tokenIndex = column(header, "Token");
  return rows.some((row) => row !== header && completedRow(row) && TOKEN_ID.test(row[tokenIndex] ?? ""));
}

/** An open question citing the qualified section reference defers the commitment; a resolved one no longer does. */
export function designTokensDeferred(artifacts: Artifact[]): boolean {
  return openQuestions(artifacts).some((question) => question.question.includes(DESIGN_TOKENS_CITATION) || question.affected.includes(DESIGN_TOKENS_CITATION));
}

/**
 * A live screen renders in *some* visual system; with no committed tokens the
 * system it renders in is the browser default, and nothing anywhere records
 * that as a choice. Warning, never error: the commitment is the product's to
 * make in Product Evolution, a pre-screen repository owes nothing, and an
 * explicit deferral through the question ledger is a legitimate standing state
 * — the platform-evidence doctrine applied to the visual layer.
 */
export function designTokenFindings(artifacts: Artifact[]): ValidationFinding[] {
  const liveScreens = artifacts.filter((artifact) => artifact.artifact_type === "screen" && isLiveStatus(artifact.status));
  if (liveScreens.length === 0) return [];
  if (committedDesignTokens(artifacts) || designTokensDeferred(artifacts)) return [];
  const uxRules = artifacts.find((artifact) => artifact.artifact_type === "ux_rules");
  return [{
    severity: "warning",
    code: "DESIGN_TOKENS_UNCOMMITTED",
    message: `${liveScreens.length} live screen(s) render with no committed visual system: the Design tokens table of UX-RULES holds no DT-NN row; commit the tokens through Product Evolution, or open a QST-* citing ${DESIGN_TOKENS_CITATION} and let this warning stand as its durable record.`,
    file: uxRules?.file ?? "03-design/ux-rules.md"
  }];
}
