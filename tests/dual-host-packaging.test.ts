import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import YAML from "yaml";
import { pluginRoot } from "./helpers.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await rm(roots.pop()!, { recursive: true, force: true }); });

const FLOWS = ["genesis", "reassess-evidence", "evolve-product", "reconcile", "inspect-state"];

function runWithRoot(cwd: string, variable: "CODEX_PLUGIN_ROOT" | "CLAUDE_PLUGIN_ROOT", args: string[]) {
  const env = { ...process.env };
  delete env.CODEX_PLUGIN_ROOT;
  delete env.CLAUDE_PLUGIN_ROOT;
  env[variable] = pluginRoot;
  return spawnSync(process.execPath, [path.join(pluginRoot, "bin", "ai-saas-sdlc"), ...args], { cwd, encoding: "utf8", env });
}

function sharedPlaybook(source: string): string {
  const match = source.match(/\((\.\.\/)+resources\/flow-playbooks\/([a-z-]+\.md)\)/);
  if (!match) throw new Error("Host adapter does not reference a shared flow playbook.");
  return match[2]!;
}

describe("dual-host packaging", () => {
  it("ships equivalent Claude and Codex manifests and thin host adapters", async () => {
    const codex = JSON.parse(await readFile(path.join(pluginRoot, ".codex-plugin", "plugin.json"), "utf8"));
    const claude = JSON.parse(await readFile(path.join(pluginRoot, ".claude-plugin", "plugin.json"), "utf8"));
    expect({ name: codex.name, version: codex.version }).toEqual({ name: claude.name, version: claude.version });
    expect(codex.skills).toBe("./codex/skills/");
    expect(codex.hooks).toBeUndefined();
    expect(claude.skills).toBe("./claude/skills/");
    expect(claude.agents).toEqual([
      "./claude/agents/implementation-scout.md",
      "./claude/agents/spec-compliance-reviewer.md",
      "./claude/agents/implementation-debugger.md",
      "./claude/agents/implementation-counsel.md"
    ]);
    expect(codex.agents).toBeUndefined();

    const hooks = JSON.parse(await readFile(path.join(pluginRoot, "hooks", "hooks.json"), "utf8"));
    for (const groups of Object.values(hooks.hooks) as Array<Array<{ hooks: Array<Record<string, unknown>> }>>) {
      for (const group of groups) for (const handler of group.hooks) {
        expect(handler.command).toEqual(expect.any(String));
        expect(handler).not.toHaveProperty("args");
      }
    }

    for (const flow of FLOWS) {
      const codexName = flow === "reassess-evidence" ? "ai-saas-reassess-evidence" : `ai-saas-${flow}`;
      const codexSkill = await readFile(path.join(pluginRoot, "codex", "skills", codexName, "SKILL.md"), "utf8");
      const claudeSkill = await readFile(path.join(pluginRoot, "claude", "skills", flow, "SKILL.md"), "utf8");
      expect(sharedPlaybook(codexSkill)).toBe(sharedPlaybook(claudeSkill));
      expect(codexSkill).not.toContain("## Implementation Steps");
      expect(claudeSkill).not.toContain("## Implementation Steps");
    }
  });

  it("resolves the same 24-pattern catalog from isolated host root environments", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "dual-host-patterns-"));
    roots.push(root);
    const codex = runWithRoot(root, "CODEX_PLUGIN_ROOT", ["patterns", "list", "--json"]);
    const claude = runWithRoot(root, "CLAUDE_PLUGIN_ROOT", ["patterns", "list", "--json"]);
    expect(codex.status, codex.stderr).toBe(0);
    expect(claude.status, claude.stderr).toBe(0);
    const codexOutput = JSON.parse(codex.stdout);
    const claudeOutput = JSON.parse(claude.stdout);
    expect(codexOutput).toEqual(claudeOutput);
    expect(codexOutput.patterns).toHaveLength(24);
  });

  it("keeps every Codex UI descriptor bound to its installed skill name", async () => {
    for (const flow of FLOWS) {
      const directory = flow === "reassess-evidence" ? "ai-saas-reassess-evidence" : `ai-saas-${flow}`;
      const skill = await readFile(path.join(pluginRoot, "codex", "skills", directory, "SKILL.md"), "utf8");
      const frontmatter = YAML.parse(skill.match(/^---\r?\n([\s\S]*?)\r?\n---/)![1]!);
      const ui = YAML.parse(await readFile(path.join(pluginRoot, "codex", "skills", directory, "agents", "openai.yaml"), "utf8"));
      expect(ui.interface.default_prompt).toContain(`$${frontmatter.name}`);
    }
  });
});
