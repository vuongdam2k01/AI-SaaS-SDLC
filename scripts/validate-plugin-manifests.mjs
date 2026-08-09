import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const temporary = await mkdtemp(path.join(os.tmpdir(), "ai-saas-plugin-validation-"));
const staged = path.join(temporary, "installed-plugin");

function validate(target) {
  const executable = process.platform === "win32" ? "claude.exe" : "claude";
  const result = spawnSync(executable, ["plugin", "validate", target, "--strict"], { cwd: root, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`Strict Claude plugin validation failed for ${target}`);
}

try {
  await mkdir(path.join(staged, ".claude-plugin"), { recursive: true });
  await cp(path.join(root, ".claude-plugin", "plugin.json"), path.join(staged, ".claude-plugin", "plugin.json"));
  for (const item of [".codex-plugin", "skills", "claude", "hooks", "resources", "schemas", "bin", "dist", "LICENSE", "README.md"]) {
    await cp(path.join(root, item), path.join(staged, item), { recursive: true });
  }
  validate(staged);
  validate(path.join(root, ".claude-plugin", "marketplace.json"));
} finally {
  await rm(temporary, { recursive: true, force: true });
}
