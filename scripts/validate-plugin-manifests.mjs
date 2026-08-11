import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const temporary = await mkdtemp(path.join(os.tmpdir(), "ai-saas-plugin-validation-"));
const staged = path.join(temporary, "installed-plugin");

// A global npm install on Windows produces claude.cmd, not claude.exe: assuming
// the .exe made this script fail in 400ms with no output at all, which reads
// exactly like a validation failure and is nothing of the sort. Try each name
// the CLI is installed under, and never again report a missing executable as a
// failed validation.
// Resolve the CLI from PATH ourselves rather than guessing its extension. A
// global npm install on Windows leaves claude.cmd; the native installer leaves
// claude.exe; a machine has one or the other. Guessing wrong cost a CI run that
// failed in 400ms with no output and read exactly like a failed validation.
function resolveClaude() {
  // Extensions only on Windows, and the candidate must be a file: a PATH entry
  // holding a *directory* named `claude` otherwise resolves as the executable
  // and spawns as ENOENT.
  const extensions = process.platform === "win32" ? [".exe", ".cmd", ".bat"] : [""];
  for (const directory of (process.env.PATH ?? "").split(path.delimiter).filter(Boolean)) {
    for (const extension of extensions) {
      const candidate = path.join(directory.replace(/^"|"$/g, ""), `claude${extension}`);
      if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    }
  }
  return null;
}

function runClaude(args) {
  const executable = resolveClaude();
  if (!executable) return { error: new Error("no claude executable on PATH") };
  // Node refuses to spawn .cmd and .bat without a shell, so those go through
  // one — with every argument quoted, because a shell is what makes a path
  // containing a space stop being one argument.
  const shell = /\.(?:cmd|bat)$/i.test(executable);
  const shellArgs = shell ? args.map((value) => (/[\s"^&|<>]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value)) : args;
  return spawnSync(executable, shellArgs, { cwd: root, stdio: "inherit", shell });
}

function validate(target) {
  const result = runClaude(["plugin", "validate", target, "--strict"]);
  if (result.error) throw new Error(`Could not run the Claude CLI (${result.error.code ?? result.error.message}); install @anthropic-ai/claude-code before validating ${target}`);
  if (result.status !== 0) throw new Error(`Strict Claude plugin validation failed for ${target} (exit code ${result.status})`);
}

try {
  await mkdir(path.join(staged, ".claude-plugin"), { recursive: true });
  await cp(path.join(root, ".claude-plugin", "plugin.json"), path.join(staged, ".claude-plugin", "plugin.json"));
  for (const item of [".codex-plugin", "codex", "claude", "hooks", "resources", "schemas", "bin", "dist", "LICENSE", "README.md"]) {
    await cp(path.join(root, item), path.join(staged, item), { recursive: true });
  }
  validate(staged);
  validate(path.join(root, ".claude-plugin", "marketplace.json"));
} finally {
  await rm(temporary, { recursive: true, force: true });
}
