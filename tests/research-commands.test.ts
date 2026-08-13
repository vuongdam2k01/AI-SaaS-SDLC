import { afterEach, describe, expect, it } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { researchCrawl, researchDiff, researchFetch, researchMap, researchSearch } from "../src/core/research.js";
import { loadQueryRecords, loadRetrievalRecords } from "../src/core/retrieval-records.js";
import { loadCurrentState, closeFlow, startFlow } from "../src/core/state.js";
import { refreshProject } from "../src/core/project.js";
import { createBaseline } from "../src/core/baseline.js";
import { scanArtifacts } from "../src/core/artifacts.js";
import { validateProject } from "../src/core/validation.js";
import { sha256 } from "../src/core/utils.js";
import { cleanup, prepareGenesisArtifacts, tempProject } from "./helpers.js";
import { clearResearchEnv, isDetectionPost, respondJson, startStub } from "./http-stub.js";
import type { HttpStub } from "./http-stub.js";
import type { IncomingMessage, ServerResponse } from "node:http";

const roots: string[] = [];
const stubs: HttpStub[] = [];
afterEach(async () => {
  clearResearchEnv();
  while (stubs.length) await stubs.pop()!.close();
  while (roots.length) await cleanup(roots.pop()!);
});

async function searxngStub(): Promise<HttpStub> {
  const stub = await startStub((req, res) => respondJson(res, 200, {
    results: [{ url: "https://source.example/report", title: "Report", engine: "reddit" }],
    unresponsive_engines: ["stackoverflow"]
  }));
  stubs.push(stub);
  return stub;
}

function firecrawlHandler(markdown: string): (req: IncomingMessage, res: ServerResponse, body: string) => void {
  return (req, res, body) => {
    const url = req.url ?? "";
    if (url === "/v0/health/readiness") return respondJson(res, 200, { status: "ok" });
    if (url === "/v2/scrape" && isDetectionPost(body)) return respondJson(res, 400, { error: "url required" });
    if (url === "/v2/scrape") {
      const requested = (JSON.parse(body) as { url: string }).url;
      return respondJson(res, 200, { success: true, data: { markdown, metadata: { title: "Page", sourceURL: requested, statusCode: 200 } } });
    }
    return respondJson(res, 404, {});
  };
}

describe("research command gating", () => {
  it("requires an active genesis or reassessment flow and a configured instrument", async () => {
    const root = await tempProject();
    roots.push(root);
    const stub = await searxngStub();
    process.env.AI_SDLC_SEARXNG_URL = stub.url;
    await expect(researchSearch(root, { query: "anything" })).rejects.toThrow("Genesis or Evidence Reassessment");
    await startFlow(root, "genesis", "Approval workflow SaaS");
    clearResearchEnv();
    await expect(researchSearch(root, { query: "anything" })).rejects.toThrow("No research instrument is configured");
    process.env.AI_SDLC_SEARXNG_URL = stub.url;
    await expect(researchFetch(root, { url: "https://a.example" })).rejects.toThrow("No inspection instrument is configured");
    await expect(researchMap(root, { url: "https://a.example" })).rejects.toThrow("Firecrawl is not configured");
  });
});

describe("search and map records", () => {
  it("writes an immutable QRY record with pass targeting, caps and per-engine failures", async () => {
    const root = await tempProject();
    roots.push(root);
    await startFlow(root, "genesis", "Approval workflow SaaS");
    const stub = await searxngStub();
    process.env.AI_SDLC_SEARXNG_URL = stub.url;
    const record = await researchSearch(root, { query: "approval workflow pain", pass: "discussion", timeRange: "month" });
    expect(record.ok).toBe(true);
    expect(record.id).toBe("QRY-001");
    expect(record.flow_id).toBe("FLOW-001");
    expect(record.capability_rung).toBe(1);
    expect(record.pass).toBe("discussion");
    expect(record.engines).toEqual(["reddit", "hackernews", "stackoverflow"]);
    expect(record.unresponsive_engines).toEqual(["stackoverflow"]);
    expect(record.git_commit).toBeNull();
    expect((await loadCurrentState(root)).next_query).toBe(2);
    const loaded = await loadQueryRecords(root);
    expect(loaded.map((item) => item.id)).toEqual(["QRY-001"]);
    // Post-command projections are already synchronized.
    expect(await refreshProject(root, true)).toEqual([]);
  });

  it("records a failed search as ok:false instead of pretending nothing happened", async () => {
    const root = await tempProject();
    roots.push(root);
    await startFlow(root, "genesis", "Approval workflow SaaS");
    const stub = await startStub((req, res) => respondJson(res, 500, {}));
    stubs.push(stub);
    process.env.AI_SDLC_SEARXNG_URL = stub.url;
    const record = await researchSearch(root, { query: "anything" });
    expect(record.ok).toBe(false);
    expect(record.error).toContain("HTTP 500");
    expect((await loadQueryRecords(root))[0]!.ok).toBe(false);
  });

  it("maps a site through firecrawl as a QRY record with the detected api generation", async () => {
    const root = await tempProject();
    roots.push(root);
    await startFlow(root, "genesis", "Approval workflow SaaS");
    const stub = await startStub((req, res, body) => {
      const url = req.url ?? "";
      if (url === "/v2/scrape" && isDetectionPost(body)) return respondJson(res, 400, {});
      if (url === "/v2/map") return respondJson(res, 200, { success: true, links: [{ url: "https://c.example/pricing", title: "Pricing" }, "https://c.example/security"] });
      return respondJson(res, 404, {});
    });
    stubs.push(stub);
    process.env.AI_SDLC_FIRECRAWL_URL = stub.url;
    const record = await researchMap(root, { url: "https://c.example", search: "pricing" });
    expect(record.ok).toBe(true);
    expect(record.kind).toBe("map");
    expect(record.api_version).toBe("v2");
    expect(record.results).toEqual([{ url: "https://c.example/pricing", title: "Pricing" }, { url: "https://c.example/security" }]);
  });
});

describe("fetch records", () => {
  it("stores a CRLF-normalized hashed body whose digest survives recomputation", async () => {
    const root = await tempProject();
    roots.push(root);
    await startFlow(root, "genesis", "Approval workflow SaaS");
    const stub = await startStub(firecrawlHandler("line one\r\nline two\r\n"));
    stubs.push(stub);
    process.env.AI_SDLC_FIRECRAWL_URL = stub.url;
    const record = await researchFetch(root, { url: "https://source.example/report" });
    expect(record.ok).toBe(true);
    expect(record.instrument).toBe("firecrawl");
    expect(record.api_version).toBe("v2");
    expect(record.capability_rung).toBe(2);
    expect(record.body_file).toBe(".ai-saas-sdlc/retrievals/RET-001.md");
    const stored = await readFile(path.join(root, record.body_file!), "utf8");
    expect(stored).toBe("line one\nline two\n");
    expect(sha256(stored)).toBe(record.body_hash);
    expect(record.truncated).toBe(false);
    const report = await validateProject(root, await scanArtifacts(root));
    expect(report.findings.filter((finding) => finding.code.startsWith("RETRIEVAL_"))).toEqual([]);
    expect(await refreshProject(root, true)).toEqual([]);
  });

  it("records a hard failure, burns the counter and stands as RETRIEVAL_RUNG_DEGRADED", async () => {
    const root = await tempProject();
    roots.push(root);
    await startFlow(root, "genesis", "Approval workflow SaaS");
    const stub = await startStub((req, res, body) => {
      if ((req.url ?? "") === "/v2/scrape" && isDetectionPost(body)) return respondJson(res, 400, {});
      return respondJson(res, 500, { error: "blocked" });
    });
    stubs.push(stub);
    process.env.AI_SDLC_FIRECRAWL_URL = stub.url;
    const record = await researchFetch(root, { url: "https://blocked.example/page" });
    expect(record.ok).toBe(false);
    expect(record.instrument).toBe("firecrawl");
    expect(record.error).toContain("blocked");
    expect((await loadCurrentState(root)).next_retrieval).toBe(2);
    const report = await validateProject(root, await scanArtifacts(root));
    expect(report.findings.some((finding) => finding.code === "RETRIEVAL_RUNG_DEGRADED")).toBe(true);
    expect(report.valid).toBe(true);
  });

  it("escalates to camofox on firecrawl failure and stamps the escalation on one record", async () => {
    const root = await tempProject();
    roots.push(root);
    await startFlow(root, "genesis", "Approval workflow SaaS");
    const firecrawl = await startStub((req, res, body) => {
      if ((req.url ?? "") === "/v2/scrape" && isDetectionPost(body)) return respondJson(res, 400, {});
      return respondJson(res, 403, { error: "bot detected" });
    });
    const camofox = await startStub((req, res) => {
      const url = req.url ?? "";
      if (req.method === "POST" && url === "/tabs") return respondJson(res, 200, { tabId: "t1" });
      if (req.method === "POST" && url.startsWith("/tabs/t1/wait")) return respondJson(res, 200, {});
      if (req.method === "GET" && url.startsWith("/tabs/t1/snapshot")) {
        const offset = new URL(url, "http://x").searchParams.get("offset");
        return respondJson(res, 200, { snapshot: offset === null ? "rendered page text" : "" });
      }
      if (req.method === "DELETE" && url.startsWith("/tabs/t1")) return respondJson(res, 200, {});
      return respondJson(res, 404, {});
    });
    stubs.push(firecrawl, camofox);
    process.env.AI_SDLC_FIRECRAWL_URL = firecrawl.url;
    process.env.AI_SDLC_CAMOFOX_URL = camofox.url;
    const record = await researchFetch(root, { url: "https://blocked.example/page" });
    expect(record.ok).toBe(true);
    expect(record.instrument).toBe("camofox");
    expect(record.capability_rung).toBe(3);
    expect(record.escalation?.from).toBe("firecrawl");
    expect(record.escalation?.reason).toContain("bot detected");
    expect((await loadRetrievalRecords(root)).length).toBe(1);
    expect(camofox.requests.some((request) => request.method === "DELETE")).toBe(true);
    // The camofox sessionKey is the retrieval identity.
    expect(camofox.requests.find((request) => request.method === "POST" && request.url === "/tabs")!.body).toContain(record.id);
  });
});

describe("crawl, diff and the genesis gate", () => {
  it("crawls a bounded subtree into per-page records and leaves unused identities burned", async () => {
    const root = await tempProject();
    roots.push(root);
    await startFlow(root, "genesis", "Approval workflow SaaS");
    const stub = await startStub((req, res, body) => {
      const url = req.url ?? "";
      if (url === "/v2/scrape" && isDetectionPost(body)) return respondJson(res, 400, {});
      if (req.method === "POST" && url === "/v2/crawl") return respondJson(res, 200, { success: true, id: "job-1" });
      if (req.method === "GET" && url === "/v2/crawl/job-1") {
        return respondJson(res, 200, {
          status: "completed",
          data: [
            { markdown: "pricing page", metadata: { sourceURL: "https://c.example/pricing", title: "Pricing", statusCode: 200 } },
            { markdown: "security page", metadata: { sourceURL: "https://c.example/security", statusCode: 200 } }
          ]
        });
      }
      return respondJson(res, 404, {});
    });
    stubs.push(stub);
    process.env.AI_SDLC_FIRECRAWL_URL = stub.url;
    const report = await researchCrawl(root, { url: "https://c.example", include: ["/pricing", "/security"], limit: 5 });
    expect(report.page_cap).toBe(5);
    expect(report.pages_returned).toBe(2);
    expect(report.records.map((record) => record.id)).toEqual(["RET-001", "RET-002"]);
    expect(report.records.every((record) => record.via === "crawl" && record.crawl_seed === "https://c.example")).toBe(true);
    // Three reserved identities stay burned; validation accepts the gap.
    expect((await loadCurrentState(root)).next_retrieval).toBe(6);
    const validation = await validateProject(root, await scanArtifacts(root));
    expect(validation.findings.filter((finding) => finding.severity === "error")).toEqual([]);
  });

  it("diffs two stored bodies of the same URL deterministically", async () => {
    const root = await tempProject();
    roots.push(root);
    await startFlow(root, "genesis", "Approval workflow SaaS");
    let version = 0;
    const stub = await startStub((req, res, body) => {
      const url = req.url ?? "";
      if (url === "/v0/health/readiness") return respondJson(res, 200, {});
      if (url === "/v2/scrape" && isDetectionPost(body)) return respondJson(res, 400, {});
      if (url === "/v2/scrape") {
        version += 1;
        const markdown = version === 1 ? "price: $10\ncommon line\n" : "price: $12\ncommon line\n";
        return respondJson(res, 200, { success: true, data: { markdown, metadata: { sourceURL: "https://c.example/pricing" } } });
      }
      return respondJson(res, 404, {});
    });
    stubs.push(stub);
    process.env.AI_SDLC_FIRECRAWL_URL = stub.url;
    await researchFetch(root, { url: "https://c.example/pricing" });
    const second = await researchFetch(root, { url: "https://c.example/pricing" });
    const diff = await researchDiff(root, { ret: second.id });
    expect(diff.against).toBe("RET-001");
    expect(diff.changed).toBe(true);
    expect(diff.added_lines).toBe(1);
    expect(diff.removed_lines).toBe(1);
    expect(diff.preview).toContain("- price: $10");
    expect(diff.preview).toContain("+ price: $12");
    const unchanged = await researchDiff(root, { ret: second.id, against: second.id });
    expect(unchanged.changed).toBe(false);
  });

  it("blocks a genesis baseline until one EVD entry cites a flow retrieval", async () => {
    const root = await tempProject();
    roots.push(root);
    await startFlow(root, "genesis", "Approval workflow SaaS");
    await prepareGenesisArtifacts(root);
    const stub = await startStub(firecrawlHandler("fixture product guide content"));
    stubs.push(stub);
    process.env.AI_SDLC_FIRECRAWL_URL = stub.url;
    const record = await researchFetch(root, { url: "https://source.example/report" });
    expect(record.ok).toBe(true);
    await expect(createBaseline(root)).rejects.toThrow("must cite its RET-* retrieval record");
    const ledgerFile = path.join(root, "01-discovery", "evidence-ledger.md");
    const ledger = await readFile(ledgerFile, "utf8");
    const anchor = "- URL: https://approval.example.invalid/fixture-product-guide";
    expect(ledger).toContain(anchor);
    await writeFile(ledgerFile, ledger.replace(anchor, `${anchor}\n- Retrieval: ${record.id}`), "utf8");
    const baseline = await createBaseline(root);
    expect(baseline.id).toBe("BL-000");
    await closeFlow(root);
  });
});
