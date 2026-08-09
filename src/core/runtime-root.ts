import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function resolveRuntimeRoot(moduleUrl: string): string {
  const configured = process.env.CODEX_PLUGIN_ROOT ?? process.env.CLAUDE_PLUGIN_ROOT;
  return configured ? resolve(configured) : resolve(dirname(fileURLToPath(moduleUrl)), "..");
}
