import { afterEach, describe, expect, it } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { artifact, cleanup, establishGenesis, tempProject } from "./helpers.js";
import { addApprovalFeature } from "./fixtures/complete-saas/fixture.js";
import { closeFlow, startFlow } from "../src/core/state.js";
import { scanArtifacts } from "../src/core/artifacts.js";
import { validateProject } from "../src/core/validation.js";
import { createBaseline } from "../src/core/baseline.js";
import { refreshProject } from "../src/core/project.js";
import { foundationCoverage, foundationCoverageEntries, foundationCoverageFindings } from "../src/core/foundation-coverage.js";
import { declaredScreenIds, screenCoverageEntries, screenCoverageFindings } from "../src/core/screen-coverage.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

const ACCESS_BODY = `# Access control

## Access rules

| Access ID | Subject or role | Resource | Action | Condition | Decision | Denial behavior |
|---|---|---|---|---|---|---|
| ACCESS-001 | member | Request | read | in tenant | allow | ERR-FORBIDDEN |
| ACCESS-002 | approver | Request | approve | assigned | allow | ERR-FORBIDDEN |
`;

const SCREEN_BODY = `# SCR-A-001 — Decision view

## Actions

| Local ID | Trigger | Preconditions | Processing reference | Success | Failure |
|---|---|---|---|---|---|
| E-01 | Activate Approve. | pending | API-A-001 | announced approved | safe error |
| E-02 | Activate Reject. | pending | API-A-001 | announced rejected | safe error |

## Validation

| Local ID | Applies to | Rule | Exact response | Timing |
|---|---|---|---|---|
| V-01 | I-01 | reason required | "Enter a reason." | on reject |

## Transitions

| Local ID | From | Trigger | To | Guard or state passed |
|---|---|---|---|---|
| T-01 | pending | E-01 | approved | returned version |
`;

describe("foundation rule closure", () => {
  it("reports every declared foundation row no live specification claims", () => {
    const artifacts = [
      artifact({ id: "ACCESS-CONTROL", artifact_type: "access_control", status: "active", body: ACCESS_BODY }),
      artifact({
        id: "IT-A-001",
        artifact_type: "integration_test",
        status: "active",
        body: "# IT\n\nThe denial path exercises ACCESS-002 at the real boundary.\n"
      })
    ];
    const entries = foundationCoverageEntries(artifacts);
    expect(entries.map((entry) => [entry.id, entry.covered])).toEqual([["ACCESS-001", false], ["ACCESS-002", true]]);
    const findings = foundationCoverageFindings(artifacts);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ severity: "warning", code: "ACCESS_UNVERIFIED", file: "ACCESS-CONTROL.md" });
    expect(findings[0]?.message).toContain("ACCESS-001");
  });

  it("counts only verification specifications as claimants", () => {
    // A screen naming an access rule records where the rule applies. That is
    // traceability; it is not evidence that the denial was ever exercised.
    const artifacts = [
      artifact({ id: "ACCESS-CONTROL", artifact_type: "access_control", status: "active", body: ACCESS_BODY }),
      artifact({ id: "SCR-A-001", artifact_type: "screen", status: "active", body: "# SCR\n\nEntry requires ACCESS-001 and ACCESS-002.\n" })
    ];
    expect(foundationCoverageEntries(artifacts).every((entry) => entry.covered)).toBe(false);
    expect(foundationCoverageFindings(artifacts)).toHaveLength(2);
  });

  it("stays silent while the owning foundation is still a draft", () => {
    const artifacts = [artifact({ id: "ACCESS-CONTROL", artifact_type: "access_control", status: "draft", body: ACCESS_BODY })];
    expect(foundationCoverageEntries(artifacts)).toEqual([]);
    expect(foundationCoverageFindings(artifacts)).toEqual([]);
  });

  it("separates the four families by warning code", () => {
    const artifacts = [
      artifact({ id: "SYSTEM-INVARIANTS", artifact_type: "system_invariants", status: "active", body: "| INV-001 | tenant scope |\n" }),
      artifact({ id: "ERROR-CATALOG", artifact_type: "error_catalog", status: "active", body: "| ERROR-AUTH-001 | denied |\n" }),
      artifact({ id: "UX-RULES", artifact_type: "ux_rules", status: "active", body: "| UX-001 | destructive actions confirm |\n" })
    ];
    expect(foundationCoverageFindings(artifacts).map((finding) => finding.code))
      .toEqual(["INVARIANT_UNVERIFIED", "ERROR_UNVERIFIED", "UX_UNVERIFIED"]);
  });

  it("projects the same verdict the warning reports", () => {
    const artifacts = [artifact({ id: "ACCESS-CONTROL", artifact_type: "access_control", status: "active", body: ACCESS_BODY })];
    const projection = foundationCoverage(artifacts);
    expect(projection).toContain("`ACCESS-001`");
    expect(projection).toContain("unverified");
  });
});

describe("screen behavior closure", () => {
  it("reads declared IDs from the Actions and Validation tables only", () => {
    const screen = artifact({
      id: "SCR-A-001",
      artifact_type: "screen",
      status: "active",
      body: `${SCREEN_BODY}\n## Transitions note\n\nThe guard mirrors SCR-B-002#E-09 without owning it.\n`
    });
    expect(declaredScreenIds(screen)).toEqual(["E-01", "E-02", "V-01"]);
  });

  it("accepts a qualified claim, a bare claim with the dependency, and an open question", () => {
    const screen = artifact({ id: "SCR-A-001", artifact_type: "screen", status: "active", body: SCREEN_BODY });
    const artifacts = [
      screen,
      artifact({ id: "ST-A-001", artifact_type: "system_test", status: "active", body: "# ST\n\nCase covers SCR-A-001#E-01.\n" }),
      artifact({ id: "UT-UI-A-001", artifact_type: "unit_test_frontend", status: "active", depends_on: ["SCR-A-001"], body: "# UT\n\nCase covers V-01.\n" }),
      artifact({ id: "QUESTIONS", artifact_type: "question_ledger", status: "active", body: "| QST-001 | What does SCR-A-001#E-02 do offline? |\n" })
    ];
    const entries = screenCoverageEntries(artifacts);
    expect(entries.map((entry) => [entry.localId, entry.covered, entry.questioned]))
      .toEqual([["E-01", true, false], ["E-02", true, true], ["V-01", true, false]]);
    expect(screenCoverageFindings(artifacts)).toEqual([]);
  });

  it("rejects a bare claim from a specification that does not depend on the screen", () => {
    // A bare E-01 matches every screen's first action, so it resolves only
    // where depends_on already names the owner.
    const artifacts = [
      artifact({ id: "SCR-A-001", artifact_type: "screen", status: "active", body: SCREEN_BODY }),
      artifact({ id: "ST-A-001", artifact_type: "system_test", status: "active", body: "# ST\n\nCase covers E-01, E-02 and V-01.\n" })
    ];
    const findings = screenCoverageFindings(artifacts);
    expect(findings).toHaveLength(3);
    expect(findings[0]).toMatchObject({ severity: "warning", code: "SCREEN_BEHAVIOR_UNCLAIMED" });
    expect(findings[0]?.message).toContain("SCR-A-001#E-01");
  });

  it("ignores an unqualified question, which cannot identify which screen it asks about", () => {
    const artifacts = [
      artifact({ id: "SCR-A-001", artifact_type: "screen", status: "active", body: SCREEN_BODY }),
      artifact({ id: "QUESTIONS", artifact_type: "question_ledger", status: "active", body: "| QST-001 | What does E-01 do offline? |\n" })
    ];
    expect(screenCoverageFindings(artifacts)).toHaveLength(3);
  });
});

describe("closure checks inside a repository", () => {
  it("keeps the complete fixture closure free of closure warnings and emits both projections", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Add approval decisions");
    await addApprovalFeature(root);
    await refreshProject(root, false);
    const report = await validateProject(root, await scanArtifacts(root));
    const closure = report.findings.filter((finding) =>
      ["ACCESS_UNVERIFIED", "INVARIANT_UNVERIFIED", "ERROR_UNVERIFIED", "UX_UNVERIFIED", "SCREEN_BEHAVIOR_UNCLAIMED"].includes(finding.code));
    expect(closure).toEqual([]);
    expect(await readFile(path.join(root, "generated", "foundation-coverage.md"), "utf8")).toContain("`ACCESS-001`");
    expect(await readFile(path.join(root, "generated", "screen-coverage.md"), "utf8")).toContain("`SCR-APPROVAL-001#E-01`");
    await createBaseline(root);
    await closeFlow(root);
  });

  it("reports an unclaimed screen action as a warning that still allows a baseline", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Add approval decisions");
    await addApprovalFeature(root);
    // Add one action no specification claims — the ordinary way a behavior
    // enters the documents ahead of its verification.
    const screenFile = path.join(root, "03-design", "screens", "SCR-APPROVAL-001.md");
    const screen = (await readFile(screenFile, "utf8")).replace(/\r\n/g, "\n");
    const lastAction = "| E-02 | Activate B-02.";
    const index = screen.indexOf("\n", screen.indexOf(lastAction));
    await writeFile(screenFile, `${screen.slice(0, index)}\n| E-03 | Activate Withdraw. | ACCESS-002; pending. | API-APPROVAL-001 | announce withdrawn and disable controls | show safe API error; retain authoritative state |${screen.slice(index)}`, "utf8");
    await refreshProject(root, false);
    const artifacts = await scanArtifacts(root);
    const unclaimed = screenCoverageFindings(artifacts);
    expect(unclaimed.map((finding) => finding.message.split(" ")[0])).toEqual(["SCR-APPROVAL-001#E-03"]);
    const report = await validateProject(root, await scanArtifacts(root));
    expect(report.findings.filter((finding) => finding.code === "SCREEN_BEHAVIOR_UNCLAIMED").every((finding) => finding.severity === "warning")).toBe(true);
    expect(report.valid).toBe(true);
    await createBaseline(root);
    await closeFlow(root);
  });

  it("omits both projections from a repository whose subject matter does not exist yet", async () => {
    const root = await tempProject();
    roots.push(root);
    await refreshProject(root, false);
    const generated = path.join(root, "generated");
    await expect(readFile(path.join(generated, "foundation-coverage.md"), "utf8")).rejects.toThrow();
    await expect(readFile(path.join(generated, "screen-coverage.md"), "utf8")).rejects.toThrow();
  });
});
