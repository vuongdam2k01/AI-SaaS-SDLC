import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readdir, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import YAML from "yaml";
import { scanArtifacts } from "../src/core/artifacts.js";
import { loadConfig } from "../src/core/config.js";
import { refreshProject } from "../src/core/project.js";
import { startFlow } from "../src/core/state.js";
import { executeVerification } from "../src/core/verification.js";
import { cleanup, establishGenesis, pluginRoot, tempProject } from "./helpers.js";
import { initializeProject } from "../src/core/template.js";
import { validateProject } from "../src/core/validation.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

describe("managed path safety", () => {
  it("keeps refresh check read-only when generated directories do not exist", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "ai-saas-read-only-"));
    roots.push(root);
    await initializeProject(root, path.join(pluginRoot, "resources/project-template"), "read-only", "Idea");
    expect((await refreshProject(root, true)).length).toBeGreaterThan(0);
    await expect(stat(path.join(root, "generated"))).rejects.toThrow();
  });

  it("rejects unsafe artifact IDs before projection filenames are formed", async () => {
    const root = await tempProject();
    roots.push(root);
    await writeFile(path.join(root, "05-control/issues/unsafe.md"), "---\nid: ../../../../OUTSIDE\nartifact_type: issue\ntitle: Unsafe\nstatus: active\ncreated_by_change: CHG-001\ndepends_on: []\ndecisions: []\nsupersedes:\n---\n# Unsafe\n", "utf8");
    await expect(scanArtifacts(root)).rejects.toThrow("Unsafe artifact ID");
    await expect(refreshProject(root, false)).rejects.toThrow("Unsafe artifact ID");
  });

  it("never follows a replacement generated directory outside the project", async () => {
    const root = await tempProject();
    const external = await mkdtemp(path.join(os.tmpdir(), "ai-saas-generated-external-"));
    roots.push(external, root);
    const sentinel = path.join(external, "sentinel.txt");
    await writeFile(sentinel, "unchanged", "utf8");
    await rm(path.join(root, "generated"), { recursive: true, force: true });
    await symlink(external, path.join(root, "generated"), process.platform === "win32" ? "junction" : "dir");
    await expect(refreshProject(root, false)).rejects.toThrow("symlinked directory");
    expect(await readFile(sentinel, "utf8")).toBe("unchanged");
  });

  it("never follows a managed-directory junction into canonical files inside the project", async () => {
    const root = await tempProject();
    roots.push(root);
    const original = path.join(root, "01-discovery/original-idea.md");
    const before = await readFile(original, "utf8");
    await symlink(path.join(root, "01-discovery"), path.join(root, "generated/decision-impact"), process.platform === "win32" ? "junction" : "dir");
    await expect(refreshProject(root, false)).rejects.toThrow("symlinked directory");
    expect(await readFile(original, "utf8")).toBe(before);
  });

  it("rejects an external execution directory before reserving or running", async () => {
    const root = await tempProject();
    const external = await mkdtemp(path.join(os.tmpdir(), "ai-saas-execution-external-"));
    roots.push(external, root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Test path confinement");
    const configFile = path.join(root, "sdlc.config.yaml");
    const config = YAML.parse(await readFile(configFile, "utf8"));
    config.verification.unit = [{ id: "must-not-run", cwd: ".", command: `node -e "process.exit(0)"` }];
    await writeFile(configFile, YAML.stringify(config), "utf8");
    const executionDirectory = path.join(root, ".ai-saas-sdlc/executions");
    await rm(executionDirectory, { recursive: true, force: true });
    await symlink(external, executionDirectory, process.platform === "win32" ? "junction" : "dir");
    await expect(executeVerification(root, await loadConfig(root), ["unit"])).rejects.toThrow("symlinked directory");
    expect(await readdir(external)).toEqual([]);
  });

  it("rejects individual internal-record symlinks without reading their target", async () => {
    const root = await tempProject();
    const external = await mkdtemp(path.join(os.tmpdir(), "ai-saas-record-external-"));
    roots.push(external, root);
    await symlink(external, path.join(root, ".ai-saas-sdlc/executions/EXEC-001.json"), process.platform === "win32" ? "junction" : "dir");
    const report = await validateProject(root, await scanArtifacts(root));
    expect(report.findings.some((finding) => finding.code === "INTERNAL_RECORD_SYMLINK")).toBe(true);
  });
});
