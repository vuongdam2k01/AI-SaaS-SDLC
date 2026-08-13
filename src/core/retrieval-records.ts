import path from "node:path";
import { readdir, writeFile } from "node:fs/promises";
import fg from "fast-glob";
import type { QueryRecord, RetrievalRecord } from "./types.js";
import { isQueryRecord, isRetrievalRecord } from "./record-validation.js";
import { assertSafeManagedPath, prepareSafeManagedPath, projectPaths } from "./paths.js";
import { loadCurrentState, pathExists, saveCurrentState } from "./state.js";
import { formatId, normalizeText, readJson, sha256, writeJsonAtomic } from "./utils.js";
import { withProjectLock } from "./project-lock.js";
import { SdlcError } from "./errors.js";

export function retrievalBodyFile(id: string): string {
  return `.ai-saas-sdlc/retrievals/${id}.md`;
}

/**
 * Reserve retrieval identities and burn the counter before any network work
 * happens, exactly as verification reserves EXEC IDs before running a
 * command. A retrieval that later fails or a crawl slot that goes unused
 * leaves a gap in the sequence — gaps are legal; reuse is not.
 */
export async function allocateRetrievalIds(root: string, count: number): Promise<string[]> {
  if (!Number.isInteger(count) || count < 1) throw new SdlcError("Retrieval allocation requires a positive count.");
  return withProjectLock(root, async () => {
    const state = await loadCurrentState(root);
    const ids: string[] = [];
    let next = state.next_retrieval ?? 1;
    for (let index = 0; index < count; index += 1) {
      const id = formatId("RET", next);
      const recordFile = path.join(projectPaths(root).retrievals, `${id}.json`);
      const bodyFile = path.join(projectPaths(root).retrievals, `${id}.md`);
      if ((await pathExists(recordFile)) || (await pathExists(bodyFile))) throw new SdlcError(`Retrieval ID ${id} is already reserved; repair state without overwriting provenance.`);
      await prepareSafeManagedPath(root, recordFile);
      await prepareSafeManagedPath(root, bodyFile);
      ids.push(id);
      next += 1;
    }
    state.next_retrieval = next;
    await saveCurrentState(root, state);
    return ids;
  });
}

export async function allocateQueryId(root: string): Promise<string> {
  return withProjectLock(root, async () => {
    const state = await loadCurrentState(root);
    const next = state.next_query ?? 1;
    const id = formatId("QRY", next);
    const recordFile = path.join(projectPaths(root).retrievals, `${id}.json`);
    if (await pathExists(recordFile)) throw new SdlcError(`Query ID ${id} is already reserved; repair state without overwriting provenance.`);
    await prepareSafeManagedPath(root, recordFile);
    state.next_query = next + 1;
    await saveCurrentState(root, state);
    return id;
  });
}

/**
 * Persist one retrieval. The body is written first and the record second, so
 * the record JSON is the commit point: a crash in between leaves an orphan
 * body that validation reports, never a record pointing at nothing. The body
 * is stored CRLF-normalized and the record must already carry the digest of
 * exactly that normalized text — recomputed here as a final coherence check.
 */
export async function writeRetrievalRecord(root: string, record: RetrievalRecord, body?: string): Promise<void> {
  const recordId = record.id;
  if (!isRetrievalRecord(record)) throw new SdlcError(`Malformed retrieval record: ${recordId}`);
  if (record.ok !== (body !== undefined)) throw new SdlcError(`Retrieval ${record.id}: a successful record requires a body and a failed record forbids one.`);
  return withProjectLock(root, async () => {
    const recordFile = path.join(projectPaths(root).retrievals, `${record.id}.json`);
    const bodyFile = path.join(projectPaths(root).retrievals, `${record.id}.md`);
    if (await pathExists(recordFile)) throw new SdlcError(`Retrieval record ${record.id} already exists; provenance is immutable.`);
    await prepareSafeManagedPath(root, recordFile);
    if (body !== undefined) {
      const normalized = normalizeText(body);
      if (record.body_file !== retrievalBodyFile(record.id)) throw new SdlcError(`Retrieval ${record.id}: body_file must be ${retrievalBodyFile(record.id)}.`);
      if (record.body_hash !== sha256(normalized)) throw new SdlcError(`Retrieval ${record.id}: body_hash does not match the body being written.`);
      await prepareSafeManagedPath(root, bodyFile);
      await writeFile(bodyFile, normalized, "utf8");
    }
    await writeJsonAtomic(recordFile, record);
  });
}

export async function writeQueryRecord(root: string, record: QueryRecord): Promise<void> {
  const recordId = record.id;
  if (!isQueryRecord(record)) throw new SdlcError(`Malformed query record: ${recordId}`);
  return withProjectLock(root, async () => {
    const recordFile = path.join(projectPaths(root).retrievals, `${record.id}.json`);
    if (await pathExists(recordFile)) throw new SdlcError(`Query record ${record.id} already exists; provenance is immutable.`);
    await prepareSafeManagedPath(root, recordFile);
    await writeJsonAtomic(recordFile, record);
  });
}

/**
 * Lenient loaders mirroring loadExecutionRecords: anything malformed is
 * silently skipped here and reported exactly once by the strict pass in
 * internal-validation.ts. Consumers (projections, evidence warnings) derive
 * views over provenance; a broken record must change the validate finding
 * set in one place, not two. Output is sorted by ID for deterministic use.
 */
async function loadRecords<T extends { id: string }>(root: string, pattern: string, guard: (value: unknown) => value is T): Promise<T[]> {
  const directory = projectPaths(root).retrievals;
  if (!(await pathExists(directory))) return [];
  try {
    await assertSafeManagedPath(root, path.join(directory, ".managed-probe"));
  } catch {
    return [];
  }
  const symlinks = new Set<string>();
  for (const entry of await readdir(directory, { withFileTypes: true })) if (entry.isSymbolicLink()) symlinks.add(entry.name);
  const files = await fg(pattern, { cwd: directory, absolute: true, followSymbolicLinks: false });
  const records: T[] = [];
  for (const file of files) {
    if (symlinks.has(path.basename(file))) continue;
    try {
      await assertSafeManagedPath(root, file);
      const record = await readJson<unknown>(file);
      if (!guard(record) || path.basename(file) !== `${record.id}.json`) continue;
      records.push(record);
    } catch {
      // Skipped; validate reports the defect through its strict loader.
    }
  }
  return records.sort((a, b) => a.id.localeCompare(b.id));
}

export async function loadRetrievalRecords(root: string): Promise<RetrievalRecord[]> {
  return loadRecords(root, "RET-*.json", isRetrievalRecord);
}

export async function loadQueryRecords(root: string): Promise<QueryRecord[]> {
  return loadRecords(root, "QRY-*.json", isQueryRecord);
}
