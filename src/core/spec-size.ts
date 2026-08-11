import type { Artifact } from "./types.js";
import { isLiveStatus } from "./types.js";
import { caseIds } from "./test-cases.js";

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
      const cases = caseIds(artifact.body).size;
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
