import { afterEach, describe, expect, it } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cleanup, tempProject } from "./helpers.js";
import { scanArtifacts } from "../src/core/artifacts.js";
import { validateProject } from "../src/core/validation.js";
import { normalizeBlockedOn, openQuestions, questionIsStale } from "../src/core/question-ledger.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

async function addQuestion(root: string, row: string): Promise<void> {
  const file = path.join(root, "05-control", "questions.md");
  const body = (await readFile(file, "utf8")).replace(/\r\n/g, "\n");
  const at = body.indexOf("\n", body.indexOf("|---|---|---|---|---|---|---|---|"));
  await writeFile(file, `${body.slice(0, at)}\n${row}${body.slice(at)}`, "utf8");
}

describe("question blocked-on classes", () => {
  it("normalizes the closed value domain and rejects everything else", () => {
    expect(normalizeBlockedOn("owner-decision")).toBe("owner-decision");
    expect(normalizeBlockedOn(" `Owner-Environment` ")).toBe("owner-environment");
    expect(normalizeBlockedOn("post-launch")).toBe("post-launch");
    // Free text is not a class: an unclassified row keeps historical behavior
    // rather than being guessed into a class it never declared.
    expect(normalizeBlockedOn("Provider comparison at Evolution time")).toBeNull();
    expect(normalizeBlockedOn("")).toBeNull();
    expect(normalizeBlockedOn(undefined)).toBeNull();
  });

  it("exempts world-blocked classes from staleness and keeps the threshold for the rest", () => {
    // Waiting on the world is not a debt: a post-launch question at any age is fine.
    expect(questionIsStale("post-launch", 50)).toBe(false);
    expect(questionIsStale("external-evidence", 50)).toBe(false);
    // Waiting on a person or a runnable measurement is the real signal.
    expect(questionIsStale("owner-decision", 3)).toBe(true);
    expect(questionIsStale("owner-environment", 8)).toBe(true);
    expect(questionIsStale("measurement", 3)).toBe(true);
    expect(questionIsStale("owner-decision", 2)).toBe(false);
    // Unclassified rows read exactly as they did before the column existed.
    expect(questionIsStale(null, 3)).toBe(true);
    expect(questionIsStale(null, null)).toBe(false);
  });

  it("parses the Blocked on column and raises QUESTION_AWAITING_OWNER for owner-blocked rows only", async () => {
    const root = await tempProject();
    roots.push(root);
    await addQuestion(root, "| QST-001 | Which provider serves production? | Blocks the real adapter | INT-A-001 | Provider comparison | owner-decision | future ADR | open |");
    await addQuestion(root, "| QST-002 | Do users revisit finished flows? | Orders the roadmap | FTR-A-001 | Cohort behavior | post-launch | future reassessment | open |");

    const artifacts = await scanArtifacts(root);
    const open = new Map(openQuestions(artifacts).map((question) => [question.id, question]));
    expect(open.get("QST-001")?.blocked_on).toBe("owner-decision");
    expect(open.get("QST-002")?.blocked_on).toBe("post-launch");

    const report = await validateProject(root, artifacts);
    const awaiting = report.findings.filter((finding) => finding.code === "QUESTION_AWAITING_OWNER");
    expect(awaiting).toHaveLength(1);
    expect(awaiting[0]?.severity).toBe("warning");
    expect(awaiting[0]?.message).toContain("QST-001");
    expect(awaiting[0]?.message).not.toContain("QST-002");
  });

  it("stays silent when every open question waits on the world", async () => {
    const root = await tempProject();
    roots.push(root);
    await addQuestion(root, "| QST-003 | Which occasion converts best? | Targeting | FTR-A-001 | Cohort behavior | post-launch | future reassessment | open |");
    const report = await validateProject(root, await scanArtifacts(root));
    expect(report.findings.filter((finding) => finding.code === "QUESTION_AWAITING_OWNER")).toEqual([]);
  });
});
