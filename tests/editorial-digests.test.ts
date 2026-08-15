import { describe, expect, it } from "vitest";
import { computeEditorialDigests, diffEditorialDigests } from "../src/core/editorial-digests.js";

const changed = (before: string, after: string): string[] => diffEditorialDigests(computeEditorialDigests(before), computeEditorialDigests(after));

const BODY = `# Approval

Requests are decided once. The reason field accepts 200 characters.

| Rule | Statement |
|---|---|
| BR-01 | A request carries one decision. |
| BR-02 | A reason is required for a rejection. |

<!-- Guidance: keep the rules table ordered by rule ID. -->
`;

describe("editorial digests", () => {
  it("accepts rewording, reformatting and guidance edits", () => {
    expect(changed(BODY, BODY.replace("Requests are decided once.", "Each request is decided exactly once."))).toEqual([]);
    expect(changed(BODY, BODY.replace("# Approval", "# Approval requests"))).toEqual([]);
    expect(changed(BODY, BODY.replace("A reason is required for a rejection.", "A reason is required when rejecting."))).toEqual([]);
    expect(changed(BODY, BODY.replace("<!-- Guidance: keep the rules table ordered by rule ID. -->", "<!-- Guidance: rewritten entirely. -->"))).toEqual([]);
    // A repeated mention adds no claim: one occurrence is what a claim needs.
    expect(changed(BODY, `${BODY}\nBR-01 is restated here for emphasis.\n`)).toEqual([]);
  });

  it("refuses a changed number, identifier or table shape", () => {
    expect(changed(BODY, BODY.replace("200 characters", "500 characters"))).toEqual(["numbers"]);
    expect(changed(BODY, BODY.replace("| BR-02 |", "| BR-03 |"))).toEqual(["identifiers", "table structure"]);
    expect(changed(BODY, BODY.replace("| BR-02 | A reason is required for a rejection. |\n", ""))).toEqual(["identifiers", "table structure"]);
    expect(changed(BODY, `${BODY}| BR-03 | A decision is final. |\n`)).toEqual(["identifiers", "table structure"]);
    expect(changed(BODY, BODY.replace("| Rule | Statement |", "| Rule | Statement | Owner |"))).toEqual(["table structure"]);
    expect(changed(BODY, `${BODY}\nGoverned by ACCESS-001.\n`)).toEqual(["identifiers"]);
  });

  it("treats a threshold that moves between rules as a change even though the numbers are the same", () => {
    const swapped = BODY
      .replace("The reason field accepts 200 characters.", "The reason field accepts 80 characters.")
      .replace("| BR-01 | A request carries one decision. |", "| BR-01 | A request carries one decision within 200 days. |");
    expect(changed(BODY, swapped)).toContain("numbers");
  });

  it("is identical across line endings, which a Windows checkout changes on its own", () => {
    expect(computeEditorialDigests(BODY)).toEqual(computeEditorialDigests(BODY.replace(/\n/g, "\r\n")));
  });

  it("ignores uppercase prose compounds that carry no digit and therefore no reference", () => {
    expect(changed(BODY, `${BODY}\nThis view is READ-ONLY for auditors.\n`)).toEqual([]);
  });
});
