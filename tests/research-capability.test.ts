import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DEFAULT_RESEARCH_POLICY, loadResearchPolicy, probeResearchTools, resolveResearchCapability } from "../src/core/research-capability.js";
import { searxngSearch } from "../src/core/searxng.js";
import { detectFirecrawlVersion } from "../src/core/firecrawl.js";
import { camofoxFetch } from "../src/core/camofox.js";
import { cleanup, tempProject } from "./helpers.js";
import { clearResearchEnv, isDetectionPost, respondJson, startStub } from "./http-stub.js";
import type { HttpStub } from "./http-stub.js";

const roots: string[] = [];
const stubs: HttpStub[] = [];
afterEach(async () => {
  clearResearchEnv();
  while (stubs.length) await stubs.pop()!.close();
  while (roots.length) await cleanup(roots.pop()!);
});

describe("capability resolution", () => {
  it("resolves the rung as the highest configured tier and rejects malformed origins", () => {
    expect(resolveResearchCapability({}).rung).toBe(0);
    expect(resolveResearchCapability({ AI_SDLC_SEARXNG_URL: "http://localhost:8888" }).rung).toBe(1);
    expect(resolveResearchCapability({ AI_SDLC_SEARXNG_URL: "http://localhost:8888", AI_SDLC_FIRECRAWL_URL: "http://localhost:3002" }).rung).toBe(2);
    expect(resolveResearchCapability({ AI_SDLC_CAMOFOX_URL: "http://localhost:9377/" }).camofox?.url).toBe("http://localhost:9377");
    expect(resolveResearchCapability({ AI_SDLC_CAMOFOX_URL: "http://localhost:9377" }).rung).toBe(3);
    expect(() => resolveResearchCapability({ AI_SDLC_FIRECRAWL_URL: "localhost:3002" })).toThrow("http(s) origin");
  });

  it("attaches keys only when the key environment exists", () => {
    const bare = resolveResearchCapability({ AI_SDLC_FIRECRAWL_URL: "http://localhost:3002" });
    expect(bare.firecrawl?.key).toBeUndefined();
    const keyed = resolveResearchCapability({ AI_SDLC_FIRECRAWL_URL: "http://localhost:3002", AI_SDLC_FIRECRAWL_KEY: "fc-test" });
    expect(keyed.firecrawl?.key).toBe("fc-test");
  });

  it("loads policy defaults, merges known keys and rejects unknown or invalid values", async () => {
    const root = await tempProject();
    roots.push(root);
    expect(await loadResearchPolicy(root)).toEqual(DEFAULT_RESEARCH_POLICY);
    await writeFile(path.join(root, ".ai-saas-sdlc", "research-tools.json"), `${JSON.stringify({ crawl_page_cap: 5 })}\n`, "utf8");
    expect((await loadResearchPolicy(root)).crawl_page_cap).toBe(5);
    expect((await loadResearchPolicy(root)).body_max_bytes).toBe(DEFAULT_RESEARCH_POLICY.body_max_bytes);
    await writeFile(path.join(root, ".ai-saas-sdlc", "research-tools.json"), `${JSON.stringify({ unknown_cap: 5 })}\n`, "utf8");
    await expect(loadResearchPolicy(root)).rejects.toThrow("research-tools.json");
    await writeFile(path.join(root, ".ai-saas-sdlc", "research-tools.json"), `${JSON.stringify({ crawl_page_cap: "five" })}\n`, "utf8");
    await expect(loadResearchPolicy(root)).rejects.toThrow("integer");
  });
});

describe("probe", () => {
  it("reports rung 0 on an uninitialized directory with nothing configured", async () => {
    const bare = await mkdtemp(path.join(os.tmpdir(), "ai-saas-probe-"));
    roots.push(bare);
    const report = await probeResearchTools(bare, {});
    expect(report.rung).toBe(0);
    expect(report.configured_rung).toBe(0);
    expect(report.instruments).toEqual({ searxng: null, firecrawl: null, camofox: null });
  });

  it("reaches each configured instrument and detects the firecrawl generation", async () => {
    const searxng = await startStub((req, res) => respondJson(res, 200, { results: [] }));
    const firecrawl = await startStub((req, res, body) => {
      if (req.url === "/v0/health/readiness") return respondJson(res, 200, { status: "ok" });
      if (req.url === "/v2/scrape" && isDetectionPost(body)) return respondJson(res, 400, { error: "url required" });
      return respondJson(res, 404, {});
    });
    const camofox = await startStub((req, res) => {
      if (req.url === "/health") return respondJson(res, 200, { ok: true });
      return respondJson(res, 404, {});
    });
    stubs.push(searxng, firecrawl, camofox);
    const root = await tempProject();
    roots.push(root);
    const report = await probeResearchTools(root, {
      AI_SDLC_SEARXNG_URL: searxng.url,
      AI_SDLC_FIRECRAWL_URL: firecrawl.url,
      AI_SDLC_CAMOFOX_URL: camofox.url
    });
    expect(report.rung).toBe(3);
    expect(report.instruments.searxng?.reachable).toBe(true);
    expect(report.instruments.firecrawl?.reachable).toBe(true);
    expect(report.instruments.firecrawl?.api_version).toBe("v2");
    expect(report.instruments.camofox?.reachable).toBe(true);
    // /health must never carry auth; probe sent no Authorization header anywhere.
    expect(camofox.requests.every((request) => request.authorization === null)).toBe(true);
  });

  it("degrades the effective rung when a configured service is down and hints on searxng 403", async () => {
    const searxng = await startStub((req, res) => respondJson(res, 403, {}));
    stubs.push(searxng);
    const root = await tempProject();
    roots.push(root);
    const report = await probeResearchTools(root, {
      AI_SDLC_SEARXNG_URL: searxng.url,
      AI_SDLC_FIRECRAWL_URL: "http://127.0.0.1:1"
    });
    expect(report.configured_rung).toBe(2);
    expect(report.rung).toBe(0);
    expect(report.instruments.searxng?.reachable).toBe(false);
    expect(report.instruments.searxng?.hint).toContain("search.formats");
    expect(report.instruments.firecrawl?.reachable).toBe(false);
  });
});

describe("instrument clients", () => {
  it("searxng: targets engines, captures per-engine failures and raises the 403 hint", async () => {
    const stub = await startStub((req, res) => {
      if ((req.url ?? "").includes("format=json")) {
        return respondJson(res, 200, {
          results: [
            { url: "https://a.example/one", title: "One", engine: "reddit", score: 3.2, publishedDate: "2026-01-01" },
            { url: "https://b.example/two", engine: "hackernews" },
            { notAUrl: true }
          ],
          unresponsive_engines: [["stackoverflow", "timeout"], "reddit"]
        });
      }
      return respondJson(res, 400, {});
    });
    stubs.push(stub);
    const response = await searxngSearch({ url: stub.url }, { q: "workflow approvals", engines: ["reddit", "hackernews"], time_range: "month" }, 5000);
    expect(response.results.map((result) => result.url)).toEqual(["https://a.example/one", "https://b.example/two"]);
    expect(response.results[0]).toEqual({ url: "https://a.example/one", title: "One", engine: "reddit", score: 3.2, published: "2026-01-01" });
    expect(response.unresponsive_engines).toEqual(["reddit", "stackoverflow"]);
    expect(stub.requests[0]!.url).toContain("engines=reddit%2Chackernews");
    expect(stub.requests[0]!.url).toContain("time_range=month");

    const forbidden = await startStub((req, res) => respondJson(res, 403, {}));
    stubs.push(forbidden);
    await expect(searxngSearch({ url: forbidden.url }, { q: "x" }, 5000)).rejects.toThrow("search.formats: [html, json]");
  });

  it("firecrawl: detects v1 when v2 is absent and sends bearer only when a key exists", async () => {
    const stub = await startStub((req, res, body) => {
      if (req.url === "/v2/scrape") return respondJson(res, 404, {});
      if (req.url === "/v1/scrape" && isDetectionPost(body)) return respondJson(res, 400, { error: "url required" });
      return respondJson(res, 404, {});
    });
    stubs.push(stub);
    expect(await detectFirecrawlVersion({ url: stub.url }, 5000)).toBe("v1");
    expect(stub.requests.every((request) => request.authorization === null)).toBe(true);
    expect(await detectFirecrawlVersion({ url: stub.url, key: "fc-secret" }, 5000)).toBe("v1");
    expect(stub.requests.at(-1)!.authorization).toBe("Bearer fc-secret");
  });

  it("camofox: paginates snapshots, caps at maxBytes and always deletes its tab", async () => {
    const first = "alpha ".repeat(10);
    const second = "beta ".repeat(10);
    const stub = await startStub((req, res) => {
      const url = req.url ?? "";
      if (req.method === "POST" && url === "/tabs") return respondJson(res, 200, { tabId: "t1" });
      if (req.method === "POST" && url.startsWith("/tabs/t1/wait")) return respondJson(res, 200, {});
      if (req.method === "GET" && url.startsWith("/tabs/t1/snapshot")) {
        const offset = new URL(url, "http://x").searchParams.get("offset");
        if (offset === null) return respondJson(res, 200, { snapshot: first });
        if (Number(offset) === first.length) return respondJson(res, 200, { snapshot: second });
        return respondJson(res, 200, { snapshot: "" });
      }
      if (req.method === "DELETE" && url.startsWith("/tabs/t1")) return respondJson(res, 200, {});
      return respondJson(res, 404, {});
    });
    stubs.push(stub);
    const exhausted = await camofoxFetch({ url: stub.url }, "https://blocked.example/page", "RET-001", { waitMs: 10, timeoutMs: 5000, maxBytes: 4096 });
    expect(exhausted.text).toBe(first + second);
    expect(exhausted.pages).toBe(2);
    expect(exhausted.exhausted).toBe(true);
    expect(stub.requests.some((request) => request.method === "DELETE")).toBe(true);

    const capped = await camofoxFetch({ url: stub.url }, "https://blocked.example/page", "RET-002", { waitMs: 10, timeoutMs: 5000, maxBytes: 16 });
    expect(capped.exhausted).toBe(false);

    const failing = await startStub((req, res) => {
      const url = req.url ?? "";
      if (req.method === "POST" && url === "/tabs") return respondJson(res, 200, { tabId: "t9" });
      if (req.method === "POST" && url.startsWith("/tabs/t9/wait")) return respondJson(res, 200, {});
      if (req.method === "GET" && url.startsWith("/tabs/t9/snapshot")) return respondJson(res, 500, {});
      if (req.method === "DELETE" && url.startsWith("/tabs/t9")) return respondJson(res, 200, {});
      return respondJson(res, 404, {});
    });
    stubs.push(failing);
    await expect(camofoxFetch({ url: failing.url }, "https://blocked.example/x", "RET-003", { waitMs: 10, timeoutMs: 5000, maxBytes: 4096 })).rejects.toThrow("snapshot failed");
    // The tab is closed even when the snapshot errors.
    expect(failing.requests.some((request) => request.method === "DELETE")).toBe(true);
  });
});
