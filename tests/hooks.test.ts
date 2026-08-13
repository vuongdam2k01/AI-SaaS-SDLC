import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import YAML from "yaml";
import { cleanup, pluginRoot, tempProject } from "./helpers.js";
import { loadCurrentState, saveCurrentState, startFlow } from "../src/core/state.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

function hook(name: string, root: string, input: unknown): string {
  const result = spawnSync(process.execPath, [path.join(pluginRoot, "dist", "hooks", `${name}.mjs`)], {
    cwd: root,
    input: JSON.stringify(input),
    encoding: "utf8"
  });
  expect(result.status).toBe(0);
  return result.stdout;
}

function hookRaw(name: string, root: string, input: string): string {
  const result = spawnSync(process.execPath, [path.join(pluginRoot, "dist", "hooks", `${name}.mjs`)], { cwd: root, input, encoding: "utf8" });
  expect(result.status).toBe(0);
  return result.stdout;
}

async function fixture(name: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path.join(pluginRoot, "tests", "fixtures", "hooks", name), "utf8")) as Record<string, unknown>;
}

describe("hooks", () => {
  it("emits nothing in an uninitialized repository", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "uninitialized-sdlc-"));
    roots.push(root);
    expect(hook("session-start", root, {})).toBe("");
    expect(hookRaw("pre-tool-use", root, "{malformed")).toBe("");
  });

  it("passes through generated-path mutations in a repository the engine does not manage", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "unrelated-repo-"));
    roots.push(root);
    await mkdir(path.join(root, "generated"), { recursive: true });
    await writeFile(path.join(root, "generated", "x.md"), "# theirs\n", "utf8");
    expect(hook("pre-tool-use", root, { cwd: root, tool_name: "Write", tool_input: { file_path: "generated/x.md" } })).toBe("");
    expect(hook("pre-tool-use", root, { cwd: root, tool_name: "Bash", tool_input: { command: "git add generated/x.md" } })).toBe("");
    expect(hook("pre-tool-use", root, { cwd: root, tool_name: "Edit", tool_input: { file_path: "01-discovery/original-idea.md" } })).toBe("");
  });

  it("denies .ai-saas-sdlc fabrication even where the engine manages nothing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "unrelated-repo-"));
    roots.push(root);
    const direct = hook("pre-tool-use", root, { cwd: root, tool_name: "Write", tool_input: { file_path: ".ai-saas-sdlc/state/current.json" } });
    expect(JSON.parse(direct).hookSpecificOutput.permissionDecision).toBe("deny");
    const indirect = hook("pre-tool-use", root, { cwd: root, tool_name: "Bash", tool_input: { command: "node mutate.js .ai-saas-sdlc/state/current.json" } });
    expect(JSON.parse(indirect).hookSpecificOutput.permissionDecision).toBe("deny");
    const patch = hook("pre-tool-use", root, { cwd: root, tool_name: "apply_patch", tool_input: { command: "*** Begin Patch\n*** Add File: .ai-saas-sdlc/executions/EXEC-999.json\n@@\n+{}\n*** End Patch" } });
    expect(JSON.parse(patch).hookSpecificOutput.permissionDecision).toBe("deny");
  });

  it("emits the session summary when invoked with the compact source", async () => {
    const root = await tempProject();
    roots.push(root);
    const session = hook("session-start", root, { cwd: root, hook_event_name: "SessionStart", source: "compact", permission_mode: "default" });
    const parsed = JSON.parse(session);
    expect(parsed.hookSpecificOutput.hookEventName).toBe("SessionStart");
    expect(parsed.hookSpecificOutput.additionalContext).toContain("AI SaaS SDLC repository detected.");
  });

  it("blocks direct result and immutable input edits but allows editorial files", async () => {
    const root = await tempProject();
    roots.push(root);
    const session = hook("session-start", root, { cwd: root, hook_event_name: "SessionStart", source: "startup", permission_mode: "default" });
    expect(JSON.parse(session).hookSpecificOutput.hookEventName).toBe("SessionStart");
    const blocked = hook("pre-tool-use", root, { ...await fixture("pre-original-idea-edit.json"), cwd: root });
    expect(JSON.parse(blocked).hookSpecificOutput.permissionDecision).toBe("deny");
    const generated = hook("pre-tool-use", root, { cwd: root, tool_name: "Write", tool_input: { file_path: "generated/artifact-index.md" } });
    expect(JSON.parse(generated).hookSpecificOutput.permissionDecision).toBe("deny");
    const result = hook("pre-tool-use", root, { cwd: root, tool_name: "Edit", tool_input: { file_path: "04-verification/results/RESULT-EXEC-001.md" } });
    expect(JSON.parse(result).hookSpecificOutput.permissionDecision).toBe("deny");
    const internal = hook("pre-tool-use", root, { cwd: root, tool_name: "Write", tool_input: { file_path: ".ai-saas-sdlc/state/current.json" } });
    expect(JSON.parse(internal).hookSpecificOutput.permissionDecision).toBe("deny");
    const codexPatch = hook("pre-tool-use", root, { cwd: root, tool_name: "apply_patch", tool_input: { command: "*** Begin Patch\n*** Update File: generated/artifact-index.md\n@@\n-old\n+new\n*** End Patch" } });
    expect(JSON.parse(codexPatch).hookSpecificOutput.permissionDecision).toBe("deny");
    const codexMove = hook("pre-tool-use", root, { cwd: root, tool_name: "apply_patch", tool_input: { command: "*** Begin Patch\n*** Update File: 02-product/product-requirements.md\n*** Move to: 04-verification/results/RESULT-FORGED.md\n@@\n-old\n+new\n*** End Patch" } });
    expect(JSON.parse(codexMove).hookSpecificOutput.permissionDecision).toBe("deny");
    const internalBash = hook("pre-tool-use", root, { cwd: root, tool_name: "Bash", tool_input: { command: "node mutate.js .ai-saas-sdlc/state/current.json" } });
    expect(JSON.parse(internalBash).hookSpecificOutput.permissionDecision).toBe("deny");
    const indirectBash = hook("pre-tool-use", root, { cwd: root, tool_name: "Bash", tool_input: { command: `node -e "writeFileSync('.ai-' + 'saas-sdlc/state/current.json', 'x')"` } });
    expect(JSON.parse(indirectBash).hookSpecificOutput.permissionDecision).toBe("deny");
    const generatedBash = hook("pre-tool-use", root, { cwd: root, tool_name: "Bash", tool_input: { command: "rm -rf generated" } });
    expect(JSON.parse(generatedBash).hookSpecificOutput.permissionDecision).toBe("deny");
    expect(hook("pre-tool-use", root, { ...await fixture("pre-editorial-edit.json"), cwd: root })).toBe("");
    const adr = path.join(root, "05-control", "decisions", "ADR-TEST-001.md");
    await writeFile(adr, "---\nid: ADR-TEST-001\nartifact_type: architectural_decision\ntitle: Accepted\nstatus: active\nadr_status: accepted\ncreated_by_change: CHG-001\ndepends_on: []\ndecisions: []\nsupersedes:\n---\n# Accepted\n", "utf8");
    const bash = hook("pre-tool-use", root, { cwd: root, tool_name: "Bash", tool_input: { command: "Set-Content 05-control/decisions/ADR-TEST-001.md changed" } });
    expect(JSON.parse(bash).hookSpecificOutput.permissionDecision).toBe("deny");
  });

  it("allows the explicit empty-input placeholder to be captured once during Genesis", async () => {
    const root = await tempProject("placeholder-project", "");
    roots.push(root);
    await startFlow(root, "genesis", "Captured idea");
    const input = { ...await fixture("pre-original-idea-edit.json"), cwd: root };
    expect(hook("pre-tool-use", root, input)).toBe("");
  });

  it("Stop blocks a structural error once and avoids recursion", async () => {
    const root = await tempProject();
    roots.push(root);
    await startFlow(root, "genesis", "Initial behavior");
    await writeFile(path.join(root, "02-product", "features", "FTR-X-001.md"), "---\nid: FTR-X-001\nartifact_type: feature\ntitle: Broken\nstatus: active\ncreated_by_change: CHG-001\ndepends_on: [MISSING]\ndecisions: []\nsupersedes:\n---\n# Broken\n", "utf8");
    const first = hook("stop", root, await fixture("stop-normal.json"));
    expect(JSON.parse(first).decision).toBe("block");
    expect(hook("stop", root, await fixture("stop-recursive.json"))).toBe("");
    expect(hook("stop", root, await fixture("stop-normal.json"))).toBe("");
  });

  it("keeps configured implementation sources inside Evolution or Reconciliation", async () => {
    const root = await tempProject();
    roots.push(root);
    const sourceFile = path.join(root, "implementation-source", "service.ts");
    await import("node:fs/promises").then(({ mkdir }) => mkdir(path.dirname(sourceFile), { recursive: true }));
    await writeFile(sourceFile, "export const value = 1;\n", "utf8");
    const configFile = path.join(root, "sdlc.config.yaml");
    const config = YAML.parse(await readFile(configFile, "utf8"));
    config.implementation_sources = [{ id: "app", path: "implementation-source" }];
    await writeFile(configFile, YAML.stringify(config), "utf8");
    const input = { cwd: root, tool_name: "Read", tool_input: { file_path: sourceFile } };
    expect(JSON.parse(hook("pre-tool-use", root, input)).hookSpecificOutput.permissionDecision).toBe("deny");
    const state = await loadCurrentState(root);
    state.active_baseline = "BL-000";
    await saveCurrentState(root, state);
    await startFlow(root, "evolution", "Inspect configured code");
    expect(hook("pre-tool-use", root, input)).toBe("");
  });
});
