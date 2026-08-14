import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { SdlcError } from "./errors.js";
import { assertSafeManagedPath, isWithin } from "./paths.js";
import { loadPatternCatalog } from "./pattern-catalog.js";
import type { PatternCatalog } from "./pattern-catalog.js";
import { verifyPatternSnapshot, writePatternSnapshot } from "./pattern-snapshot.js";
import { withProjectLock } from "./project-lock.js";
import { pathExists } from "./state.js";

export interface ContractDiff {
  /** What the contract governs: an artifact type, or a system-document path. */
  subject: string;
  change: "added" | "removed" | "changed";
  /** Human-readable contract deltas: headings, tables, namespaces. */
  details: string[];
}

export interface PatternMigrationReport {
  from_version: string;
  to_version: string;
  files_written: number;
  files_removed: string[];
  patterns: ContractDiff[];
  foundations: ContractDiff[];
  /**
   * Contract changes for the `00-system` documents. Migration re-pins these
   * contracts but does not carry the documents themselves — those live in the
   * project template, outside the pinned catalog — so a change here is exactly
   * the case where a repository will start reporting SYSTEM_DOCUMENT_INCOMPLETE
   * and deserves to be told why before it happens.
   */
  system_documents: ContractDiff[];
  /** True when nothing was written because --check was passed. */
  checked_only: boolean;
}

interface ContractShape {
  headings: string[];
  tables: string[];
  namespaces: string[];
}

function shapeOf(content: { required_headings: string[]; required_tables: { heading: string; min_rows: number }[]; local_ids: { namespace: string; minimum: number }[] }): ContractShape {
  return {
    headings: [...content.required_headings].sort(),
    tables: content.required_tables.map((table) => `${table.heading} (min ${table.min_rows})`).sort(),
    namespaces: content.local_ids.map((local) => `${local.namespace} (min ${local.minimum})`).sort()
  };
}

function listDelta(label: string, before: string[], after: string[]): string[] {
  const added = after.filter((item) => !before.includes(item));
  const removed = before.filter((item) => !after.includes(item));
  return [
    ...added.map((item) => `+ ${label}: ${item}`),
    ...removed.map((item) => `- ${label}: ${item}`)
  ];
}

function diffShapes(before: ContractShape, after: ContractShape): string[] {
  return [
    ...listDelta("heading", before.headings, after.headings),
    ...listDelta("table", before.tables, after.tables),
    ...listDelta("namespace", before.namespaces, after.namespaces)
  ];
}

function diffContracts(before: Map<string, ContractShape>, after: Map<string, ContractShape>): ContractDiff[] {
  const diffs: ContractDiff[] = [];
  for (const [subject, shape] of [...after].sort(([a], [b]) => a.localeCompare(b))) {
    const previous = before.get(subject);
    if (!previous) {
      diffs.push({ subject, change: "added", details: [] });
      continue;
    }
    const details = diffShapes(previous, shape);
    if (details.length > 0) diffs.push({ subject, change: "changed", details });
  }
  for (const subject of [...before.keys()].sort()) {
    if (!after.has(subject)) diffs.push({ subject, change: "removed", details: [] });
  }
  return diffs;
}

function patternShapes(catalog: PatternCatalog): Map<string, ContractShape> {
  return new Map(catalog.patterns.map((pattern) => [pattern.artifact_type, shapeOf(pattern.content)]));
}

function foundationShapes(catalog: PatternCatalog): Map<string, ContractShape> {
  return new Map(catalog.foundations.map((foundation) => [foundation.artifact_type, shapeOf(foundation.content)]));
}

function systemDocumentShapes(catalog: PatternCatalog): Map<string, ContractShape> {
  return new Map(catalog.system_documents.map((document) => [document.path.replaceAll("\\", "/"), shapeOf(document.content)]));
}

/**
 * Re-pins a repository's pattern snapshot to the plugin's current catalog.
 *
 * A pinned snapshot exists so a repository's contracts stay reproducible, which
 * also means a repository never picks up a newer contract by accident. That is
 * correct as a default and useless as a permanent state: without an explicit
 * way across, a standard improved in the plugin can only ever reach repositories
 * created after it. This is that way across — deliberate, reported, and separate
 * from the schema `migrate` command, which moves records rather than contracts.
 *
 * What it does not do is edit content. Instances written under the old contract
 * stay exactly as they were; the next `validate` names each one that no longer
 * satisfies the new shape, and repairing them is ordinary flow work with
 * ordinary provenance.
 */
export async function migratePatternCatalog(root: string, sourcePatternRoot: string, check = false): Promise<PatternMigrationReport> {
  return withProjectLock(root, () => migrateUnlocked(root, sourcePatternRoot, check));
}

async function migrateUnlocked(root: string, sourcePatternRoot: string, check: boolean): Promise<PatternMigrationReport> {
  const pinnedRoot = path.join(root, "00-system", "patterns");
  if (!(await pathExists(path.join(pinnedRoot, "catalog.yaml"))) && !(await pathExists(path.join(pinnedRoot, "catalog.yml")))) {
    throw new SdlcError("This repository has no pinned pattern catalog to migrate; initialize it first.");
  }
  if (!(await pathExists(path.join(sourcePatternRoot, "catalog.yaml"))) && !(await pathExists(path.join(sourcePatternRoot, "catalog.yml")))) {
    throw new SdlcError(`Pattern catalog is missing from ${sourcePatternRoot}.`);
  }
  // A tampered pin must be refused rather than silently overwritten: the local
  // edit it carries is someone's intent, and losing it inside a migration would
  // be indistinguishable from the migration working.
  await verifyPatternSnapshot(root, pinnedRoot);
  const before = await loadPatternCatalog(pinnedRoot, root);
  const after = await loadPatternCatalog(sourcePatternRoot);

  const sourceFiles = (await fg("**/*", { cwd: sourcePatternRoot, onlyFiles: true, dot: true, followSymbolicLinks: false })).sort();
  const pinnedFiles = (await fg("**/*", { cwd: pinnedRoot, onlyFiles: true, dot: true, followSymbolicLinks: false, ignore: ["snapshot.json"] })).sort();
  const stale = pinnedFiles.filter((relative) => !sourceFiles.includes(relative));

  const report: PatternMigrationReport = {
    from_version: before.version,
    to_version: after.version,
    files_written: sourceFiles.length,
    files_removed: stale.map((relative) => `00-system/patterns/${relative.replaceAll("\\", "/")}`),
    patterns: diffContracts(patternShapes(before), patternShapes(after)),
    foundations: diffContracts(foundationShapes(before), foundationShapes(after)),
    system_documents: diffContracts(systemDocumentShapes(before), systemDocumentShapes(after)),
    checked_only: check
  };
  if (check) return report;

  for (const relative of sourceFiles) {
    const target = path.join(pinnedRoot, relative);
    if (!isWithin(pinnedRoot, target)) throw new SdlcError(`Pattern migration path escapes the pinned catalog: ${relative}`);
    await assertSafeManagedPath(root, path.dirname(target));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, await readFile(path.join(sourcePatternRoot, relative), "utf8"), "utf8");
  }
  for (const relative of stale) {
    const target = path.join(pinnedRoot, relative);
    if (!isWithin(pinnedRoot, target)) continue;
    await rm(target, { force: true });
  }
  await writePatternSnapshot(pinnedRoot);
  return report;
}

/** One-line-per-fact rendering for the human-readable command output. */
export function formatMigrationReport(report: PatternMigrationReport): string {
  const lines: string[] = [];
  lines.push(`Pinned pattern catalog: generation ${report.from_version} -> ${report.to_version}${report.checked_only ? " (check only, nothing written)" : ""}`);
  const sections: [string, ContractDiff[]][] = [
    ["Scalable patterns", report.patterns],
    ["Foundations", report.foundations],
    ["System documents", report.system_documents]
  ];
  for (const [label, diffs] of sections) {
    if (diffs.length === 0) {
      lines.push(`${label}: no contract change`);
      continue;
    }
    lines.push(`${label}:`);
    for (const diff of diffs) {
      lines.push(`  ${diff.subject} (${diff.change})`);
      for (const detail of diff.details) lines.push(`    ${detail}`);
    }
  }
  if (report.files_removed.length > 0) lines.push(`Removed pinned files: ${report.files_removed.join(", ")}`);
  if (!report.checked_only) {
    lines.push("");
    lines.push("Next: run `refresh`, then `validate --all`. Instances written under the previous contract keep their content; validation now names each one that no longer satisfies the new shape, and repairing them is ordinary flow work.");
    lines.push("Accepted decision records and the original idea are exempt: they were sealed under the contract in force when they were written and stay valid unchanged.");
    if (report.system_documents.length > 0) {
      lines.push("The system-document contracts above changed, and migration re-pins contracts without carrying the documents themselves — those ship with the project template, outside the pinned catalog. Expect SYSTEM_DOCUMENT_INCOMPLETE warnings until the `00-system` documents are brought forward from the template; the warning is the record of that debt and never blocks a baseline.");
    }
  }
  return lines.join("\n");
}
