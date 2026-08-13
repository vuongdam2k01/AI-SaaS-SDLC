import { afterEach, describe, expect, it } from "vitest";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { allocateQueryId, allocateRetrievalIds, loadQueryRecords, loadRetrievalRecords, retrievalBodyFile, writeQueryRecord, writeRetrievalRecord } from "../src/core/retrieval-records.js";
import { loadCurrentState } from "../src/core/state.js";
import { sha256 } from "../src/core/utils.js";
import type { QueryRecord, RetrievalRecord } from "../src/core/types.js";
import { cleanup, tempProject } from "./helpers.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

function okRetrieval(id: string, body: string): RetrievalRecord {
  return {
    schema_version: 1,
    id,
    flow_id: "FLOW-001",
    url: "https://source.example/report",
    instrument: "firecrawl",
    via: "fetch",
    ok: true,
    capability_rung: 2,
    started_at: "2026-08-12T00:00:00.000Z",
    ended_at: "2026-08-12T00:00:01.000Z",
    git_commit: null,
    body_file: retrievalBodyFile(id),
    body_hash: sha256(body),
    body_bytes: Buffer.byteLength(body, "utf8"),
    truncated: false
  };
}

describe("retrieval identity and persistence", () => {
  it("burns counters before use, reserves in batches and refuses collisions", async () => {
    const root = await tempProject();
    roots.push(root);
    expect(await allocateRetrievalIds(root, 2)).toEqual(["RET-001", "RET-002"]);
    expect((await loadCurrentState(root)).next_retrieval).toBe(3);
    expect(await allocateQueryId(root)).toBe("QRY-001");
    expect((await loadCurrentState(root)).next_query).toBe(2);
    // A pre-existing file at the next identity is a provenance conflict, never an overwrite.
    await writeFile(path.join(root, ".ai-saas-sdlc", "retrievals", "RET-003.md"), "squatter\n", "utf8");
    await expect(allocateRetrievalIds(root, 1)).rejects.toThrow("already reserved");
  });

  it("allocates disjoint identities under concurrency", async () => {
    const root = await tempProject();
    roots.push(root);
    const results = await Promise.allSettled([allocateRetrievalIds(root, 1), allocateRetrievalIds(root, 1)]);
    const fulfilled = results.filter((result): result is PromiseFulfilledResult<string[]> => result.status === "fulfilled").flatMap((result) => result.value);
    // The lock serializes both; each allocation is unique whether or not one retried.
    expect(new Set(fulfilled).size).toBe(fulfilled.length);
    expect((await loadCurrentState(root)).next_retrieval).toBeGreaterThanOrEqual(fulfilled.length + 1);
  });

  it("writes body-then-record, verifies the digest and refuses overwrites and incoherent pairs", async () => {
    const root = await tempProject();
    roots.push(root);
    const [id] = await allocateRetrievalIds(root, 1);
    const record = okRetrieval(id!, "stored body\n");
    await expect(writeRetrievalRecord(root, { ...record, body_hash: "0".repeat(64) }, "stored body\n")).rejects.toThrow("does not match");
    await expect(writeRetrievalRecord(root, record)).rejects.toThrow("requires a body");
    await writeRetrievalRecord(root, record, "stored body\n");
    await expect(writeRetrievalRecord(root, record, "stored body\n")).rejects.toThrow("immutable");
    const failed: RetrievalRecord = { ...okRetrieval("RET-002", "x"), ok: false, error: "HTTP 500" };
    delete (failed as Partial<RetrievalRecord>).body_file;
    delete (failed as Partial<RetrievalRecord>).body_hash;
    delete (failed as Partial<RetrievalRecord>).body_bytes;
    delete (failed as Partial<RetrievalRecord>).truncated;
    await expect(writeRetrievalRecord(root, failed, "a body")).rejects.toThrow("forbids one");
  });

  it("loads leniently: malformed, misnamed and foreign files are skipped, output sorted", async () => {
    const root = await tempProject();
    roots.push(root);
    const ids = await allocateRetrievalIds(root, 2);
    await writeRetrievalRecord(root, okRetrieval(ids[1]!, "b\n"), "b\n");
    await writeRetrievalRecord(root, okRetrieval(ids[0]!, "a\n"), "a\n");
    const directory = path.join(root, ".ai-saas-sdlc", "retrievals");
    await writeFile(path.join(directory, "RET-999.json"), "not json", "utf8");
    await writeFile(path.join(directory, "QRY-777.json"), `${JSON.stringify({ schema_version: 1, id: "QRY-778" })}\n`, "utf8");
    expect((await loadRetrievalRecords(root)).map((record) => record.id)).toEqual(["RET-001", "RET-002"]);
    expect(await loadQueryRecords(root)).toEqual([]);
    const query: QueryRecord = {
      schema_version: 1,
      id: await allocateQueryId(root),
      flow_id: "FLOW-001",
      kind: "search",
      instrument: "searxng",
      ok: true,
      capability_rung: 1,
      query: "q",
      started_at: "2026-08-12T00:00:00.000Z",
      ended_at: "2026-08-12T00:00:01.000Z",
      git_commit: null,
      results: [{ url: "https://a.example" }],
      result_count: 1
    };
    await writeQueryRecord(root, query);
    expect((await loadQueryRecords(root)).map((record) => record.id)).toEqual(["QRY-001"]);
  });
});
