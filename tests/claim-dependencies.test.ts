import { afterEach, describe, expect, it } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { artifact, cleanup, establishGenesis, tempProject } from "./helpers.js";
import { claimDependencyEntries, claimDependencyFindings } from "../src/core/claim-dependencies.js";
import { scanArtifacts } from "../src/core/artifacts.js";
import { validateProject } from "../src/core/validation.js";
import { createBaseline } from "../src/core/baseline.js";
import { closeFlow, startFlow } from "../src/core/state.js";
import { addApprovalFeature } from "./fixtures/complete-saas/fixture.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

const feature = artifact({ id: "FTR-APPROVAL-001", artifact_type: "feature", body: "| BR-01 | A request carries one decision. |\n" });

describe("qualified claims without the dependency that carries them", () => {
  it("reports a specification that proves a rule it never declares a dependency on", () => {
    const spec = artifact({
      id: "UT-API-APPROVAL-001", artifact_type: "unit_test_backend", file: "04-verification/unit/UT-API-APPROVAL-001.md",
      body: "Covers FTR-APPROVAL-001#BR-01 and FTR-APPROVAL-001#BR-02.\n"
    });
    const entries = claimDependencyEntries([feature, spec]);
    expect(entries).toEqual([{ spec: "UT-API-APPROVAL-001", file: "04-verification/unit/UT-API-APPROVAL-001.md", owner: "FTR-APPROVAL-001", localIds: ["BR-01", "BR-02"] }]);

    const findings = claimDependencyFindings([feature, spec]);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ severity: "warning", code: "CLAIM_WITHOUT_DEPENDENCY", file: "04-verification/unit/UT-API-APPROVAL-001.md" });
    expect(findings[0]!.message.startsWith("UT-API-APPROVAL-001")).toBe(true);
    expect(findings[0]!.message).toContain("FTR-APPROVAL-001#BR-01, FTR-APPROVAL-001#BR-02");
    expect(findings[0]!.message).toContain("DR-12");
  });

  it("stays silent once the dependency is declared", () => {
    const spec = artifact({
      id: "UT-API-APPROVAL-001", artifact_type: "unit_test_backend", depends_on: ["FTR-APPROVAL-001"],
      body: "Covers FTR-APPROVAL-001#BR-01.\n"
    });
    expect(claimDependencyEntries([feature, spec])).toEqual([]);
  });

  it("ignores a bare local ID, which the closure was never able to resolve anyway", () => {
    const spec = artifact({ id: "UT-API-APPROVAL-001", artifact_type: "unit_test_backend", body: "Covers BR-01 of the approval feature.\n" });
    expect(claimDependencyEntries([feature, spec])).toEqual([]);
  });

  it("leaves specification-to-specification handoffs and unknown owners alone", () => {
    const sibling = artifact({ id: "IT-APPROVAL-001", artifact_type: "integration_test", body: "| TC-05 | boundary |\n" });
    const spec = artifact({
      id: "UT-API-APPROVAL-001", artifact_type: "unit_test_backend",
      body: "Excluded here, proven by IT-APPROVAL-001#TC-05. Also mentions GONE-001#BR-09.\n"
    });
    expect(claimDependencyEntries([feature, sibling, spec])).toEqual([]);
  });

  it("does not report a retired specification or a self-reference", () => {
    const retired = artifact({ id: "UT-OLD-001", artifact_type: "unit_test_backend", status: "retired", body: "Covers FTR-APPROVAL-001#BR-01.\n" });
    const selfClaim = artifact({ id: "UT-API-APPROVAL-001", artifact_type: "unit_test_backend", body: "Declares UT-API-APPROVAL-001#TC-01.\n" });
    expect(claimDependencyEntries([feature, retired, selfClaim])).toEqual([]);
  });
});

describe("claim dependencies in a real repository", () => {
  it("is clean on the shipped fixture and reports the edge when it is removed, without blocking a baseline", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Add approval request behavior");
    await addApprovalFeature(root);

    const codes = async () => (await validateProject(root, await scanArtifacts(root))).findings.filter((finding) => finding.code === "CLAIM_WITHOUT_DEPENDENCY");
    expect(await codes()).toEqual([]);

    const spec = path.join(root, "04-verification", "unit-tests", "backend", "UT-API-APPROVAL-001.md");
    const source = await readFile(spec, "utf8");
    expect(source).toContain("FTR-APPROVAL-001#AC-01");
    await writeFile(spec, source.replace(/^depends_on:.*$/m, "depends_on: [TEST-POLICY, API-APPROVAL-001, ENT-APPROVAL-001]"), "utf8");

    const reported = await codes();
    expect(reported).toHaveLength(1);
    expect(reported[0]!.message).toContain("UT-API-APPROVAL-001");
    expect(reported[0]!.message).toContain("FTR-APPROVAL-001");
    // A judgement about which side is wrong, so never a gate.
    expect((await validateProject(root, await scanArtifacts(root))).valid).toBe(true);
    await createBaseline(root);
    await closeFlow(root);
  });
});
