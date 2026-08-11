import { afterEach, describe, expect, it } from "vitest";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { cleanup, establishGenesis, tempProject } from "./helpers.js";
import { addApprovalFeature, addSharedQueueFeature } from "./fixtures/complete-saas/fixture.js";
import { createBaseline } from "../src/core/baseline.js";
import { closeFlow, startFlow } from "../src/core/state.js";
import { scanArtifacts } from "../src/core/artifacts.js";
import { validateProject } from "../src/core/validation.js";
import { loadBaseline } from "../src/core/project.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

const QUEUE_FEATURE = "02-product/features/FTR-QUEUE-001.md";
const QUEUE_DEPENDENTS = [
  "02-product/use-cases/UC-QUEUE-001.md", "02-product/flows/FLOW-QUEUE-001.md",
  "03-design/interfaces/API-QUEUE-001.md", "04-verification/unit-tests/backend/UT-API-QUEUE-001.md",
  "04-verification/integration-tests/IT-QUEUE-001.md", "04-verification/system-tests/ST-QUEUE-001.md"
];

async function setStatus(root: string, relatives: string[], from: string, to: string): Promise<void> {
  for (const relative of relatives) {
    const file = path.join(root, relative);
    const source = await readFile(file, "utf8");
    if (!source.includes(`status: ${from}`)) throw new Error(`${relative} is not ${from}`);
    await writeFile(file, source.replace(`status: ${from}`, `status: ${to}`), "utf8");
  }
}

async function findings(root: string, code: string) {
  return (await validateProject(root, await scanArtifacts(root))).findings.filter((item) => item.code === code);
}

/**
 * `deprecated` and `retired` were declared statuses that no run had ever
 * produced: the lifecycle claimed to support retirement with nothing observing
 * it. This drives the full path and the four guards that stand along it.
 */
describe("deprecation and retirement lifecycle", () => {
  it("carries an artifact from active through deprecated to retired, and holds the guards on the way", async () => {
    const root = await tempProject("approval-workflow-fixture", "Approval workflow SaaS for small agencies");
    roots.push(root);

    await establishGenesis(root);
    await startFlow(root, "evolution", "Add approval request behavior");
    await addApprovalFeature(root);
    expect((await createBaseline(root)).id).toBe("BL-001");
    await closeFlow(root);

    await startFlow(root, "evolution", "Add decisions from the shared review queue");
    await addSharedQueueFeature(root);
    expect((await createBaseline(root)).id).toBe("BL-002");
    await closeFlow(root);

    // 1. Deprecation is a first-class state, not a comment. The feature stops
    //    being active while everything downstream of it still works.
    await startFlow(root, "evolution", "Deprecate the shared review queue");
    await setStatus(root, [QUEUE_FEATURE], "active", "deprecated");
    expect(await findings(root, "LIFECYCLE_DEPENDENCY")).toEqual([]);
    const deprecated = await createBaseline(root);
    expect(deprecated.id).toBe("BL-003");
    expect(deprecated.artifacts.find((item) => item.id === "FTR-QUEUE-001")?.status).toBe("deprecated");
    await closeFlow(root);

    // 2. Retiring it while live artifacts still depend on it is refused, and the
    //    refusal names every dependent that has not moved.
    await startFlow(root, "evolution", "Retire the shared review queue");
    await setStatus(root, [QUEUE_FEATURE], "deprecated", "retired");
    const blocked = await findings(root, "LIFECYCLE_DEPENDENCY");
    expect(blocked.map((item) => item.message.split(" ")[0]).sort()).toEqual([
      "API-QUEUE-001", "FLOW-QUEUE-001", "IT-QUEUE-001", "ST-QUEUE-001", "UC-QUEUE-001", "UT-API-QUEUE-001"
    ]);
    expect(blocked.every((item) => item.severity === "error")).toBe(true);
    await expect(createBaseline(root)).rejects.toThrow("LIFECYCLE_DEPENDENCY");

    await setStatus(root, QUEUE_DEPENDENTS, "active", "retired");
    expect(await findings(root, "LIFECYCLE_DEPENDENCY")).toEqual([]);
    const retired = await createBaseline(root);
    expect(retired.id).toBe("BL-004");
    expect(retired.artifacts.filter((item) => item.status === "retired")).toHaveLength(QUEUE_DEPENDENTS.length + 1);
    await closeFlow(root);
    expect((await loadBaseline(root))?.artifacts.some((item) => item.id === "FTR-QUEUE-001")).toBe(true);

    // 3. A retired artifact is history. It may not be rewritten,
    const file = path.join(root, QUEUE_FEATURE);
    const preserved = await readFile(file, "utf8");
    await writeFile(file, `${preserved}\nRewritten after retirement.\n`, "utf8");
    expect((await findings(root, "IMMUTABLE_CHANGED")).map((item) => item.file)).toEqual([QUEUE_FEATURE]);
    await writeFile(file, preserved, "utf8");
    expect(await findings(root, "IMMUTABLE_CHANGED")).toEqual([]);

    // 4. and it may not be deleted in place of being retired.
    await rm(file);
    expect((await findings(root, "BASELINED_ARTIFACT_DELETED")).map((item) => item.file)).toEqual([QUEUE_FEATURE]);
    await writeFile(file, preserved, "utf8");
    expect((await validateProject(root, await scanArtifacts(root))).findings.some((item) => item.severity === "error")).toBe(false);
  });
});
