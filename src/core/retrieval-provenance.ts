import { readFile } from "node:fs/promises";
import path from "node:path";
import type { QueryRecord, RetrievalRecord } from "./types.js";
import { assertSafeManagedPath, isRealPathWithin, isWithin, projectPaths } from "./paths.js";
import { pathExists } from "./state.js";
import { retrievalBodyFile } from "./retrieval-records.js";
import { sha256 } from "./utils.js";

/**
 * Provenance checks for one retrieval record, mirroring
 * executionProvenanceIssues: the stored body must sit where the record says,
 * inside the retrievals directory, reachable without symlinks, and hash to
 * exactly the digest the record carries. A failed retrieval must have no
 * body at all — a body beside an ok:false record is fabricated evidence.
 */
export async function retrievalProvenanceIssues(root: string, record: RetrievalRecord): Promise<string[]> {
  const issues: string[] = [];
  if (Date.parse(record.ended_at) < Date.parse(record.started_at)) issues.push("ended_at precedes started_at");
  const bodyFile = path.resolve(root, retrievalBodyFile(record.id));
  if (!record.ok) {
    if (await pathExists(bodyFile)) issues.push("failed retrieval must not have a body file");
    return issues;
  }
  const expected = retrievalBodyFile(record.id);
  if (record.body_file?.replaceAll("\\", "/") !== expected) issues.push(`body_file must be ${expected}`);
  if (!isWithin(projectPaths(root).retrievals, bodyFile)) issues.push("body_file escapes retrievals directory");
  else if (!(await pathExists(bodyFile))) issues.push("retrieval body is missing");
  else {
    try {
      await assertSafeManagedPath(root, bodyFile);
      if (!(await isRealPathWithin(projectPaths(root).retrievals, bodyFile))) issues.push("retrieval body escapes through a symlink");
      else if (sha256(await readFile(bodyFile, "utf8")) !== record.body_hash) issues.push("retrieval body digest does not match body_hash");
    } catch {
      issues.push("retrieval body cannot be resolved safely");
    }
  }
  return issues;
}

export function queryProvenanceIssues(record: QueryRecord): string[] {
  const issues: string[] = [];
  if (Date.parse(record.ended_at) < Date.parse(record.started_at)) issues.push("ended_at precedes started_at");
  if (record.results && record.result_count !== undefined && record.results.length > record.result_count) issues.push("results exceed result_count");
  return issues;
}
