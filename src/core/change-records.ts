import path from "node:path";
import { readdir } from "node:fs/promises";
import fg from "fast-glob";
import type { ChangeRecord } from "./types.js";
import { isChangeRecord } from "./record-validation.js";
import { assertSafeManagedPath, projectPaths } from "./paths.js";
import { pathExists } from "./state.js";
import { readJson } from "./utils.js";

/**
 * Loads every well-formed change record, silently skipping anything the strict
 * pass in internal-validation.ts already reports as an error. Same contract as
 * loadExecutionRecords: a broken record must change the finding set in exactly
 * one place, and a view derived from records must never raise a second, quieter
 * complaint about the same defect. Sorted by record ID, which is also
 * chronological — the ripple-debt derivation depends on that ordering to decide
 * which change is allowed to answer for an earlier one.
 */
export async function loadChangeRecords(root: string): Promise<ChangeRecord[]> {
  const directory = projectPaths(root).changes;
  if (!(await pathExists(directory))) return [];
  try {
    await assertSafeManagedPath(root, path.join(directory, ".managed-probe"));
  } catch {
    return [];
  }
  const symlinks = new Set<string>();
  for (const entry of await readdir(directory, { withFileTypes: true })) if (entry.isSymbolicLink()) symlinks.add(entry.name);
  const files = await fg("CHG-*.json", { cwd: directory, absolute: true, followSymbolicLinks: false });
  const records: ChangeRecord[] = [];
  for (const file of files) {
    if (symlinks.has(path.basename(file))) continue;
    try {
      await assertSafeManagedPath(root, file);
      const record = await readJson<ChangeRecord>(file);
      if (!isChangeRecord(record) || path.basename(file) !== `${record.id}.json`) continue;
      records.push(record);
    } catch {
      // Skipped; validate reports the defect through its strict loader.
    }
  }
  return records.sort((a, b) => a.id.localeCompare(b.id));
}
