import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import YAML from "yaml";

const root = process.cwd();
const manifestPath = path.join(root, ".codex-plugin", "plugin.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} must be a non-empty string`);
}

for (const key of ["name", "version", "description", "skills"]) requireString(manifest[key], `plugin.${key}`);
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.name)) throw new Error("plugin.name must be kebab-case");
if (manifest.skills !== "./codex/skills/") throw new Error("plugin.skills must point to ./codex/skills/");
if (manifest.hooks !== undefined && manifest.hooks !== "./hooks/hooks.json") throw new Error("plugin.hooks, when present, must point to ./hooks/hooks.json");
for (const key of ["mcpServers", "apps"]) if (key in manifest) throw new Error(`Unsupported Codex plugin field: ${key}`);
for (const key of ["displayName", "shortDescription", "longDescription", "developerName", "category", "defaultPrompt"]) requireString(manifest.interface?.[key], `plugin.interface.${key}`);
if (manifest.interface.shortDescription.length < 25 || manifest.interface.shortDescription.length > 80) throw new Error("plugin.interface.shortDescription must be 25-80 characters");

const hooksPath = path.join(root, manifest.hooks ?? "hooks/hooks.json");
await stat(hooksPath);
const hookConfig = JSON.parse(await readFile(hooksPath, "utf8"));
for (const [event, groups] of Object.entries(hookConfig.hooks ?? {})) {
  if (!Array.isArray(groups)) throw new Error(`hooks.${event} must be an array`);
  for (const group of groups) for (const handler of group.hooks ?? []) {
    requireString(handler.command, `hooks.${event}.command`);
    if ("args" in handler) throw new Error(`hooks.${event} must use one portable command string`);
  }
}

const skills = await fg("codex/skills/*/SKILL.md", { cwd: root });
if (skills.length !== 6) throw new Error(`Expected six Codex skills; found ${skills.length}`);
for (const relative of skills) {
  const source = await readFile(path.join(root, relative), "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error(`Missing frontmatter: ${relative}`);
  const metadata = YAML.parse(match[1]);
  const keys = Object.keys(metadata).sort();
  if (keys.join(",") !== "description,name") throw new Error(`Codex skill frontmatter may contain only name and description: ${relative}`);
  requireString(metadata.name, `${relative}.name`);
  requireString(metadata.description, `${relative}.description`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metadata.name)) throw new Error(`Codex skill name must be kebab-case: ${relative}`);
  const uiPath = path.join(root, path.dirname(relative), "agents", "openai.yaml");
  await stat(uiPath);
  const ui = YAML.parse(await readFile(uiPath, "utf8"));
  requireString(ui.interface?.display_name, `${relative}.interface.display_name`);
  requireString(ui.interface?.short_description, `${relative}.interface.short_description`);
  requireString(ui.interface?.default_prompt, `${relative}.interface.default_prompt`);
  if (!ui.interface.default_prompt.includes(`$${metadata.name}`)) throw new Error(`Codex skill default_prompt must reference $${metadata.name}: ${relative}`);
}

console.log(`Codex plugin validation passed: ${manifest.name}@${manifest.version}, ${skills.length} skills.`);
