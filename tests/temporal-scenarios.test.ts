import { afterEach, describe, expect, it } from "vitest";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { cleanup, establishGenesis, tempProject } from "./helpers.js";
import { createBaseline, syncRepresentationChanges } from "../src/core/baseline.js";
import { executeVerification } from "../src/core/verification.js";
import { loadBaseline, projectSnapshot, refreshProject } from "../src/core/project.js";
import { loadConfig } from "../src/core/config.js";
import { loadCurrentState, closeFlow, startFlow } from "../src/core/state.js";
import { scanArtifacts } from "../src/core/artifacts.js";
import { validateProject } from "../src/core/validation.js";
import { addApprovalFeature, addSharedQueueFeature, materializePatternArtifact } from "./fixtures/complete-saas/fixture.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

async function setStatus(root: string, relatives: string[], status: string): Promise<void> {
  for (const relative of relatives) {
    const file = path.join(root, relative);
    await writeFile(file, (await readFile(file, "utf8")).replace("status: active", `status: ${status}`), "utf8");
  }
}

describe("realistic temporal product lifecycle", () => {
  it("retains evidence, decisions, failures, successors, retirement history, and impact across time", async () => {
    const root = await tempProject("approval-workflow-fixture", "Approval workflow SaaS for small agencies");
    roots.push(root);

    await establishGenesis(root);
    expect((await loadBaseline(root))?.id).toBe("BL-000");
    expect((await loadBaseline(root))?.evidence_revision).toBe("EVR-001");
    expect((await scanArtifacts(root)).some((item) => item.artifact_type === "feature")).toBe(false);

    const requirements = path.join(root, "02-product", "product-requirements.md");
    const beforeTone = await loadBaseline(root);
    await writeFile(requirements, (await readFile(requirements, "utf8")).replace("# Product Requirements", "# Product requirements"), "utf8");
    expect(await syncRepresentationChanges(root)).toEqual(["PRODUCT-REQUIREMENTS"]);
    expect((await loadBaseline(root))?.id).toBe(beforeTone?.id);
    expect((await projectSnapshot(root)).impact.direct).toEqual([]);

    await startFlow(root, "reassessment", "Has the fixture pricing assumption changed?");
    const ledger = path.join(root, "01-discovery", "evidence-ledger.md");
    await writeFile(ledger, `${await readFile(ledger, "utf8")}\n## EVD-FIXTURE-002\n\n- URL: https://pricing.example.invalid/synthetic-plan-page\n- Fixture status: Synthetic pricing signal only; no public research claim.\n`, "utf8");
    const reassessed = await createBaseline(root);
    expect(reassessed.id).toBe("BL-000");
    expect(reassessed.evidence_revision).toBe("EVR-002");
    expect((await scanArtifacts(root)).some((item) => item.artifact_type === "feature")).toBe(false);
    await closeFlow(root);

    await startFlow(root, "evolution", "Add approval request behavior");
    await addApprovalFeature(root);
    const firstFeatureBaseline = await createBaseline(root);
    expect(firstFeatureBaseline.id).toBe("BL-001");
    expect(firstFeatureBaseline.artifacts.map((item) => item.id)).toEqual(expect.arrayContaining([
      "FTR-APPROVAL-001", "UC-APPROVAL-001", "FLOW-APPROVAL-001", "SCR-APPROVAL-001",
      "API-APPROVAL-001", "ENT-APPROVAL-001", "UT-API-APPROVAL-001", "IT-APPROVAL-001", "ST-APPROVAL-001"
    ]));
    await closeFlow(root);

    await startFlow(root, "evolution", "Add decisions from the shared review queue");
    const sharedEntity = path.join(root, "03-design", "data", "ENT-APPROVAL-001.md");
    await writeFile(sharedEntity, (await readFile(sharedEntity, "utf8")).replace(
      "version and one-decision constraint", "version, queue visibility, and one-decision constraint"
    ), "utf8");
    await addSharedQueueFeature(root);
    const sharedImpact = (await projectSnapshot(root)).impact;
    expect(sharedImpact.affected).toEqual(expect.arrayContaining([
      "FTR-APPROVAL-001", "API-APPROVAL-001", "UT-API-APPROVAL-001", "IT-APPROVAL-001", "ST-APPROVAL-001"
    ]));
    expect((await createBaseline(root)).id).toBe("BL-002");
    await closeFlow(root);

    const decisionFlow = await startFlow(root, "evolution", "Choose approval consistency model");
    await materializePatternArtifact(root, {
      type: "architectural_decision", id: "ADR-APPROVAL-001", title: "Approval consistency model",
      dependsOn: ["ARCHITECTURE-OVERVIEW", "API-APPROVAL-001"], adrStatus: "accepted"
    });
    const approvalApi = path.join(root, "03-design", "interfaces", "API-APPROVAL-001.md");
    await writeFile(approvalApi, (await readFile(approvalApi, "utf8")).replace("decisions: []", "decisions: [ADR-APPROVAL-001]"), "utf8");
    expect(decisionFlow.change_id).toBe("CHG-003");
    expect((await createBaseline(root)).id).toBe("BL-003");
    await closeFlow(root);

    const oldAdr = path.join(root, "05-control", "decisions", "ADR-APPROVAL-001.md");
    const oldAdrContent = await readFile(oldAdr, "utf8");
    await writeFile(oldAdr, `${oldAdrContent}\nUnauthorized rewrite.\n`, "utf8");
    expect((await validateProject(root, await scanArtifacts(root))).findings.some((item) => item.code === "IMMUTABLE_CHANGED")).toBe(true);
    await writeFile(oldAdr, oldAdrContent, "utf8");

    await startFlow(root, "evolution", "Supersede the consistency model");
    await materializePatternArtifact(root, {
      type: "architectural_decision", id: "ADR-APPROVAL-002", title: "Approval consistency successor",
      dependsOn: ["ARCHITECTURE-OVERVIEW", "API-APPROVAL-001"], adrStatus: "accepted", supersedes: "ADR-APPROVAL-001"
    }, { "ADR-APPROVAL-001": "ADR-APPROVAL-002", "optimistic request version": "atomic compare-and-set request version" });
    await writeFile(approvalApi, (await readFile(approvalApi, "utf8")).replace("decisions: [ADR-APPROVAL-001]", "decisions: [ADR-APPROVAL-002]"), "utf8");
    expect((await createBaseline(root)).id).toBe("BL-004");
    await closeFlow(root);
    expect(await readFile(path.join(root, "generated", "decision-impact", "ADR-APPROVAL-001.md"), "utf8")).toContain("ADR-APPROVAL-002");

    await startFlow(root, "evolution", "Retire review queue behavior");
    const queueFiles = [
      "02-product/features/FTR-QUEUE-001.md", "02-product/use-cases/UC-QUEUE-001.md", "02-product/flows/FLOW-QUEUE-001.md",
      "03-design/interfaces/API-QUEUE-001.md", "04-verification/unit-tests/backend/UT-API-QUEUE-001.md",
      "04-verification/integration-tests/IT-QUEUE-001.md", "04-verification/system-tests/ST-QUEUE-001.md"
    ];
    await setStatus(root, queueFiles, "retired");
    expect((await createBaseline(root)).id).toBe("BL-005");
    await closeFlow(root);
    expect((await loadCurrentState(root)).id_registry["FTR-QUEUE-001"]).toBe(queueFiles[0]);
    const retiredFeature = path.join(root, queueFiles[0]!);
    const retiredContent = await readFile(retiredFeature, "utf8");
    await rm(retiredFeature);
    expect((await validateProject(root, await scanArtifacts(root))).findings.some((item) => item.code === "BASELINED_ARTIFACT_DELETED")).toBe(true);
    await writeFile(retiredFeature, retiredContent, "utf8");

    const fake = path.join(root, "04-verification", "results", "RESULT-EXEC-999.md");
    await writeFile(fake, "---\nid: RESULT-EXEC-999\nartifact_type: test_result\ntitle: Forged pass\nstatus: active\ncreated_by_change: INIT\ndepends_on: [IT-APPROVAL-001]\ndecisions: []\nsupersedes:\nexecution_id: EXEC-999\n---\n# Forged pass\n", "utf8");
    expect((await validateProject(root, await scanArtifacts(root))).findings.some((item) => ["RESULT_WITHOUT_EXECUTION", "RESULT_BINDING_INVALID"].includes(item.code))).toBe(true);
    await rm(fake);

    const reconciliation = await startFlow(root, "reconciliation", "Integration execution contradicted the decision contract");
    const configFile = path.join(root, "sdlc.config.yaml");
    const config = YAML.parse(await readFile(configFile, "utf8"));
    config.verification.integration = [{ id: "integration-fixture", cwd: ".", command: `node -e "process.exit(1)"` }];
    await writeFile(configFile, YAML.stringify(config), "utf8");
    expect((await executeVerification(root, await loadConfig(root), ["integration"]))[0]!.exit_code).toBe(1);
    await materializePatternArtifact(root, {
      type: "issue", id: "ISS-APPROVAL-001", title: "Decision transaction mismatch",
      dependsOn: ["IT-APPROVAL-001", "API-APPROVAL-001", "ADR-APPROVAL-002"]
    });
    await expect(createBaseline(root)).rejects.toThrow("verification command failed");
    config.verification.integration[0]!.command = `node -e "process.exit(0)"`;
    await writeFile(configFile, YAML.stringify(config), "utf8");
    expect((await executeVerification(root, await loadConfig(root), ["integration"]))[0]!.exit_code).toBe(0);
    const repaired = await createBaseline(root);
    expect(repaired.id).toBe("BL-006");
    expect(repaired.verification.integration).toBe("passed");
    expect(repaired.executions).toHaveLength(2);
    expect(reconciliation.change_id).toBe("CHG-006");
    await closeFlow(root);

    expect((await validateProject(root, await scanArtifacts(root))).valid).toBe(true);
    expect(await refreshProject(root, true)).toEqual([]);
  });
});
