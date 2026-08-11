import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile, readlink, realpath, stat } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { loadConfig } from "./config.js";
import { SdlcError } from "./errors.js";
import { isWithin } from "./paths.js";
import { stableJson, toPosix } from "./utils.js";

function git(cwd: string, args: string[], optional = false): Buffer {
  try {
    return execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 50 * 1024 * 1024 });
  } catch (error) {
    if (optional) return Buffer.alloc(0);
    throw new SdlcError(`Configured implementation source is not a readable Git worktree: ${cwd} (${String(error)})`);
  }
}

function digest(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function untrackedHashes(repository: string, pathspecs: string[]): Promise<Array<[string, string]>> {
  const names = git(repository, ["ls-files", "--others", "--exclude-standard", "-z", "--", ...pathspecs])
    .toString("utf8").split("\0").filter(Boolean).sort();
  const result: Array<[string, string]> = [];
  for (const name of names) {
    const file = path.resolve(repository, name);
    if (!isWithin(repository, file)) throw new SdlcError(`Git returned an unsafe implementation path: ${name}`);
    const info = await lstat(file);
    const content = info.isSymbolicLink() ? Buffer.from(await readlink(file)) : info.isFile() ? await readFile(file) : Buffer.alloc(0);
    result.push([toPosix(name), digest(content)]);
  }
  return result;
}

async function filesystemState(resolved: string, exclusions: string[]): Promise<unknown> {
  const info = await stat(resolved);
  if (!info.isDirectory()) return { kind: "file", hash: digest(await readFile(resolved)) };
  const names = await fg("**/*", {
    cwd: resolved, dot: true, onlyFiles: false, followSymbolicLinks: false,
    ignore: ["**/.git/**", "**/node_modules/**"]
  });
  const entries: Array<[string, string, string]> = [];
  for (const name of names.sort()) {
    const file = path.resolve(resolved, name);
    if (!isWithin(resolved, file)) throw new SdlcError(`Filesystem snapshot escaped its implementation source: ${name}`);
    if (exclusions.some((excluded) => isWithin(excluded, file))) continue;
    const item = await lstat(file);
    if (item.isSymbolicLink()) entries.push([toPosix(name), "link", digest(await readlink(file))]);
    else if (item.isFile()) entries.push([toPosix(name), "file", digest(await readFile(file))]);
  }
  return { kind: "filesystem", entries };
}

async function pathState(configured: string, label: string, exclusions: string[] = []): Promise<unknown> {
  const resolved = await realpath(configured).catch(() => { throw new SdlcError(`Snapshot source is missing: ${label}`); });
  const scopedExclusions = exclusions.map((value) => path.resolve(value)).filter((value) => isWithin(resolved, value));
  const context = (await stat(resolved)).isDirectory() ? resolved : path.dirname(resolved);
  const repository = git(context, ["rev-parse", "--show-toplevel"], true).toString("utf8").trim();
  if (!repository) return filesystemState(resolved, scopedExclusions);
  if (!isWithin(repository, resolved)) throw new SdlcError(`Snapshot source is outside its Git worktree: ${label}`);
  // Settle the index before sampling it. Git caches stat information per file
  // and only re-reads content when that cache looks out of date, so a first
  // call after a checkout or a bulk `git add` can report entries as modified
  // that a second call, having refreshed the cache, reports as clean. Two
  // samples of an unchanged worktree must agree, or a flow that changed nothing
  // is refused its own cancellation. Non-zero exit here means "some files
  // really are modified", which is information the sampling below collects
  // properly; it is not an error.
  git(context, ["update-index", "--refresh", "-q"], true);
  const relative = toPosix(path.relative(repository, resolved));
  const pathspec = relative || ".";
  const pathspecs = [pathspec, ...scopedExclusions.map((value) => `:(exclude,top)${toPosix(path.relative(repository, value))}`)];
  const headObject = git(repository, ["rev-parse", "--verify", relative ? `HEAD:${relative}` : "HEAD^{tree}"], true).toString("utf8").trim() || "unborn-or-untracked";
  return {
    kind: "git",
    head_object: headObject,
    status: digest(git(repository, ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--", ...pathspecs])),
    staged: digest(git(repository, ["diff", "--cached", "--no-ext-diff", "--binary", "--", ...pathspecs])),
    working: digest(git(repository, ["diff", "--no-ext-diff", "--binary", "--", ...pathspecs])),
    untracked: await untrackedHashes(repository, pathspecs)
  };
}

export async function sourceSnapshotHash(target: string): Promise<string> {
  return digest(stableJson(await pathState(path.resolve(target), target)));
}

export async function implementationSnapshotHash(root: string): Promise<string> {
  const config = await loadConfig(root);
  const engineOwned = [path.join(root, ".ai-saas-sdlc"), path.join(root, "generated"), path.join(root, "04-verification", "results")];
  const states = [];
  for (const source of [...config.implementation_sources].sort((a, b) => a.id.localeCompare(b.id))) {
    states.push({ id: source.id, path: source.path, state: await pathState(path.resolve(root, source.path), `${source.id} (${source.path})`, engineOwned) });
  }
  return digest(stableJson(states));
}
