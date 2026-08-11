import type { Artifact } from "./types.js";
import { isLiveStatus } from "./types.js";
import { completedRow, dataRows, sectionBody } from "./markdown.js";

const TEST_TYPES = new Set(["unit_test_backend", "unit_test_frontend", "unit_test_job", "integration_test", "system_test"]);

/**
 * The case IDs a specification actually declares.
 *
 * Counted by distinct ID rather than by row, so that a repeated header, a
 * continuation block or a duplicated row cannot change the answer a reader
 * would give.
 */
export function caseIds(body: string): Set<string> {
  const section = sectionBody(body, "Test cases");
  if (!section) return new Set();
  return new Set(dataRows(section)
    .filter((row) => completedRow(row) && /^`?TC-[0-9]+`?$/i.test(row[0] ?? ""))
    .map((row) => row[0]!.replace(/`/g, "").toUpperCase()));
}

export interface BrokenCaseReference {
  reference: string;
  specification: string;
  file: string;
}

/**
 * Qualified case references that name a case their specification does not hold.
 *
 * `validate` already refuses an artifact that references a missing *artifact*,
 * but a reference to a case inside a specification is written in prose and was
 * checked by nobody. That gap became visible the moment specifications started
 * splitting: an author who writes `IT-X#TC-40` while planning to append to
 * `IT-X`, and then correctly puts the cases in a new specification instead,
 * leaves behind a reference to a case that never came to exist.
 *
 * Reported as a warning, not an error, for a blunt reason: an accepted ADR is
 * immutable after baselining, so a broken reference inside one can never be
 * corrected in place. Failing on it would leave a repository unable to baseline
 * anything, ever again, over a stale cross-reference. It must be visible; it
 * must not be fatal.
 */
export function brokenCaseReferences(artifacts: Artifact[]): BrokenCaseReference[] {
  const declared = new Map<string, Set<string>>();
  for (const artifact of artifacts) {
    if (TEST_TYPES.has(artifact.artifact_type)) declared.set(artifact.id, caseIds(artifact.body));
  }
  const broken: BrokenCaseReference[] = [];
  for (const artifact of artifacts) {
    if (!isLiveStatus(artifact.status)) continue;
    const seen = new Set<string>();
    for (const match of artifact.body.matchAll(/\b([A-Z][A-Z0-9-]*)#(TC-[0-9]+)\b/g)) {
      const [reference, specification, testCase] = [match[0]!, match[1]!, match[2]!];
      const cases = declared.get(specification);
      if (!cases || cases.has(testCase.toUpperCase()) || seen.has(reference)) continue;
      seen.add(reference);
      broken.push({ reference, specification, file: artifact.file });
    }
  }
  return broken;
}
