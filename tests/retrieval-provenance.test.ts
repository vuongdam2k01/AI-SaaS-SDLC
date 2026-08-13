import { afterEach, describe, expect, it } from "vitest";
import { mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { allocateRetrievalIds, retrievalBodyFile, writeRetrievalRecord } from "../src/core/retrieval-records.js";
import { loadCurrentState, saveCurrentState } from "../src/core/state.js";
import { scanArtifacts } from "../src/core/artifacts.js";
import { validateProject } from "../src/core/validation.js";
import { sha256 } from "../src/core/utils.js";
import type { RetrievalRecord } from "../src/core/types.js";
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

async function findings(root: string): Promise<Array<{ severity: string; code: string; message: string }>> {
  return (await validateProject(root, await scanArtifacts(root))).findings;
}

describe("retrieval provenance", () => {
  it("detects a tampered body through the digest", async () => {
    const root = await tempProject();
    roots.push(root);
    const [id] = await allocateRetrievalIds(root, 1);
    await writeRetrievalRecord(root, okRetrieval(id!, "original body\n"), "original body\n");
    const bodyFile = path.join(root, retrievalBodyFile(id!));
    await writeFile(bodyFile, `${await readFile(bodyFile, "utf8")}tampered`, "utf8");
    const report = await findings(root);
    expect(report.some((finding) => finding.code === "RETRIEVAL_PROVENANCE_INVALID" && finding.message.includes("digest"))).toBe(true);
  });

  it("rejects a forged record whose hash never matched a stored body", async () => {
    const root = await tempProject();
    roots.push(root);
    await allocateRetrievalIds(root, 1);
    const record = { ...okRetrieval("RET-001", "claimed body\n"), body_hash: "a".repeat(64) };
    const directory = path.join(root, ".ai-saas-sdlc", "retrievals");
    await writeFile(path.join(directory, "RET-001.md"), "claimed body\n", "utf8");
    await writeFile(path.join(directory, "RET-001.json"), `${JSON.stringify(record, null, 2)}\n`, "utf8");
    const report = await findings(root);
    expect(report.some((finding) => finding.code === "RETRIEVAL_PROVENANCE_INVALID" && finding.message.includes("digest"))).toBe(true);
  });

  it("reports a missing body, an orphan body and a body beside a failed record", async () => {
    const root = await tempProject();
    roots.push(root);
    const ids = await allocateRetrievalIds(root, 3);
    const directory = path.join(root, ".ai-saas-sdlc", "retrievals");
    // Record without its body.
    await writeFile(path.join(directory, `${ids[0]}.json`), `${JSON.stringify(okRetrieval(ids[0]!, "gone\n"), null, 2)}\n`, "utf8");
    // Body without any record.
    await writeFile(path.join(directory, `${ids[1]}.md`), "orphan\n", "utf8");
    // Failed record with a body it must not have.
    const failed: RetrievalRecord = {
      schema_version: 1,
      id: ids[2]!,
      flow_id: "FLOW-001",
      url: "https://source.example/report",
      instrument: "camofox",
      via: "fetch",
      ok: false,
      capability_rung: 3,
      started_at: "2026-08-12T00:00:00.000Z",
      ended_at: "2026-08-12T00:00:01.000Z",
      git_commit: null,
      error: "HTTP 500",
      escalation: { from: "firecrawl", reason: "HTTP 403" }
    };
    await writeFile(path.join(directory, `${ids[2]}.json`), `${JSON.stringify(failed, null, 2)}\n`, "utf8");
    await writeFile(path.join(directory, `${ids[2]}.md`), "fabricated\n", "utf8");
    const report = await findings(root);
    expect(report.some((finding) => finding.code === "RETRIEVAL_PROVENANCE_INVALID" && finding.message.includes(`${ids[0]}: retrieval body is missing`))).toBe(true);
    expect(report.some((finding) => finding.code === "RETRIEVAL_BODY_ORPHAN" && finding.message.includes(`${ids[1]}.md`))).toBe(true);
    expect(report.some((finding) => finding.code === "RETRIEVAL_PROVENANCE_INVALID" && finding.message.includes("must not have a body"))).toBe(true);
  });

  it("reports malformed records, foreign names and symlinked entries as errors", async () => {
    const root = await tempProject();
    roots.push(root);
    const directory = path.join(root, ".ai-saas-sdlc", "retrievals");
    await writeFile(path.join(directory, "RET-001.json"), "{not json", "utf8");
    await writeFile(path.join(directory, "OTHER-001.json"), "{}", "utf8");
    const outside = path.join(root, "outside-target");
    await mkdir(outside, { recursive: true });
    await symlink(outside, path.join(directory, "linked-entry"), process.platform === "win32" ? "junction" : "dir");
    const report = await findings(root);
    expect(report.some((finding) => finding.code === "RETRIEVAL_INVALID" && finding.message.includes("RET-001.json"))).toBe(true);
    expect(report.some((finding) => finding.code === "RETRIEVAL_INVALID" && finding.message.includes("OTHER-001.json"))).toBe(true);
    expect(report.some((finding) => finding.code === "INTERNAL_RECORD_SYMLINK" && finding.message.includes("linked-entry"))).toBe(true);
  });

  it("reports counter reuse for retrievals and queries", async () => {
    const root = await tempProject();
    roots.push(root);
    const [id] = await allocateRetrievalIds(root, 1);
    await writeRetrievalRecord(root, okRetrieval(id!, "body\n"), "body\n");
    const state = await loadCurrentState(root);
    state.next_retrieval = 1;
    await saveCurrentState(root, state);
    const report = await findings(root);
    expect(report.some((finding) => finding.code === "RETRIEVAL_COUNTER_REUSED" && finding.message.includes("next_retrieval"))).toBe(true);
  });

  it("keeps legacy state without retrieval counters fully valid", async () => {
    const root = await tempProject();
    roots.push(root);
    const state = await loadCurrentState(root);
    expect(state.next_retrieval).toBeUndefined();
    expect(state.next_query).toBeUndefined();
    const report = await validateProject(root, await scanArtifacts(root));
    expect(report.findings.filter((finding) => finding.code.startsWith("RETRIEVAL_") || finding.code.startsWith("EVD_RETRIEVAL"))).toEqual([]);
  });
});
