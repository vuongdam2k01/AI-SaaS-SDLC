import { cp, mkdir, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import fg from "fast-glob";

const pluginRoot = process.cwd();
const packageManifest = JSON.parse(await readFile("package.json", "utf8"));
const pluginManifest = JSON.parse(await readFile(".claude-plugin/plugin.json", "utf8"));
const codexManifest = JSON.parse(await readFile(".codex-plugin/plugin.json", "utf8"));
const marketplaceManifest = JSON.parse(await readFile(".claude-plugin/marketplace.json", "utf8"));
const schemaFiles = await fg("schemas/*.schema.json");
for (const file of schemaFiles) JSON.parse(await readFile(file, "utf8"));
const hooksManifest = JSON.parse(await readFile("hooks/hooks.json", "utf8"));

function assertInsidePlugin(candidate, source) {
  const relative = path.relative(pluginRoot, path.resolve(candidate));
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`Path escapes plugin root in ${source}: ${candidate}`);
}

const required = [
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  ".codex-plugin/plugin.json",
  "hooks/hooks.json",
  "bin/ai-saas-sdlc",
  "dist/hooks/session-start.mjs",
  "dist/hooks/pre-tool-use.mjs",
  "dist/hooks/stop.mjs"
];

for (const file of required) await stat(file);

const marketplacePlugin = marketplaceManifest.plugins?.find((plugin) => plugin.name === pluginManifest.name);
if (!marketplacePlugin || packageManifest.version !== pluginManifest.version || pluginManifest.version !== marketplacePlugin.version || pluginManifest.version !== codexManifest.version) {
  throw new Error("package.json, Claude/Codex plugin manifests and marketplace versions must match");
}
// The CLI reports its own version literal; releases have forgotten it before,
// so the four JSON manifests alone are not enough of a cross-check.
const cliVersion = (await readFile("src/cli/main.ts", "utf8")).match(/\.version\("([^"]+)"\)/)?.[1];
if (cliVersion !== packageManifest.version) {
  throw new Error(`src/cli/main.ts .version("${cliVersion}") must match package.json version ${packageManifest.version}`);
}
if (codexManifest.skills !== "./codex/skills/") throw new Error("Codex manifest must use the dedicated Codex skill adapters under codex/skills/");
if (codexManifest.hooks !== undefined && codexManifest.hooks !== "./hooks/hooks.json") throw new Error("Codex hook override must use the shared portable hook path");
if (pluginManifest.skills !== "./claude/skills/") throw new Error("Claude manifest must use the dedicated manual Claude skill adapters");
for (const unsupported of ["mcpServers", "apps"]) if (unsupported in codexManifest) throw new Error(`Unsupported Codex manifest field: ${unsupported}`);
for (const [event, groups] of Object.entries(hooksManifest.hooks ?? {})) {
  if (!Array.isArray(groups)) throw new Error(`Hook event ${event} must contain matcher groups`);
  for (const group of groups) for (const handler of group.hooks ?? []) {
    if (typeof handler.command !== "string" || handler.command.trim() === "" || "args" in handler) throw new Error(`Hook ${event} must use a single portable command string`);
  }
}

for (const forbidden of ["agents", ".mcp.json", ".claude/settings.json", "settings.json"]) {
  try {
    await stat(forbidden);
    throw new Error(`Forbidden installed component found: ${forbidden}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) throw error;
  }
}

const textFiles = await fg(["codex/skills/**/*.{md,yaml}", "claude/skills/**/*.md", "hooks/**/*.json", ".claude-plugin/*.json", ".codex-plugin/*.json", "resources/{flow-playbooks,protocols}/**/*.md"]);
for (const file of textFiles) {
  const content = await readFile(file, "utf8");
  for (const match of content.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^(?:https?:|#)/.test(target)) continue;
    assertInsidePlugin(path.resolve(path.dirname(path.resolve(file)), target), file);
  }
  for (const match of content.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([^"'\s]+)/g)) {
    assertInsidePlugin(path.resolve(pluginRoot, match[1]), file);
  }
}

const claudeSkills = await fg("claude/skills/*/SKILL.md");
if (claudeSkills.length !== 5) throw new Error(`Expected 5 Claude skills, found ${claudeSkills.length}`);
for (const file of claudeSkills) {
  const content = await readFile(file, "utf8");
  if (!/^---\r?\n[\s\S]*?disable-model-invocation:\s*true\r?\n---/m.test(content)) throw new Error(`Skill must be manual: ${file}`);
}

const codexSkills = await fg("codex/skills/*/SKILL.md");
if (codexSkills.length !== 5) throw new Error(`Expected 5 Codex skills, found ${codexSkills.length}`);
for (const file of codexSkills) {
  const content = await readFile(file, "utf8");
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter || !/^name:\s*\S+/m.test(frontmatter[1]) || !/^description:\s*.+/m.test(frontmatter[1])) throw new Error(`Codex skill metadata is incomplete: ${file}`);
  for (const forbidden of ["disable-model-invocation", "argument-hint", "allowed-tools"]) if (frontmatter[1].includes(forbidden)) throw new Error(`Claude-only metadata in Codex skill: ${file}`);
  await stat(path.join(path.dirname(file), "agents", "openai.yaml"));
}

const patterns = await fg("resources/artifact-patterns/**/*.pattern.md");
if (patterns.length !== 24) throw new Error(`Expected 24 one-artifact patterns, found ${patterns.length}`);
for (const file of patterns) {
  const content = await readFile(file, "utf8");
  if (!content.includes("<!-- Contract:")) throw new Error(`Pattern authority contract is missing: ${file}`);
  if (!/^## (?:Completion|Supersession|Integrity|Lifecycle and closure) contract\s*$/m.test(content)) throw new Error(`Pattern completion/lifecycle contract is missing: ${file}`);
}
if ((await fg("resources/project-template/00-system/templates/**")).length > 0) throw new Error("Obsolete 00-system/templates path must not be packaged");

const vitestConfig = await readFile("vitest.config.ts", "utf8");
if (!/testTimeout:\s*\d[\d_]*/.test(vitestConfig) || !/hookTimeout:\s*\d[\d_]*/.test(vitestConfig)) {
  throw new Error("vitest.config.ts must declare the single test and hook timeout budget");
}
for (const script of ["test", "test:coverage", "check"]) {
  if (/--(?:test|hook)Timeout/.test(packageManifest.scripts?.[script] ?? "")) throw new Error(`Script ${script} must not override the declared vitest timeout budget`);
}
for (const file of await fg("tests/**/*.test.ts")) {
  const content = await readFile(file, "utf8");
  if (/^\s*\}(?:\))?,\s*\d[\d_]*\);\s*$/m.test(content)) throw new Error(`Per-case timeout literals reintroduce parallel-run flakiness: ${file}`);
}

const isolatedParent = await mkdtemp(path.join(os.tmpdir(), "ai-saas-package "));
try {
  const isolatedPlugin = path.join(isolatedParent, "installed plugin");
  const isolatedDocs = path.join(isolatedParent, "docs repo");
  await mkdir(isolatedPlugin, { recursive: true });
  await mkdir(isolatedDocs, { recursive: true });
  for (const item of [".claude-plugin", ".codex-plugin", "codex", "claude", "hooks", "resources", "schemas", "bin", "dist", "LICENSE", "README.md"]) {
    await cp(path.join(pluginRoot, item), path.join(isolatedPlugin, item), { recursive: true });
  }
  const run = (args) => spawnSync(process.execPath, [path.join(isolatedPlugin, "bin", "ai-saas-sdlc"), ...args], {
    cwd: isolatedDocs,
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: isolatedPlugin }
  });
  const initialized = run(["init", "--project-id", "isolated-package", "--idea", "Portable fixture"]);
  if (initialized.status !== 0) throw new Error(`Isolated plugin init failed: ${initialized.stderr}`);
  const validated = run(["validate", "--all", "--json"]);
  if (validated.status !== 0) throw new Error(`Isolated plugin validation failed: ${validated.stdout}${validated.stderr}`);
  const refreshed = run(["refresh", "--check", "--json"]);
  if (refreshed.status !== 0) throw new Error(`Isolated plugin projection check failed: ${refreshed.stdout}${refreshed.stderr}`);
  await stat(path.join(isolatedDocs, "00-system", "patterns", "catalog.yaml"));
  if ((await fg("00-system/templates/**", { cwd: isolatedDocs })).length > 0) throw new Error("Initialized project retained obsolete templates path");

  const codexDocs = path.join(isolatedParent, "codex docs repo");
  await mkdir(codexDocs, { recursive: true });
  const codexEnv = { ...process.env, CODEX_PLUGIN_ROOT: isolatedPlugin };
  delete codexEnv.CLAUDE_PLUGIN_ROOT;
  const codexRun = (args) => spawnSync(process.execPath, [path.join(isolatedPlugin, "bin", "ai-saas-sdlc"), ...args], {
    cwd: codexDocs,
    encoding: "utf8",
    env: codexEnv
  });
  const codexInitialized = codexRun(["init", "--project-id", "isolated-codex", "--idea", "Portable Codex fixture"]);
  if (codexInitialized.status !== 0) throw new Error(`Isolated Codex-root init failed: ${codexInitialized.stderr}`);
  const listed = codexRun(["patterns", "list", "--json"]);
  if (listed.status !== 0 || JSON.parse(listed.stdout).patterns?.length !== 24) throw new Error(`Isolated pattern listing failed: ${listed.stdout}${listed.stderr}`);

  const installedHooks = JSON.parse(await readFile(path.join(isolatedPlugin, codexManifest.hooks ?? "hooks/hooks.json"), "utf8"));
  const runInstalledHook = (event, input) => {
    const handler = installedHooks.hooks[event][0].hooks[0];
    const command = handler.command.replaceAll("${CLAUDE_PLUGIN_ROOT}", isolatedPlugin).replaceAll("${PLUGIN_ROOT}", isolatedPlugin);
    return spawnSync(command, {
      cwd: codexDocs,
      encoding: "utf8",
      input: JSON.stringify(input),
      shell: true,
      env: { ...process.env, CLAUDE_PLUGIN_ROOT: isolatedPlugin, PLUGIN_ROOT: isolatedPlugin }
    });
  };
  const sessionHook = runInstalledHook("SessionStart", { cwd: codexDocs, hook_event_name: "SessionStart", source: "startup", permission_mode: "default" });
  if (sessionHook.status !== 0 || JSON.parse(sessionHook.stdout).hookSpecificOutput?.hookEventName !== "SessionStart") throw new Error(`Installed SessionStart hook failed: ${sessionHook.stdout}${sessionHook.stderr}`);
  const patchHook = runInstalledHook("PreToolUse", { cwd: codexDocs, hook_event_name: "PreToolUse", tool_name: "apply_patch", tool_input: { command: "*** Begin Patch\n*** Update File: generated/artifact-index.md\n@@\n-old\n+new\n*** End Patch" } });
  if (patchHook.status !== 0 || JSON.parse(patchHook.stdout).hookSpecificOutput?.permissionDecision !== "deny") throw new Error(`Installed Codex apply_patch hook failed: ${patchHook.stdout}${patchHook.stderr}`);
  const stopHook = runInstalledHook("Stop", { cwd: codexDocs, hook_event_name: "Stop", stop_hook_active: false, permission_mode: "default" });
  if (stopHook.status !== 0 || stopHook.stdout !== "") throw new Error(`Installed Stop hook failed: ${stopHook.stdout}${stopHook.stderr}`);
} finally {
  await rm(isolatedParent, { recursive: true, force: true });
}

console.log(`Package check passed: ${claudeSkills.length} Claude skills, ${codexSkills.length} Codex skills, ${patterns.length} artifact patterns, ${schemaFiles.length} schemas, ${textFiles.length} metadata files.`);
