import { execFileSync } from "node:child_process";

function git(root: string, args: string[]): string | null {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

function isDirty(root: string): boolean {
  // `--porcelain` prints one line per tracked modification and per untracked file.
  // Empty output means the commit below describes the tree exactly.
  const status = git(root, ["status", "--porcelain"]);
  return status !== null && status !== "";
}

/**
 * The commit a recorded observation was taken at.
 *
 * Flows routinely execute against an uncommitted working tree, so `HEAD` alone
 * names a tree that was never the one under test. When the tree carries any
 * modification or untracked file, the value is suffixed `+dirty` so an auditor
 * reading the record cannot mistake the commit for the tested content. Exact
 * content integrity is carried separately by `source_snapshot_hash`.
 */
export function gitCommit(root: string): string | null {
  const head = git(root, ["rev-parse", "HEAD"]);
  if (head === null) return null;
  return isDirty(root) ? `${head}+dirty` : head;
}
