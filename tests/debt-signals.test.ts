import { afterEach, describe, expect, it } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { artifact, cleanup, establishGenesis, prepareGenesisArtifacts, tempProject } from "./helpers.js";
import { addApprovalFeature, addSharedQueueFeature, materializePatternArtifact } from "./fixtures/complete-saas/fixture.js";
import { createBaseline } from "../src/core/baseline.js";
import { closeFlow, loadCurrentState, startFlow } from "../src/core/state.js";
import { scanArtifacts } from "../src/core/artifacts.js";
import { validateProject } from "../src/core/validation.js";
import { MAX_CASES_PER_SPEC, specSizeEntries } from "../src/core/spec-size.js";
import { baselinesOpen, openQuestions } from "../src/core/question-ledger.js";
import { brokenCaseReferences } from "../src/core/test-cases.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

function specBody(cases: number): string {
  const rows = Array.from({ length: cases }, (_, index) =>
    `| TC-${String(index + 1).padStart(2, "0")} | FTR-A-001#BR-01 | ready | act | observed | clean |`).join("\n");
  return `# Spec\n\n## Test cases\n\n| Local ID | Reference IDs | Setup | Stimulus | Expected cross-boundary result | Cleanup |\n|---|---|---|---|---|---|\n${rows}\n`;
}

const LEDGER_BODY = `# Open question ledger

## Authority boundary

Questions record material unknowns until evidence or an authoritative artifact resolves them.

## Open questions

| Question ID | Question | Why it matters | Affected artifacts | Evidence needed | Resolution artifact | Status |
|---|---|---|---|---|---|---|
| QST-001 | Do agencies accept one approver per request? | A second approver changes the decision contract. | FTR-APPROVAL-001 | Agency interviews or comparable product behavior | EVIDENCE-LEDGER | open |
| QST-002 | Is decision history retained beyond one year? | Retention changes storage and export obligations. | ENT-APPROVAL-001 | Stated retention policy of comparable products | EVIDENCE-LEDGER | open |

## Resolution recording

| Question ID | Resolution summary | Evidence/decision IDs | Affected changes | Resolved by change |
|---|---|---|---|---|
| QST-000 | Fixture placeholder resolution retained for shape. | EVD-FIXTURE-001 | GENESIS | GENESIS |

## Aging and impact

Neither open question may be asserted as fact. Both remain visible until evidence or a decision closes them.

## Completion contract

Complete for this fixture; later changes require a named semantic flow and attributable input.
`;

async function writeLedger(root: string, body = LEDGER_BODY): Promise<void> {
  const file = path.join(root, "05-control", "questions.md");
  const source = await readFile(file, "utf8");
  const marker = source.replace(/\r\n/g, "\n").indexOf("\n---\n", 4);
  const frontmatter = source.slice(0, marker + 5).replace("status: draft", "status: active");
  await writeFile(file, `${frontmatter}\n${body.trim()}\n`, "utf8");
}

async function appendCases(root: string, relative: string, count: number): Promise<void> {
  const file = path.join(root, relative);
  const lines = (await readFile(file, "utf8")).replace(/\r\n/g, "\n").split("\n");
  const last = lines.map((line, index) => ({ line, index })).filter((entry) => /^\| TC-[0-9]{2} \|/.test(entry.line)).pop();
  if (!last) throw new Error(`No test case rows in ${relative}`);
  const columns = last.line.split("|").length - 2;
  const extra = Array.from({ length: count }, (_, index) =>
    `| TC-${String(index + 90).padStart(2, "0")} | FTR-APPROVAL-001#AC-01 | ${Array.from({ length: columns - 2 }, () => "stated precisely enough to implement").join(" | ")} |`);
  lines.splice(last.index + 1, 0, ...extra);
  await writeFile(file, lines.join("\n"), "utf8");
}

describe("specification size", () => {
  it("counts completed test cases and ignores unfinished rows", () => {
    const entries = specSizeEntries([
      artifact({ id: "IT-A-001", artifact_type: "integration_test", body: specBody(4) }),
      artifact({ id: "ST-A-001", artifact_type: "system_test", body: `${specBody(2)}| TC-99 | TBD | TBD | TBD | TBD | TBD |\n` }),
      artifact({ id: "UT-API-A-001", artifact_type: "unit_test_backend", body: specBody(30) })
    ]);
    expect(entries.map((entry) => [entry.id, entry.cases])).toEqual([["IT-A-001", 4], ["ST-A-001", 2]]);
    expect(entries.every((entry) => entry.oversized)).toBe(false);
  });

  it("names the axis to split on once a specification passes the threshold", () => {
    const [integration, system] = specSizeEntries([
      artifact({ id: "IT-A-001", artifact_type: "integration_test", body: specBody(MAX_CASES_PER_SPEC + 1) }),
      artifact({ id: "ST-A-001", artifact_type: "system_test", body: specBody(MAX_CASES_PER_SPEC + 1) })
    ]);
    expect(integration!.oversized).toBe(true);
    expect(integration!.split_axis).toBe("by integration boundary");
    expect(system!.split_axis).toBe("by user journey");
  });

  it("counts cases a real author writes in blocks, with and without a repeated header", () => {
    // How the specifications in the acceptance run were actually written: the
    // case table continues after a blank line, sometimes with the header
    // repeated and sometimes not. A parser that stops at the first well-formed
    // table reports a fraction of the cases and calls an oversized file small.
    const header = "| Local ID | Reference IDs | Setup | Stimulus | Expected cross-boundary result | Cleanup |\n|---|---|---|---|---|---|";
    const row = (index: number) => `| TC-${String(index).padStart(2, "0")} | FTR-A-001#BR-01 | ready | act | observed | clean |`;
    const body = [
      "# Spec", "", "## Test cases", "", header,
      ...Array.from({ length: 8 }, (_, index) => row(index + 1)), "",
      ...Array.from({ length: 5 }, (_, index) => row(index + 9)), "",
      header,
      ...Array.from({ length: 3 }, (_, index) => row(index + 14)), "",
      "## Implementation mapping", "",
      "| Case IDs | Test path | Test name or symbol | Exercised boundary |", "|---|---|---|---|",
      "| TC-01 | app:test/it.test.js | `TC-01 does the thing` | service to store |"
    ].join("\n");
    const [entry] = specSizeEntries([artifact({ id: "IT-A-001", artifact_type: "integration_test", body })]);
    expect(entry!.cases).toBe(16);
    expect(entry!.oversized).toBe(true);
  });

  it("does not size a retired specification", () => {
    const entries = specSizeEntries([
      artifact({ id: "IT-A-001", artifact_type: "integration_test", status: "retired", body: specBody(40) })
    ]);
    expect(entries).toEqual([]);
  });

  it("reports an oversized specification as a warning that never blocks a baseline", async () => {
    const root = await tempProject();
    roots.push(root);
    await prepareGenesisArtifacts(root);
    await writeLedger(root);
    await startFlow(root, "genesis", "Approval workflow SaaS");
    await createBaseline(root);
    await closeFlow(root);

    await startFlow(root, "evolution", "Add approval request behavior");
    await addApprovalFeature(root);
    await appendCases(root, "04-verification/integration-tests/IT-APPROVAL-001.md", 10);

    const report = await validateProject(root, await scanArtifacts(root));
    const oversized = report.findings.filter((item) => item.code === "SPEC_OVERSIZED");
    expect(oversized).toHaveLength(1);
    expect(oversized[0]!.severity).toBe("warning");
    expect(oversized[0]!.message).toContain("IT-APPROVAL-001 holds 13 test cases");
    expect(oversized[0]!.message).toContain("split it by integration boundary");
    expect(report.findings.some((item) => item.severity === "error")).toBe(false);
    // The warning is maintenance owed, not a defect: the baseline still forms.
    expect((await createBaseline(root)).id).toBe("BL-001");
  });
});

describe("qualified case references", () => {
  // Found by a real flow: an ADR was accepted citing IT-X#TC-40 while planning
  // to append to IT-X, the cases correctly went into a new specification
  // instead, and nothing noticed — reference checking covered artifact IDs in
  // frontmatter, never case IDs written in prose.
  it("reports a reference to a case its specification does not declare", () => {
    const artifacts = [
      artifact({ id: "IT-A-001", artifact_type: "integration_test", body: specBody(3) }),
      artifact({ id: "IT-A-002", artifact_type: "integration_test", body: specBody(2) }),
      artifact({
        id: "ADR-A-001", artifact_type: "architectural_decision", adr_status: "accepted",
        body: "# Decision\n\nProved by IT-A-001#TC-02, IT-A-001#TC-40 and IT-A-002#TC-01.\nAlso by IT-A-001#TC-40 again, and by UNKNOWN-001#TC-99.\n"
      })
    ];
    const broken = brokenCaseReferences(artifacts);
    expect(broken.map((item) => item.reference)).toEqual(["IT-A-001#TC-40"]);
    expect(broken[0]!.file).toBe("ADR-A-001.md");
  });

  it("never fails a baseline on one, because an accepted ADR cannot be repaired", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Add approval request behavior");
    await addApprovalFeature(root);
    const feature = path.join(root, "02-product", "features", "FTR-APPROVAL-001.md");
    await writeFile(feature, `${await readFile(feature, "utf8")}\nProved by IT-APPROVAL-001#TC-97.\n`, "utf8");

    const report = await validateProject(root, await scanArtifacts(root));
    const broken = report.findings.filter((item) => item.code === "CASE_REFERENCE_BROKEN");
    expect(broken).toHaveLength(1);
    expect(broken[0]!.severity).toBe("warning");
    expect(broken[0]!.message).toBe("IT-APPROVAL-001#TC-97 names a case IT-APPROVAL-001 does not declare");
    expect(report.findings.some((item) => item.severity === "error")).toBe(false);
    expect((await createBaseline(root)).id).toBe("BL-001");
  });
});

describe("open question aging", () => {
  it("reads a ledger whose rows continue past the header block", () => {
    const continued = LEDGER_BODY.replace(
      "| QST-002 |",
      "\n| QST-003 | Should a decision be exportable? | Export changes the storage boundary. | REQ-004 | Comparable product behavior | EVIDENCE-LEDGER | open |\n| QST-002 |"
    );
    expect(openQuestions([artifact({ id: "QUESTIONS", artifact_type: "question_ledger", body: continued })])
      .map((question) => question.id)).toEqual(["QST-001", "QST-003", "QST-002"]);
  });

  it("reads open rows and skips resolved ones", () => {
    const ledger = artifact({
      id: "QUESTIONS", artifact_type: "question_ledger",
      body: LEDGER_BODY.replace("| QST-002 | Is decision history retained beyond one year? | Retention changes storage and export obligations. | ENT-APPROVAL-001 | Stated retention policy of comparable products | EVIDENCE-LEDGER | open |",
        "| QST-002 | Is decision history retained beyond one year? | Retention changes storage and export obligations. | ENT-APPROVAL-001 | Stated retention policy of comparable products | EVD-FIXTURE-001 | resolved |")
    });
    const open = openQuestions([ledger]);
    expect(open.map((question) => question.id)).toEqual(["QST-001"]);
    expect(open[0]!.affected).toBe("FTR-APPROVAL-001");
  });

  it("cannot age a question whose origin baseline is unknown", () => {
    expect(baselinesOpen(undefined, "BL-004")).toBeNull();
    expect(baselinesOpen("BL-001", null)).toBeNull();
    expect(baselinesOpen("BL-001", "BL-004")).toBe(3);
  });

  it("stamps questions at their first baseline and reports the ones the product moved past", async () => {
    const root = await tempProject("approval-workflow-fixture", "Approval workflow SaaS for small agencies");
    roots.push(root);
    await prepareGenesisArtifacts(root);
    await writeLedger(root);
    await startFlow(root, "genesis", "Approval workflow SaaS");
    await createBaseline(root);
    await closeFlow(root);

    expect((await loadCurrentState(root)).question_first_baseline).toEqual({ "QST-001": "BL-000", "QST-002": "BL-000" });
    expect((await validateProject(root, await scanArtifacts(root))).findings.some((item) => item.code === "QUESTION_STALE")).toBe(false);

    await startFlow(root, "evolution", "Add approval request behavior");
    await addApprovalFeature(root);
    expect((await createBaseline(root)).id).toBe("BL-001");
    await closeFlow(root);

    await startFlow(root, "evolution", "Add decisions from the shared review queue");
    await addSharedQueueFeature(root);
    expect((await createBaseline(root)).id).toBe("BL-002");
    await closeFlow(root);

    // Two baselines of age is the product moving on while the question waits;
    // three is the question having outlived the work that raised it.
    expect((await validateProject(root, await scanArtifacts(root))).findings.some((item) => item.code === "QUESTION_STALE")).toBe(false);

    await startFlow(root, "evolution", "Choose approval consistency model");
    await materializePatternArtifact(root, {
      type: "architectural_decision", id: "ADR-APPROVAL-001", title: "Approval consistency model",
      dependsOn: ["ARCHITECTURE-OVERVIEW", "API-APPROVAL-001"], adrStatus: "accepted"
    });
    const api = path.join(root, "03-design", "interfaces", "API-APPROVAL-001.md");
    await writeFile(api, (await readFile(api, "utf8")).replace("decisions: []", "decisions: [ADR-APPROVAL-001]"), "utf8");
    expect((await createBaseline(root)).id).toBe("BL-003");
    await closeFlow(root);

    const stale = (await validateProject(root, await scanArtifacts(root))).findings.filter((item) => item.code === "QUESTION_STALE");
    expect(stale.map((item) => item.message.slice(0, 7)).sort()).toEqual(["QST-001", "QST-002"]);
    expect(stale.every((item) => item.severity === "warning")).toBe(true);
    expect(stale[0]!.message).toContain("open for 3 baselines since BL-000");
    expect(stale[0]!.message).toContain("It still blocks: FTR-APPROVAL-001");

    // Closing one by decision is a real closure: it stops being reported at once,
    // and the next baseline forgets it so a reopening ages from its reopening.
    await writeLedger(root, LEDGER_BODY.replace(
      "| QST-002 | Is decision history retained beyond one year? | Retention changes storage and export obligations. | ENT-APPROVAL-001 | Stated retention policy of comparable products | EVIDENCE-LEDGER | open |",
      "| QST-002 | Is decision history retained beyond one year? | Retention changes storage and export obligations. | ENT-APPROVAL-001 | Stated retention policy of comparable products | ADR-APPROVAL-001 | resolved |"
    ));
    const afterClosure = (await validateProject(root, await scanArtifacts(root))).findings.filter((item) => item.code === "QUESTION_STALE");
    expect(afterClosure.map((item) => item.message.slice(0, 7))).toEqual(["QST-001"]);
  });
});
