import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import type { CurrentState } from "./types.js";
import { SdlcError } from "./errors.js";
import { isWithin, projectPaths } from "./paths.js";
import { pathExists, saveCurrentState } from "./state.js";
import { withProjectLock } from "./project-lock.js";
import { sha256, stableJson } from "./utils.js";

async function assertNoSymlinkAncestor(root: string, target: string): Promise<void> {
  let current = path.dirname(target);
  const boundary = path.resolve(root);
  while (isWithin(boundary, current) && path.resolve(current) !== boundary) {
    try {
      const info = await lstat(current);
      if (info.isSymbolicLink()) throw new SdlcError(`Initialization refuses symlinked destination directories: ${current}`);
      if (!info.isDirectory()) throw new SdlcError(`Initialization destination ancestor is not a directory: ${current}`);
    } catch (error) {
      if (error instanceof SdlcError) throw error;
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    current = path.dirname(current);
  }
}

interface CopyItem { source: string; target: string; relative: string; substitute: boolean }

async function assertSafeSource(sourceRoot: string, source: string): Promise<void> {
  if (!isWithin(sourceRoot, source)) throw new SdlcError(`Initialization source escapes its root: ${source}`);
  const info = await lstat(source);
  if (info.isSymbolicLink() || !info.isFile()) throw new SdlcError(`Initialization source must be a regular file: ${source}`);
  const [realRoot, realSource] = await Promise.all([realpath(sourceRoot), realpath(source)]);
  if (!isWithin(realRoot, realSource)) throw new SdlcError(`Initialization source resolves outside its root: ${source}`);
}

async function copyPlan(root: string, templateRoot: string, patternRoot: string): Promise<CopyItem[]> {
  if (!(await pathExists(path.join(patternRoot, "catalog.yaml"))) && !(await pathExists(path.join(patternRoot, "catalog.yml")))) {
    throw new SdlcError(`Pattern catalog is missing from ${patternRoot}.`);
  }
  const templateFiles = await fg("**/*", { cwd: templateRoot, onlyFiles: true, dot: true, followSymbolicLinks: false });
  const patternFiles = await fg("**/*", { cwd: patternRoot, onlyFiles: true, dot: true, followSymbolicLinks: false });
  const plan = [
    ...templateFiles.map((relative) => ({ source: path.join(templateRoot, relative), target: path.join(root, relative), relative, substitute: true })),
    ...patternFiles.map((relative) => ({ source: path.join(patternRoot, relative), target: path.join(root, "00-system", "patterns", relative), relative: `00-system/patterns/${relative.replaceAll("\\", "/")}`, substitute: false }))
  ];
  const targets = plan.map((item) => path.resolve(item.target));
  if (new Set(targets).size !== targets.length) throw new SdlcError("Project skeleton and pattern snapshot define the same destination path.");
  for (const item of plan) await assertSafeSource(item.substitute ? templateRoot : patternRoot, item.source);
  return plan;
}

// Well-known code-project markers. A docs repository never carries one, and
// the commonest wrong-cwd mistake is running init inside the application
// repository the docs are meant to describe.
const CODE_PROJECT_MARKERS = ["package.json", "pnpm-workspace.yaml", "go.mod", "Cargo.toml", "pyproject.toml", "requirements.txt", "pom.xml", "build.gradle", "Gemfile", "composer.json"];

async function initializeProjectUnlocked(root: string, templateRoot: string, patternRoot: string, projectId: string, idea: string, force: boolean): Promise<void> {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(projectId)) throw new SdlcError("project_id must use lowercase letters, numbers, and hyphens.");
  if (await pathExists(projectPaths(root).config)) throw new SdlcError("Repository is already initialized.");
  if (!force) {
    const found: string[] = [];
    for (const marker of CODE_PROJECT_MARKERS) if (await pathExists(path.join(root, marker))) found.push(marker);
    if (found.length > 0) throw new SdlcError(`Refusing to initialize: ${found.join(", ")} marks this directory as a code project. ai-saas-sdlc init belongs in a separate, empty documentation repository. Pass --force to override.`);
  }
  const plan = await copyPlan(root, templateRoot, patternRoot);
  const conflicts: string[] = [];
  for (const item of plan) {
    if (!isWithin(root, item.target)) throw new SdlcError(`Initialization path escapes project root: ${item.relative}`);
    await assertNoSymlinkAncestor(root, item.target);
    if (await pathExists(item.target)) conflicts.push(item.relative);
  }
  const snapshotFile = path.join(root, "00-system", "patterns", "snapshot.json");
  await assertNoSymlinkAncestor(root, snapshotFile);
  if (await pathExists(snapshotFile)) conflicts.push("00-system/patterns/snapshot.json");
  if (conflicts.length > 0) throw new SdlcError(`Initialization would overwrite existing files: ${conflicts.join(", ")}`);
  for (const item of plan.sort((a, b) => a.relative.localeCompare(b.relative))) {
    await mkdir(path.dirname(item.target), { recursive: true });
    const sourceContent = await readFile(item.source, "utf8");
    const content = item.substitute ? sourceContent
      .replaceAll("{{PROJECT_ID}}", projectId)
      .replaceAll("{{RAW_IDEA}}", idea === "" ? "Not provided. Invoke /ai-saas-sdlc:genesis with the raw idea." : idea) : sourceContent;
    await writeFile(item.target, content, { encoding: "utf8", flag: "wx" });
  }
  const pinnedRoot = path.join(root, "00-system", "patterns");
  const pinnedFiles = await fg("**/*", { cwd: pinnedRoot, onlyFiles: true, dot: true, followSymbolicLinks: false });
  const patternHashes: string[] = [];
  for (const relative of pinnedFiles.sort()) {
    const content = await readFile(path.join(pinnedRoot, relative), "utf8");
    patternHashes.push(`00-system/patterns/${relative.replaceAll("\\", "/")}:${sha256(content)}`);
  }
  await writeFile(snapshotFile, stableJson({ schema_version: 1, catalog_hash: sha256(patternHashes.join("\n")), files: patternHashes.length }), { encoding: "utf8", flag: "wx" });
  const state: CurrentState = {
    schema_version: 1,
    project_id: projectId,
    active_baseline: null,
    evidence_revision: 0,
    next_change: 1,
    next_flow: 1,
    next_execution: 1,
    id_registry: {}
  };
  await saveCurrentState(root, state);
  const paths = projectPaths(root);
  await Promise.all([
    mkdir(paths.changes, { recursive: true }),
    mkdir(paths.executions, { recursive: true }),
    mkdir(paths.retrievals, { recursive: true }),
    mkdir(paths.cache, { recursive: true })
  ]);
}

export async function initializeProject(root: string, templateRoot: string, projectId: string, idea: string, patternRoot = path.resolve(templateRoot, "..", "artifact-patterns"), options?: { force?: boolean }): Promise<void> {
  return withProjectLock(root, () => initializeProjectUnlocked(root, templateRoot, patternRoot, projectId, idea, options?.force === true));
}
