import path from "node:path";
import { readdir } from "node:fs/promises";
import fg from "fast-glob";
import type { ExecutionRecord } from "./types.js";
import { isExecutionRecord } from "./record-validation.js";
import { assertSafeManagedPath, projectPaths } from "./paths.js";
import { pathExists } from "./state.js";
import { readJson } from "./utils.js";

/**
 * Loads every well-formed execution record, silently skipping anything the
 * strict pass in internal-validation.ts already reports as an error — invalid
 * JSON, schema mismatches, filename mismatches, symlinks and unsafe paths.
 * Reporting nothing here is deliberate: consumers of this loader (the platform
 * contradiction check and the platform-coverage projection) derive views over
 * evidence, and a broken record must change the validate finding set in exactly
 * one place, not two. Output is sorted by record ID for deterministic use.
 */
export async function loadExecutionRecords(root: string): Promise<ExecutionRecord[]> {
  const directory = projectPaths(root).executions;
  if (!(await pathExists(directory))) return [];
  try {
    await assertSafeManagedPath(root, path.join(directory, ".managed-probe"));
  } catch {
    return [];
  }
  const symlinks = new Set<string>();
  for (const entry of await readdir(directory, { withFileTypes: true })) if (entry.isSymbolicLink()) symlinks.add(entry.name);
  const files = await fg("EXEC-*.json", { cwd: directory, absolute: true, followSymbolicLinks: false });
  const records: ExecutionRecord[] = [];
  for (const file of files) {
    if (symlinks.has(path.basename(file))) continue;
    try {
      await assertSafeManagedPath(root, file);
      const record = await readJson<ExecutionRecord>(file);
      if (!isExecutionRecord(record) || path.basename(file) !== `${record.id}.json`) continue;
      records.push(record);
    } catch {
      // Skipped; validate reports the defect through its strict loader.
    }
  }
  return records.sort((a, b) => a.id.localeCompare(b.id));
}
