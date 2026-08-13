import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { INTERNAL_DIR } from "./paths.js";
import { pathExists } from "./state.js";

export const ENGINE_POINTER_FILE = path.join(INTERNAL_DIR, "engine.json");
const IGNORE_ENTRY = ".ai-saas-sdlc/engine.json";
const RESEARCH_POLICY_IGNORE_ENTRY = ".ai-saas-sdlc/research-tools.json";

export interface EnginePointer {
  schema_version: 1;
  plugin_version: string;
  engine_path: string;
  editorial_command: string;
}

function quoted(target: string): string {
  return `node "${target.replace(/\\/g, "/")}"`;
}

export function buildEnginePointer(runtimeRoot: string, pluginVersion: string): EnginePointer {
  const enginePath = path.join(runtimeRoot, "bin", "ai-saas-sdlc");
  return {
    schema_version: 1,
    plugin_version: pluginVersion,
    engine_path: enginePath,
    editorial_command: `${quoted(enginePath)} refresh --editorial`
  };
}

// A body-only editorial change is applied outside every flow, so the session that
// applies it has no skill context and therefore no plugin root to resolve. Without
// an in-repository anchor it has to guess, and a guess can reach a different copy
// of this package. Recording the resolved engine here makes the published editorial
// mechanism reachable from the documentation repository alone.
export async function recordEnginePointer(root: string, runtimeRoot: string, pluginVersion: string): Promise<void> {
  const target = path.join(root, ENGINE_POINTER_FILE);
  const pointer = buildEnginePointer(runtimeRoot, pluginVersion);
  const serialized = `${JSON.stringify(pointer, null, 2)}\n`;
  if (await pathExists(target)) {
    const existing = await readFile(target, "utf8").catch(() => "");
    if (existing === serialized) return;
  }
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, serialized, "utf8");
}

async function ensureIgnoredEntry(root: string, entry: string): Promise<void> {
  const target = path.join(root, ".gitignore");
  const existing = (await pathExists(target)) ? await readFile(target, "utf8").catch(() => "") : "";
  if (existing.split(/\r?\n/).some((line) => line.trim() === entry)) return;
  const prefix = existing === "" || existing.endsWith("\n") ? existing : `${existing}\n`;
  await writeFile(target, `${prefix}${entry}\n`, "utf8");
}

// The pointer holds an absolute path that is valid only on the machine that wrote
// it, so it is deliberately not shared history.
export async function ensureEnginePointerIgnored(root: string): Promise<void> {
  await ensureIgnoredEntry(root, IGNORE_ENTRY);
}

// Same doctrine for the optional research policy: numeric caps tuned per
// machine, never product truth, never shared history. Retrieval records and
// bodies stay committed — a digest that does not survive a clone proves nothing.
export async function ensureResearchPolicyIgnored(root: string): Promise<void> {
  await ensureIgnoredEntry(root, RESEARCH_POLICY_IGNORE_ENTRY);
}
