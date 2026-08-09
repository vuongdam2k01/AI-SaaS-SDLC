import { afterEach, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cleanup, establishGenesis, tempProject } from "./helpers.js";
import { scanArtifacts } from "../src/core/artifacts.js";
import { acceptanceCoverage, evidenceClaimCoverage } from "../src/core/coverage-derivation.js";
import { addApprovalFeature } from "./fixtures/complete-saas/fixture.js";
import { createBaseline } from "../src/core/baseline.js";
import { closeFlow, startFlow } from "../src/core/state.js";
import { refreshProject } from "../src/core/project.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

describe("evidence and acceptance coverage projections", () => {
  it("projects fixture evidence to the canonical claims that consume it", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    const projection = evidenceClaimCoverage(await scanArtifacts(root));
    expect(projection).toContain("`EVD-FIXTURE-001`");
    expect(projection).toContain("`CUSTOMER-AND-PROBLEM`");
    expect(projection).toContain("`OPPORTUNITY-DEFINITION`");
    expect(projection).toContain("consumed");
    expect(projection).not.toContain("https://example.com/public-source");
  });

  it("projects each feature criterion through behavior, conditional design, and UT/IT/ST", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Add approval behavior");
    await addApprovalFeature(root);
    const projection = acceptanceCoverage(await scanArtifacts(root));
    for (const criterion of ["AC-01", "AC-02", "AC-03"]) {
      expect(projection).toContain(`FTR-APPROVAL-001#${criterion}`);
    }
    expect(projection).toContain("`UC-APPROVAL-001`");
    expect(projection).toContain("`SCR-APPROVAL-001`");
    expect(projection).toContain("`UT-API-APPROVAL-001`");
    expect(projection).toContain("`IT-APPROVAL-001`");
    expect(projection).toContain("`ST-APPROVAL-001`");
    expect(projection).not.toContain("| gap |");
  });

  it("writes byte-stable coverage projections after a verified successor baseline", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Add approval behavior");
    await addApprovalFeature(root);
    expect((await createBaseline(root)).id).toBe("BL-001");
    await closeFlow(root);
    const acceptanceFile = path.join(root, "generated", "acceptance-coverage.md");
    const evidenceFile = path.join(root, "generated", "evidence-claim-coverage.md");
    const before = [await readFile(acceptanceFile, "utf8"), await readFile(evidenceFile, "utf8")];
    expect(await refreshProject(root, true)).toEqual([]);
    expect([await readFile(acceptanceFile, "utf8"), await readFile(evidenceFile, "utf8")]).toEqual(before);
  });
});
