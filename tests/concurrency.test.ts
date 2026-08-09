import { afterEach, describe, expect, it } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { loadConfig } from "../src/core/config.js";
import { executeVerification } from "../src/core/verification.js";
import { closeFlow, startFlow } from "../src/core/state.js";
import { cleanup, establishGenesis, tempProject } from "./helpers.js";
import { initializeProject } from "../src/core/template.js";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import { pluginRoot } from "./helpers.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

describe("cross-operation serialization", () => {
  it("makes concurrent initialization an all-or-nothing first-writer operation", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "ai-saas-concurrent-init-"));
    roots.push(root);
    const template = path.join(pluginRoot, "resources/project-template");
    const attempts = await Promise.allSettled([
      initializeProject(root, template, "project-alpha", "Idea Alpha"),
      initializeProject(root, template, "project-beta", "Idea Beta")
    ]);
    expect(attempts.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((result) => result.status === "rejected")).toHaveLength(1);
    const config = YAML.parse(await readFile(path.join(root, "sdlc.config.yaml"), "utf8"));
    const original = await readFile(path.join(root, "01-discovery/original-idea.md"), "utf8");
    expect(original).toContain(config.project_id === "project-alpha" ? "Idea Alpha" : "Idea Beta");
    expect(original).not.toContain(config.project_id === "project-alpha" ? "Idea Beta" : "Idea Alpha");
  });

  it("prevents concurrent flows and reserves distinct concurrent execution IDs", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    const starts = await Promise.allSettled([
      startFlow(root, "evolution", "First concurrent intent"),
      startFlow(root, "evolution", "Second concurrent intent")
    ]);
    expect(starts.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(starts.filter((result) => result.status === "rejected")).toHaveLength(1);
    await closeFlow(root);

    await startFlow(root, "evolution", "Concurrent verification");
    const configFile = path.join(root, "sdlc.config.yaml");
    const config = YAML.parse(await readFile(configFile, "utf8"));
    config.verification.unit = [{ id: "serialized", cwd: ".", command: `node -e "setTimeout(() => process.exit(0), 100)"` }];
    await writeFile(configFile, YAML.stringify(config), "utf8");
    const loaded = await loadConfig(root);
    const runs = await Promise.all([
      executeVerification(root, loaded, ["unit"]),
      executeVerification(root, loaded, ["unit"])
    ]);
    expect(runs.flat().map((record) => record.id).sort()).toEqual(["EXEC-001", "EXEC-002"]);
    expect(await readFile(path.join(root, ".ai-saas-sdlc/executions/EXEC-001.json"), "utf8")).toContain('"id": "EXEC-001"');
    expect(await readFile(path.join(root, ".ai-saas-sdlc/executions/EXEC-002.json"), "utf8")).toContain('"id": "EXEC-002"');
  });
});
