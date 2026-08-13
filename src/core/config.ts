import { readFile } from "node:fs/promises";
import YAML from "yaml";
import type { ProjectConfig } from "./types.js";
import { SdlcError } from "./errors.js";
import { assertSafeManagedPath, projectPaths } from "./paths.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function safeId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9][a-z0-9-]*$/.test(value);
}

function validPlatforms(value: unknown): boolean {
  if (value === undefined) return true;
  return Array.isArray(value) && value.length > 0
    && value.every((item) => typeof item === "string" && /^[A-Z][A-Z0-9-]*$/.test(item))
    && new Set(value).size === value.length;
}

function validAreas(value: unknown): boolean {
  if (value === undefined) return true;
  return Array.isArray(value) && value.length > 0
    && value.every((item) => typeof item === "string" && /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*$/.test(item))
    && new Set(value).size === value.length;
}

function validReport(value: unknown): boolean {
  if (value === undefined) return true;
  if (!isRecord(value) || !exactKeys(value, ["path", "format"])) return false;
  if (typeof value.path !== "string" || value.path.length === 0) return false;
  // "json" is reserved, not accepted: it is not one format, and parsing an
  // undefined dialect would manufacture unparseable provenance.
  return value.format === "junit" || value.format === "tap";
}

function validCommand(value: unknown): boolean {
  return isRecord(value)
    && exactKeys(value, ["id", "cwd", "command", "platforms", "report"])
    && safeId(value.id)
    && [value.cwd, value.command].every((item) => typeof item === "string" && item.length > 0)
    && validPlatforms(value.platforms)
    && validReport(value.report);
}

function validConfig(value: unknown): value is ProjectConfig {
  if (!isRecord(value) || !exactKeys(value, ["schema_version", "project_id", "research_mode", "implementation_sources", "verification", "areas"])) return false;
  if (value.schema_version !== 1 || value.research_mode !== "public-web-only" || typeof value.project_id !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(value.project_id)) return false;
  if (!validAreas(value.areas)) return false;
  if (!Array.isArray(value.implementation_sources) || !value.implementation_sources.every((source) => isRecord(source) && exactKeys(source, ["id", "path"]) && safeId(source.id) && typeof source.path === "string" && source.path.length > 0)) return false;
  if (new Set(value.implementation_sources.map((source) => (source as Record<string, unknown>).id)).size !== value.implementation_sources.length) return false;
  if (!isRecord(value.verification) || !exactKeys(value.verification, ["unit", "integration", "system"])) return false;
  const verification = value.verification;
  return ["unit", "integration", "system"].every((level) => {
    const commands = verification[level];
    return Array.isArray(commands) && commands.every(validCommand) && new Set(commands.map((command) => (command as Record<string, unknown>).id)).size === commands.length;
  });
}

export async function loadConfig(root: string): Promise<ProjectConfig> {
  const file = projectPaths(root).config;
  let parsed: unknown;
  try {
    await assertSafeManagedPath(root, file);
    parsed = YAML.parse(await readFile(file, "utf8"));
  } catch (error) {
    throw new SdlcError(`Cannot read ${file}: ${String(error)}`);
  }
  if (!validConfig(parsed)) throw new SdlcError("Invalid sdlc.config.yaml: expected schema_version 1, kebab-case project/source/command IDs, public-web-only research, implementation_sources, unit/integration/system command arrays, optional non-empty artifact-ID platforms lists, optional per-command report declarations ({path, format: junit|tap}), and an optional non-empty uppercase areas registry.");
  return parsed;
}
