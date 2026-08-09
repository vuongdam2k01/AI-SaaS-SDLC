import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { pluginRoot } from "./helpers.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await rm(roots.pop()!, { recursive: true, force: true }); });

function cli(root: string, args: string[]) {
  return spawnSync(process.execPath, [path.join(pluginRoot, "bin", "ai-saas-sdlc"), ...args], { cwd: root, encoding: "utf8", env: { ...process.env, CLAUDE_PLUGIN_ROOT: pluginRoot } });
}

describe("CLI", () => {
  it("initializes and exposes machine-readable state from a path with spaces", async () => {
    const parent = await mkdtemp(path.join(os.tmpdir(), "ai sdlc "));
    const root = path.join(parent, "docs repo");
    await import("node:fs/promises").then(({ mkdir }) => mkdir(root));
    roots.push(parent);
    expect(cli(root, ["init", "--project-id", "agency-approval", "--idea", "Content approval SaaS"]).status).toBe(0);
    const state = cli(root, ["state", "--json"]);
    expect(state.status).toBe(0);
    expect(JSON.parse(state.stdout).current.project_id).toBe("agency-approval");
    expect(cli(root, ["validate", "--all", "--json"]).status).toBe(0);
    await writeFile(path.join(root, "generated", "manual.md"), "drift\n", "utf8");
    expect(cli(root, ["validate", "--all", "--json"]).status).toBe(1);
    expect(cli(root, ["refresh", "--json"]).status).toBe(0);
    expect(cli(root, ["validate", "--all", "--json"]).status).toBe(0);
    expect(cli(root, ["impact", "--json"]).status).toBe(0);
    expect(cli(root, ["tests", "select", "--json"]).status).toBe(0);
    expect(cli(root, ["migrate", "--check", "--json"]).status).toBe(0);
    expect(cli(root, ["verify", "--all", "--execute", "--json"]).status).toBe(1);
    expect(cli(root, ["flow", "start", "--type", "genesis", "--input", "Content approval SaaS"]).status).toBe(0);
    expect(cli(root, ["refresh", "--check", "--json"]).status).toBe(0);
    expect(cli(root, ["flow", "close", "--json"]).status).toBe(0);
  });
});
