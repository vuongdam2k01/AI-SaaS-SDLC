import { afterEach, describe, expect, it } from "vitest";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { cleanup, establishGenesis, tempProject } from "./helpers.js";
import { loadConfig } from "../src/core/config.js";
import { executeVerification } from "../src/core/verification.js";
import { startFlow } from "../src/core/state.js";
import { pathExists } from "../src/core/state.js";
import { refreshProject } from "../src/core/project.js";
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
    config.verification.unit = [{ id: "unit-suite", cwd: ".", command: `node -e "process.exit(0)"` }];
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

describe("implementation projections", () => {
  it("emits nothing for a repository without implementation sources", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Docs-only feature");
    await addApprovalFeature(root);
    await refreshProject(root, false);
    expect(await pathExists(path.join(root, "generated", "implementation-coverage.md"))).toBe(false);
    expect(await pathExists(path.join(root, "generated", "implementation-plan"))).toBe(false);
  });

  it("derives the dashboard through the same predicates as the warnings", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Implement approval, code segment");
    await addApprovalFeature(root);
    await wireSource(root);
    await refreshProject(root, false);
    let dashboard = await readFile(path.join(root, "generated", "implementation-coverage.md"), "utf8");
    expect(dashboard).toContain("| `FTR-APPROVAL-001` | 0/2 | 0/1 | 0/1 | 0/1 | — | unmapped |");
    expect(dashboard).toContain("`SCR-APPROVAL-001`");
    await mapArtifact(root, "03-design/interfaces/API-APPROVAL-001.md", ["app:src/approval-decision.ts"]);
    await executeVerification(root, await loadConfig(root), ["unit"]);
    await refreshProject(root, false);
    dashboard = await readFile(path.join(root, "generated", "implementation-coverage.md"), "utf8");
    expect(dashboard).toContain("| `FTR-APPROVAL-001` | 1/2 | 0/1 | 0/1 | 0/1 | — | partial: UT, IT, ST unproven |");
    expect(dashboard).toContain("| UT | `unit-suite` | `EXEC-001` | 0 |");
    // The mapped API leaves the unmapped-artifact complement; the screen stays.
    expect(dashboard).not.toMatch(/\| `API-APPROVAL-001` \| api_processing \|/);
    expect(dashboard).toMatch(/\| `SCR-APPROVAL-001` \| screen \|/);
  });

  it("renders one work packet per active feature joining closure, foundations, specs and commands", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Implement approval");
    await addApprovalFeature(root);
    await wireSource(root);
    await mapArtifact(root, "03-design/interfaces/API-APPROVAL-001.md", ["app:src/approval-decision.ts"]);
    await refreshProject(root, false);
    const packet = await readFile(path.join(root, "generated", "implementation-plan", "FTR-APPROVAL-001.md"), "utf8");
    expect(packet).toContain("# Implementation Plan: FTR-APPROVAL-001");
    expect(packet).toContain("## Closure in dependency order");
    expect(packet).toContain("`API-APPROVAL-001`");
    expect(packet).toContain("`app:src/approval-decision.ts`");
    expect(packet).toContain("#### `UT-API-APPROVAL-001`");
    expect(packet).toContain("| TC-");
    expect(packet).toContain("## Configured verification commands");
    expect(packet).toContain("`unit-suite`");
    // Dependency order puts the entity before the API that writes to it, and
    // the API before the screen that depends on it.
    const entity = packet.indexOf("| `ENT-APPROVAL-001` |");
    const api = packet.indexOf("| `API-APPROVAL-001` |");
    const screen = packet.indexOf("| `SCR-APPROVAL-001` |");
    expect(entity).toBeGreaterThan(-1);
    expect(api).toBeGreaterThan(entity);
    expect(screen).toBeGreaterThan(api);
  });
});
