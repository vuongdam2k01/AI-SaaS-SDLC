import type { Artifact } from "./types.js";
import { isLiveStatus } from "./types.js";
import { completedRow, dataRows, sectionBody } from "./markdown.js";

/**
 * Cases beyond which a specification stops being readable as one document.
 *
 * Nothing previously measured this, so integration and system specifications
 * absorbed every new behaviour instead of splitting: coverage stayed complete
 * while two files grew without limit, and no check could see it happening.
 *
 * A flat count is a first approximation. The honest threshold is derived from
 * what the specification actually spans — boundaries exercised, features
 * referenced, participants held real — and this constant is the placeholder
 * until that formula exists.
 */
export const MAX_CASES_PER_SPEC = 12;

/** How to cut a specification of this type when it outgrows one document. */
const SPLIT_AXIS: Record<string, string> = {
  integration_test: "by integration boundary",
  system_test: "by user journey"
};

export interface SpecSizeEntry {
  id: string;
  artifact_type: string;
  file: string;
  cases: number;
  oversized: boolean;
  split_axis: string;
}

export function specSizeEntries(artifacts: Artifact[]): SpecSizeEntry[] {
  return artifacts
    .filter((artifact) => SPLIT_AXIS[artifact.artifact_type] && isLiveStatus(artifact.status))
    .map((artifact) => {
      const section = sectionBody(artifact.body, "Test cases");
      // Counted by distinct case ID rather than by row, so that a repeated
      // header, a continuation block or a duplicated row cannot change the size
      // a reader would report.
      const ids = new Set(section ? dataRows(section)
        .filter((row) => completedRow(row) && /^`?TC-[0-9]+`?$/i.test(row[0] ?? ""))
        .map((row) => row[0]!.replace(/`/g, "").toUpperCase()) : []);
      const cases = ids.size;
      return {
        id: artifact.id,
        artifact_type: artifact.artifact_type,
        file: artifact.file,
        cases,
        oversized: cases > MAX_CASES_PER_SPEC,
        split_axis: SPLIT_AXIS[artifact.artifact_type]!
      };
    });
}
