import { afterEach, describe, expect, it } from "vitest";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { cleanup, establishGenesis, tempProject } from "./helpers.js";
import { loadConfig } from "../src/core/config.js";
import { executeVerification } from "../src/core/verification.js";
import { createBaseline } from "../src/core/baseline.js";
import { closeFlow, loadActiveFlow, startFlow } from "../src/core/state.js";
import { flowGuidance } from "../src/core/flow-guidance.js";
import { isActiveFlow } from "../src/core/record-validation.js";
import { addApprovalFeature } from "./fixtures/complete-saas/fixture.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

async function patchConfig(root: string, mutate: (config: Record<string, any>) => void): Promise<void> {
  const file = path.join(root, "sdlc.config.yaml");
  const config = YAML.parse(await readFile(file, "utf8"));
  mutate(config);
  await writeFile(file, YAML.stringify(config), "utf8");
}

async function wireSource(root: string): Promise<void> {
  await mkdir(path.join(root, "app", "src"), { recursive: true });
  await patchConfig(root, (config) => {
    config.implementation_sources = [{ id: "app", path: "./app" }];
    config.verification = {
      unit: [{ id: "unit-suite", cwd: ".", command: `node -e "process.exit(0)"` }],
      integration: [{ id: "integration-suite", cwd: ".", command: `node -e "process.exit(0)"` }],
      system: [{ id: "system-suite", cwd: ".", command: `node -e "process.exit(0)"` }]
    };
  });
}

async function mapArtifact(root: string, artifactRelativeFile: string, mappings: string[]): Promise<void> {
  for (const mapping of mappings) {
    const target = path.join(root, "app", mapping.slice(mapping.indexOf(":") + 1));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, "// implementation fixture\n", "utf8");
  }
  const file = path.join(root, artifactRelativeFile);
  const source = (await readFile(file, "utf8")).replace(/\r\n/g, "\n");
  const value = `implementation: [${mappings.map((mapping) => `"${mapping}"`).join(", ")}]`;
  const patched = /^implementation:.*$/m.test(source)
    ? source.replace(/^implementation:.*$/m, value)
    : source.replace(/\n---\n/, `\n${value}\n---\n`);
  await writeFile(file, patched, "utf8");
}

describe("implementation intent", () => {
  it("records the intent on an evolution flow, validates it, and routes flow next through the implement skill", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    const flow = await startFlow(root, "evolution", "implement FTR-APPROVAL-001, segment code", undefined, "implementation");
    expect(flow.intent).toBe("implementation");
    const persisted = await loadActiveFlow(root);
    expect(persisted?.intent).toBe("implementation");
    expect(isActiveFlow(persisted)).toBe(true);
    const guidance = await flowGuidance(root);
    // The implement skill's grammar is positional, so the continuation must
    // carry the feature and segment recovered from the flow's verbatim input.
    expect(guidance.next_command).toBe(`/ai-saas-sdlc:implement FTR-APPROVAL-001 code --until behavior continue ${flow.id}`);
    await closeFlow(root);
  });

  it("rejects an intent outside evolution and an unknown intent", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await expect(startFlow(root, "reconciliation", "repair", undefined, "implementation")).rejects.toThrow("rides Product Evolution");
    await expect(startFlow(root, "evolution", "anything", undefined, "refactor")).rejects.toThrow("Unsupported flow intent");
  });

  it("suggests the next segment from the warning ledger, and only when sources are configured", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Add approval feature");
    await addApprovalFeature(root);
    await createBaseline(root);
    await closeFlow(root);
    // Unwired: no suggestion field at all.
    expect((await flowGuidance(root)).suggested_segment).toBeUndefined();
    // Wired with everything unmapped: the code segment leads.
    await startFlow(root, "evolution", "wire the codebase");
    await wireSource(root);
    await executeVerification(root, await loadConfig(root), ["unit", "integration", "system"]);
    await createBaseline(root);
    await closeFlow(root);
    const unmapped = await flowGuidance(root);
    expect(unmapped.suggested_segment).toEqual({
      feature: "FTR-APPROVAL-001",
      segment: "code",
      reason: expect.stringContaining("2 of 2 design artifact(s) unmapped")
    });
    // Design fully mapped: the first unproven level leads.
    await startFlow(root, "evolution", "implement FTR-APPROVAL-001, segment code", undefined, "implementation");
    await mapArtifact(root, "03-design/interfaces/API-APPROVAL-001.md", ["app:src/approval-decision.ts"]);
    await mapArtifact(root, "03-design/screens/SCR-APPROVAL-001.md", ["app:src/approval-screen.ts"]);
    await executeVerification(root, await loadConfig(root), ["unit", "integration", "system"]);
    await createBaseline(root);
    await closeFlow(root);
    const codeMapped = await flowGuidance(root);
    expect(codeMapped.suggested_segment).toEqual({
      feature: "FTR-APPROVAL-001",
      segment: "ut",
      reason: "UT, IT, ST specified but unproven"
    });
  });
});
