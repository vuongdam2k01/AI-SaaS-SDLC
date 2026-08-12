import { afterEach, describe, expect, it } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { cleanup, tempProject } from "./helpers.js";
import { loadExecutionRecords } from "../src/core/execution-records.js";
import { sha256 } from "../src/core/utils.js";
import type { ExecutionRecord } from "../src/core/types.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

/** The 14-field record shape every engine before 1.5.0 wrote. */
function record(id: string, extra: Partial<ExecutionRecord> = {}): ExecutionRecord {
  return {
    schema_version: 1, id, flow_id: "FLOW-001", level: "unit", command_id: "unit-fixture",
    command: `node -e "console.log('first')"`, cwd: ".", started_at: "2026-01-01T00:00:00.000Z",
    ended_at: "2026-01-01T00:00:01.000Z", exit_code: 0, output_hash: sha256("first\n"),
    output_file: `.ai-saas-sdlc/executions/${id}.log`, git_commit: null, source_snapshot_hash: "1".repeat(64),
    ...extra
  };
}

async function writeRecordFile(root: string, name: string, content: string): Promise<void> {
  const directory = path.join(root, ".ai-saas-sdlc", "executions");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, name), content, "utf8");
}

describe("tolerant execution record loader", () => {
  it("returns an empty list when no executions directory exists", async () => {
    const root = await tempProject();
    roots.push(root);
    expect(await loadExecutionRecords(root)).toEqual([]);
  });

  it("loads well-formed records sorted by ID, old and new shapes alike", async () => {
    const root = await tempProject();
    roots.push(root);
    const modern = record("EXEC-002", { platforms: ["PLT-WIN-001"], host: { os: "win32", release: "10.0.19045", arch: "x64", node: "24.11.1" } });
    await writeRecordFile(root, "EXEC-002.json", JSON.stringify(modern));
    await writeRecordFile(root, "EXEC-001.json", JSON.stringify(record("EXEC-001")));
    const records = await loadExecutionRecords(root);
    expect(records.map((item) => item.id)).toEqual(["EXEC-001", "EXEC-002"]);
    expect(records[1]!.host?.os).toBe("win32");
  });

  it("silently skips what the strict validator reports: bad JSON, bad schema, mismatched filename", async () => {
    const root = await tempProject();
    roots.push(root);
    await writeRecordFile(root, "EXEC-001.json", JSON.stringify(record("EXEC-001")));
    await writeRecordFile(root, "EXEC-002.json", "{ not json");
    await writeRecordFile(root, "EXEC-003.json", JSON.stringify({ id: "EXEC-003" }));
    await writeRecordFile(root, "EXEC-004.json", JSON.stringify(record("EXEC-005")));
    await writeRecordFile(root, "EXEC-006.json", JSON.stringify({ ...record("EXEC-006"), forged: true }));
    expect((await loadExecutionRecords(root)).map((item) => item.id)).toEqual(["EXEC-001"]);
  });
});
