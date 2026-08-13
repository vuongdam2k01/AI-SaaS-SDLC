import path from "node:path";
import { readFile } from "node:fs/promises";
import { readHookInput, emit } from "./io.js";
import { parseFrontmatter, toArtifactMeta } from "../core/frontmatter.js";
import { loadConfig } from "../core/config.js";
import { loadActiveFlow, pathExists } from "../core/state.js";
import { INTERNAL_DIR, isWithin, projectPaths } from "../core/paths.js";
import fg from "fast-glob";

const input = await readHookInput();
const toolName = typeof input.tool_name === "string" ? input.tool_name : "";
const toolInput = input.tool_input && typeof input.tool_input === "object" ? input.tool_input as Record<string, unknown> : {};
const root = typeof input.cwd === "string" ? input.cwd : process.cwd();
const mutatingDirectTool = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit", "apply_patch"]);

function normalized(value: string): string {
  const absolute = path.isAbsolute(value) ? value : path.resolve(root, value);
  return absolute.replaceAll("\\", "/").toLowerCase();
}

function protectedInternal(value: string): string | null {
  if (!normalized(value).includes(`/${INTERNAL_DIR}/`)) return null;
  return "Internal state, change and execution records are engine-owned and cannot be edited directly.";
}

function protectedStatic(value: string): string | null {
  const file = normalized(value);
  if (file.includes("/generated/")) return "Generated projections are machine-owned. Change canonical artifacts and run ai-saas-sdlc refresh.";
  if (file.includes("/00-system/patterns/")) return "Pinned artifact patterns are engine-owned and may only change through an explicit engine migration.";
  if (file.includes("/04-verification/results/")) return "Test results are execution-backed. Run ai-saas-sdlc verify --execute.";
  return null;
}

async function protectedOriginal(value: string): Promise<string | null> {
  if (!normalized(value).endsWith("/01-discovery/original-idea.md")) return null;
  const flow = await loadActiveFlow(root);
  const baselineExists = await pathExists(projectPaths(root).baseline);
  try {
    const content = await readFile(path.isAbsolute(value) ? value : path.resolve(root, value), "utf8");
    if (!baselineExists && flow?.type === "genesis" && content.includes("Not provided. Invoke /ai-saas-sdlc:genesis")) return null;
  } catch {
    // Missing or unreadable immutable input remains protected.
  }
  return "The original idea is immutable after capture. Record changed understanding in idea-definition.md.";
}

async function protectedAdr(value: string): Promise<string | null> {
  if (!/(?:^|[/\\])05-control[/\\]decisions[/\\]ADR-[^/\\]+\.md$/i.test(value)) return null;
  try {
    const meta = toArtifactMeta(parseFrontmatter(await readFile(path.resolve(root, value), "utf8"), value).data);
    return meta.adr_status === "accepted" ? "Accepted ADR bodies are immutable. Create a successor ADR with supersedes." : null;
  } catch {
    return null;
  }
}

async function protectedTerminalArtifact(value: string): Promise<string | null> {
  if (!/(?:^|[/\\])0[1-5]-[^/\\]+[/\\].+\.md$/i.test(value)) return null;
  try {
    const file = path.isAbsolute(value) ? value : path.resolve(root, value);
    const meta = toArtifactMeta(parseFrontmatter(await readFile(file, "utf8"), value).data);
    return meta.status === "retired" || meta.status === "superseded" ? "Retired and superseded artifacts are immutable. Create a new permanent ID." : null;
  } catch {
    return null;
  }
}

const candidatePaths: string[] = [];
for (const key of ["file_path", "path", "notebook_path"]) if (typeof toolInput[key] === "string") candidatePaths.push(toolInput[key] as string);
if (Array.isArray(toolInput.edits)) {
  for (const edit of toolInput.edits) {
    if (!edit || typeof edit !== "object") continue;
    const editPath = (edit as Record<string, unknown>).file_path;
    if (typeof editPath === "string") candidatePaths.push(editPath);
  }
}
if (toolName === "apply_patch" && typeof toolInput.command === "string") {
  for (const match of toolInput.command.matchAll(/^\*\*\* (?:Add|Update|Delete) File:\s*(.+?)\s*$/gm)) candidatePaths.push(match[1]!);
  for (const match of toolInput.command.matchAll(/^\*\*\* Move to:\s*(.+?)\s*$/gm)) candidatePaths.push(match[1]!);
}

// The plugin is enabled in every repository the host opens, so these string
// rules only mean something inside an engine-managed docs repository. The one
// exception is the internal directory itself: its name is unique to this
// engine, and fabricating state under it is denied everywhere. The
// implementation-source block below keeps its own stricter current.json
// sentinel because it must load config and state anyway.
const managedRepo = await pathExists(path.join(root, INTERNAL_DIR));

let reason: string | null = null;
if (mutatingDirectTool.has(toolName)) {
  for (const candidate of candidatePaths) {
    reason ??= protectedInternal(candidate);
    if (managedRepo) reason ??= protectedStatic(candidate) ?? await protectedOriginal(candidate) ?? await protectedAdr(candidate) ?? await protectedTerminalArtifact(candidate);
  }
}

let implementationRoots: string[] = [];
let implementationMarkers: string[] = [];
let implementationFlow = false;
if (await pathExists(projectPaths(root).current)) {
  try {
    const config = await loadConfig(root);
    implementationRoots = config.implementation_sources.map((source) => path.resolve(root, source.path));
    implementationMarkers = config.implementation_sources.flatMap((source) => [source.path, path.resolve(root, source.path)]).map((value) => value.replaceAll("\\", "/").toLowerCase());
    const flow = await loadActiveFlow(root);
    implementationFlow = flow?.type === "evolution" || flow?.type === "reconciliation";
  } catch {
    // Explicit validation reports a broken project; the hook stays narrow.
  }
}
if (!reason && !implementationFlow && implementationRoots.length > 0) {
  for (const candidate of candidatePaths) {
    const absolute = path.isAbsolute(candidate) ? path.resolve(candidate) : path.resolve(root, candidate);
    if (implementationRoots.some((sourceRoot) => isWithin(sourceRoot, absolute))) {
      reason = "Configured implementation sources may only be inspected or edited inside Product Evolution or Reconciliation.";
      break;
    }
  }
}

if (!reason && toolName === "Bash" && typeof toolInput.command === "string") {
  const command = toolInput.command;
  if (!implementationFlow && implementationMarkers.some((marker) => marker.length > 0 && command.replaceAll("\\", "/").toLowerCase().includes(marker))) {
    reason = "Configured implementation sources may only be inspected or edited inside Product Evolution or Reconciliation.";
  }
  if (!reason) {
    const lower = command.replaceAll("\\", "/").toLowerCase();
    const deobfuscated = lower.replace(/[\s"'`+${}()[\]\\]/g, "");
    if (/(?:^|[\s"'=/])\.ai-saas-sdlc(?:[\s"'/$]|$)/.test(lower) || deobfuscated.includes(".ai-saas-sdlc")) {
      reason = "Internal state and machine-owned files cannot be mutated through shell indirection; use direct file tools for canonical artifacts and the bundled engine for managed files.";
    } else if (managedRepo) {
      if (/(?:^|[\s"'=/])generated(?:[\s"'/$]|$)/.test(lower)) reason = "Generated projections are machine-owned; use the Read tool to inspect them and the engine to refresh them.";
      else if (lower.includes("00-system/patterns")) reason = "Pinned artifact patterns are engine-owned and may only change through an explicit engine migration.";
      else if (lower.includes("04-verification/results")) reason = "Test results are execution-backed; use the Read tool to inspect them and verify --execute to create them.";
      else if (lower.includes("01-discovery/original-idea.md")) reason = "Use a direct file edit to capture the Genesis input once; shell access to original-idea.md is blocked.";
      if (!reason && lower.includes("adr-")) {
        const adrFiles = await fg("05-control/decisions/ADR-*.md", { cwd: root, absolute: true });
        for (const adrFile of adrFiles) if (lower.includes(path.basename(adrFile).toLowerCase())) reason ??= await protectedAdr(adrFile);
      }
    }
  }
}

if (reason) emit({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason } });
