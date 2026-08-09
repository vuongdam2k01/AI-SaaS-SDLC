import path from "node:path";
import { lstat, mkdir, realpath } from "node:fs/promises";
import { SdlcError } from "./errors.js";

export const CONFIG_FILE = "sdlc.config.yaml";
export const INTERNAL_DIR = ".ai-saas-sdlc";
export const GENERATED_DIR = "generated";

export function projectPaths(root: string) {
  return {
    root,
    config: path.join(root, CONFIG_FILE),
    current: path.join(root, INTERNAL_DIR, "state", "current.json"),
    activeFlow: path.join(root, INTERNAL_DIR, "state", "active-flow.json"),
    changes: path.join(root, INTERNAL_DIR, "changes"),
    executions: path.join(root, INTERNAL_DIR, "executions"),
    cache: path.join(root, INTERNAL_DIR, "cache"),
    generated: path.join(root, GENERATED_DIR),
    baseline: path.join(root, GENERATED_DIR, "baseline-manifest.json")
  };
}

export function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export async function isRealPathWithin(root: string, candidate: string): Promise<boolean> {
  const [realRoot, realCandidate] = await Promise.all([realpath(root), realpath(candidate)]);
  return isWithin(realRoot, realCandidate);
}

export async function assertSafeManagedPath(root: string, candidate: string): Promise<void> {
  const absoluteRoot = path.resolve(root);
  const absoluteCandidate = path.resolve(candidate);
  if (!isWithin(absoluteRoot, absoluteCandidate)) throw new SdlcError(`Managed path escapes project root: ${candidate}`);
  const realRoot = await realpath(absoluteRoot);
  const relativeParent = path.relative(absoluteRoot, path.dirname(absoluteCandidate));
  let inspected = absoluteRoot;
  for (const segment of relativeParent.split(path.sep).filter(Boolean)) {
    inspected = path.join(inspected, segment);
    try {
      const info = await lstat(inspected);
      if (info.isSymbolicLink()) throw new SdlcError(`Managed path contains a symlinked directory: ${candidate}`);
      if (!info.isDirectory()) throw new SdlcError(`Managed path ancestor is not a directory: ${candidate}`);
    } catch (error) {
      if (error instanceof SdlcError) throw error;
      if ((error as NodeJS.ErrnoException).code === "ENOENT") break;
      throw error;
    }
  }
  let existing = path.dirname(absoluteCandidate);
  while (true) {
    try {
      await lstat(existing);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const parent = path.dirname(existing);
      if (parent === existing) throw new SdlcError(`Cannot resolve managed path ancestor: ${candidate}`);
      existing = parent;
    }
  }
  const realExisting = await realpath(existing);
  if (!isWithin(realRoot, realExisting)) throw new SdlcError(`Managed path follows a symlink outside the project: ${candidate}`);
  try {
    const target = await lstat(absoluteCandidate);
    if (target.isSymbolicLink()) throw new SdlcError(`Managed file cannot be a symlink: ${candidate}`);
  } catch (error) {
    if (error instanceof SdlcError) throw error;
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export async function prepareSafeManagedPath(root: string, candidate: string): Promise<void> {
  await assertSafeManagedPath(root, candidate);
  await mkdir(path.dirname(path.resolve(candidate)), { recursive: true });
  await assertSafeManagedPath(root, candidate);
}
