import { afterEach, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildProjections } from "../src/core/projections.js";
import { buildGraph } from "../src/core/graph.js";
import { calculateImpact } from "../src/core/impact.js";
import { scanArtifacts } from "../src/core/artifacts.js";
import { refreshProject } from "../src/core/project.js";
import { allocateQueryId, allocateRetrievalIds, retrievalBodyFile, writeQueryRecord, writeRetrievalRecord } from "../src/core/retrieval-records.js";
import { sha256 } from "../src/core/utils.js";
import type { QueryRecord, RetrievalRecord } from "../src/core/types.js";
import { cleanup, tempProject } from "./helpers.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

describe("research coverage projection", () => {
  it("is byte-identical to the pre-instrument output when no records exist", async () => {
    const root = await tempProject();
    roots.push(root);
    const artifacts = await scanArtifacts(root);
    const graph = buildGraph(artifacts);
    const impact = calculateImpact(artifacts, graph, null);
    const withDefaults = buildProjections(artifacts, graph, impact, null, null, null, []);
    const withEmpty = buildProjections(artifacts, graph, impact, null, null, null, [], [], []);
    expect(withEmpty["research-coverage.md"]).toBe(withDefaults["research-coverage.md"]);
    expect(withDefaults["research-coverage.md"]).not.toContain("Retrieval provenance");
    const onDisk = await readFile(path.join(root, "generated", "research-coverage.md"), "utf8");
    expect(onDisk).not.toContain("Retrieval provenance");
  });

  it("appends sorted retrieval, query and usage sections only when records exist, without drift", async () => {
    const root = await tempProject();
    roots.push(root);
    const ids = await allocateRetrievalIds(root, 2);
    const body = "page body\n";
    const ok: RetrievalRecord = {
      schema_version: 1,
      id: ids[0]!,
      flow_id: "FLOW-001",
      url: "https://source.example/with|pipe",
      instrument: "firecrawl",
      via: "fetch",
      ok: true,
      capability_rung: 3,
      started_at: "2026-08-12T00:00:00.000Z",
      ended_at: "2026-08-12T00:00:01.000Z",
      git_commit: null,
      body_file: retrievalBodyFile(ids[0]!),
      body_hash: sha256(body),
      body_bytes: Buffer.byteLength(body, "utf8"),
      truncated: false
    };
    const failed: RetrievalRecord = {
      schema_version: 1,
      id: ids[1]!,
      flow_id: "FLOW-001",
      url: "https://blocked.example/page",
      instrument: "camofox",
      via: "fetch",
      ok: false,
      capability_rung: 3,
      started_at: "2026-08-12T00:00:02.000Z",
      ended_at: "2026-08-12T00:00:03.000Z",
      git_commit: null,
      error: "HTTP 500",
      escalation: { from: "firecrawl", reason: "HTTP 403" }
    };
    await writeRetrievalRecord(root, ok, body);
    await writeRetrievalRecord(root, failed);
    const query: QueryRecord = {
      schema_version: 1,
      id: await allocateQueryId(root),
      flow_id: "FLOW-001",
      kind: "search",
      instrument: "searxng",
      ok: true,
      capability_rung: 3,
      query: "pain | signals",
      started_at: "2026-08-12T00:00:00.000Z",
      ended_at: "2026-08-12T00:00:01.000Z",
      git_commit: null,
      pass: "counter",
      results: [{ url: "https://source.example/with|pipe" }],
      result_count: 1,
      unresponsive_engines: ["stackoverflow"]
    };
    await writeQueryRecord(root, query);
    await refreshProject(root, false);
    const projection = await readFile(path.join(root, "generated", "research-coverage.md"), "utf8");
    expect(projection).toContain("## Retrieval provenance");
    expect(projection).toContain("## Query passes");
    expect(projection).toContain("## Instrument usage");
    expect(projection.indexOf("`RET-001`")).toBeLessThan(projection.indexOf("`RET-002`"));
    expect(projection).toContain("camofox (escalated)");
    expect(projection).toContain("https://source.example/with\\|pipe");
    expect(projection).toContain("pain \\| signals");
    expect(projection).toContain("- SearXNG searches: 1 ok, 0 failed");
    expect(projection).toContain("- Camofox retrievals: 0 ok, 1 failed");
    // Deterministic: a re-render reports no drift.
    expect(await refreshProject(root, true)).toEqual([]);
  });
});
