import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ActiveFlow, QueryRecord, RetrievalRecord } from "./types.js";
import { SdlcError } from "./errors.js";
import { gitCommit } from "./git.js";
import { loadActiveFlow } from "./state.js";
import { normalizeText, sha256 } from "./utils.js";
import { refreshProject } from "./project.js";
import { loadResearchPolicy, resolveResearchCapability } from "./research-capability.js";
import type { InstrumentConfig, ResearchCapability, ResearchPolicy } from "./research-capability.js";
import { passEngines, searxngSearch } from "./searxng.js";
import type { SearchPass } from "./searxng.js";
import { detectFirecrawlVersion, firecrawlCrawl, firecrawlMap, firecrawlScrape } from "./firecrawl.js";
import type { FirecrawlApiVersion } from "./firecrawl.js";
import { camofoxFetch } from "./camofox.js";
import { allocateQueryId, allocateRetrievalIds, loadRetrievalRecords, retrievalBodyFile, writeQueryRecord, writeRetrievalRecord } from "./retrieval-records.js";

/**
 * Orchestrators behind the `research` CLI group. Sequencing doctrine: the
 * project lock is never held across HTTP — identities are allocated and the
 * counter persisted first (short lock inside the allocators), the network
 * work runs unlocked, and the finished record is written under a fresh lock.
 * Every command ends with a projection refresh so a mid-flow `validate`
 * never sees record-derived projections as GENERATED_DRIFT.
 */

export async function assertResearchFlow(root: string): Promise<ActiveFlow> {
  const flow = await loadActiveFlow(root);
  if (!flow || (flow.type !== "genesis" && flow.type !== "reassessment")) {
    throw new SdlcError("Engine research commands are only allowed inside an active Genesis or Evidence Reassessment flow.");
  }
  return flow;
}

interface ResearchContext {
  flow: ActiveFlow;
  capability: ResearchCapability;
  policy: ResearchPolicy;
  rung: 1 | 2 | 3;
}

async function researchContext(root: string): Promise<ResearchContext> {
  const flow = await assertResearchFlow(root);
  const capability = resolveResearchCapability();
  if (capability.rung === 0) throw new SdlcError("No research instrument is configured (AI_SDLC_SEARXNG_URL, AI_SDLC_FIRECRAWL_URL, AI_SDLC_CAMOFOX_URL); at rung 0 use the host's own search and fetch tools.");
  const policy = await loadResearchPolicy(root);
  return { flow, capability, policy, rung: capability.rung };
}

// One detection per endpoint per process: the generation cannot change
// between two commands of the same invocation.
const detectedVersions = new Map<string, FirecrawlApiVersion>();

async function firecrawlVersion(config: InstrumentConfig, timeoutMs: number): Promise<FirecrawlApiVersion> {
  const cached = detectedVersions.get(config.url);
  if (cached) return cached;
  const version = await detectFirecrawlVersion(config, timeoutMs);
  detectedVersions.set(config.url, version);
  return version;
}

/** Cap a body at the policy's byte budget without splitting a code point. */
function capBody(text: string, maxBytes: number): { body: string; truncated: boolean } {
  const normalized = normalizeText(text);
  const buffer = Buffer.from(normalized, "utf8");
  if (buffer.length <= maxBytes) return { body: normalized, truncated: false };
  const body = buffer.subarray(0, maxBytes).toString("utf8").replace(/�+$/, "");
  return { body, truncated: true };
}

export interface SearchOptions {
  query: string;
  pass?: SearchPass | undefined;
  engines?: string[] | undefined;
  categories?: string | undefined;
  language?: string | undefined;
  page?: number | undefined;
  timeRange?: "day" | "month" | "year" | undefined;
}

export async function researchSearch(root: string, opts: SearchOptions): Promise<QueryRecord> {
  const { flow, capability, policy, rung } = await researchContext(root);
  if (!capability.searxng) throw new SdlcError("SearXNG is not configured (AI_SDLC_SEARXNG_URL); discover sources with the host's search tool instead.");
  const id = await allocateQueryId(root);
  const engines = opts.engines && opts.engines.length > 0 ? opts.engines : opts.pass ? passEngines(opts.pass) : [];
  const base = {
    schema_version: 1 as const,
    id,
    flow_id: flow.id,
    kind: "search" as const,
    instrument: "searxng" as const,
    capability_rung: rung,
    query: opts.query,
    started_at: new Date().toISOString(),
    git_commit: gitCommit(root),
    ...(opts.pass ? { pass: opts.pass } : {}),
    ...(engines.length > 0 ? { engines } : {}),
    ...(opts.categories ? { categories: opts.categories } : {}),
    ...(opts.language ? { language: opts.language } : {}),
    ...(opts.page && opts.page > 1 ? { pageno: opts.page } : {}),
    ...(opts.timeRange ? { time_range: opts.timeRange } : {})
  };
  let record: QueryRecord;
  try {
    const response = await searxngSearch(capability.searxng, {
      q: opts.query,
      engines,
      categories: opts.categories,
      language: opts.language,
      pageno: opts.page,
      time_range: opts.timeRange
    }, policy.request_timeout_ms);
    record = {
      ...base,
      ok: true,
      ended_at: new Date().toISOString(),
      results: response.results.slice(0, policy.search_result_cap),
      result_count: response.results.length,
      ...(response.unresponsive_engines.length > 0 ? { unresponsive_engines: response.unresponsive_engines } : {})
    };
  } catch (error) {
    record = { ...base, ok: false, ended_at: new Date().toISOString(), error: error instanceof Error ? error.message : String(error) };
  }
  await writeQueryRecord(root, record);
  await refreshProject(root, false);
  return record;
}

export interface FetchOptions {
  url: string;
  wait?: number | undefined;
}

export async function researchFetch(root: string, opts: FetchOptions): Promise<RetrievalRecord> {
  const { flow, capability, policy, rung } = await researchContext(root);
  if (!capability.firecrawl && !capability.camofox) throw new SdlcError("No inspection instrument is configured (AI_SDLC_FIRECRAWL_URL or AI_SDLC_CAMOFOX_URL); inspect the page with the host's fetch tool instead.");
  const id = (await allocateRetrievalIds(root, 1))[0]!;
  const waitMs = opts.wait ?? policy.wait_ms;
  const base = {
    schema_version: 1 as const,
    id,
    flow_id: flow.id,
    url: opts.url,
    via: "fetch" as const,
    capability_rung: rung,
    started_at: new Date().toISOString(),
    git_commit: gitCommit(root),
    ...(waitMs > 0 ? { wait_ms: waitMs } : {})
  };
  let record: RetrievalRecord;
  let body: string | undefined;
  let firecrawlFailure: string | undefined;
  if (capability.firecrawl) {
    try {
      const version = await firecrawlVersion(capability.firecrawl, policy.request_timeout_ms);
      const page = await firecrawlScrape(capability.firecrawl, version, opts.url, { waitFor: waitMs, timeoutMs: policy.request_timeout_ms });
      const capped = capBody(page.markdown, policy.body_max_bytes);
      body = capped.body;
      record = {
        ...base,
        instrument: "firecrawl",
        ok: true,
        ended_at: new Date().toISOString(),
        api_version: version,
        body_file: retrievalBodyFile(id),
        body_hash: sha256(capped.body),
        body_bytes: Buffer.byteLength(capped.body, "utf8"),
        truncated: capped.truncated,
        ...(page.status_code !== undefined ? { status_code: page.status_code } : {}),
        ...(page.title ? { title: page.title } : {}),
        ...(page.url !== opts.url ? { resolved_url: page.url } : {})
      };
      await writeRetrievalRecord(root, record, body);
      await refreshProject(root, false);
      return record;
    } catch (error) {
      firecrawlFailure = error instanceof Error ? error.message : String(error);
    }
  }
  const escalation = firecrawlFailure ? { escalation: { from: "firecrawl" as const, reason: firecrawlFailure } } : {};
  if (capability.camofox) {
    try {
      const result = await camofoxFetch(capability.camofox, opts.url, id, { waitMs, timeoutMs: policy.request_timeout_ms, maxBytes: policy.body_max_bytes });
      const capped = capBody(result.text, policy.body_max_bytes);
      body = capped.body;
      record = {
        ...base,
        instrument: "camofox",
        ok: true,
        ended_at: new Date().toISOString(),
        body_file: retrievalBodyFile(id),
        body_hash: sha256(capped.body),
        body_bytes: Buffer.byteLength(capped.body, "utf8"),
        truncated: capped.truncated || !result.exhausted,
        ...escalation
      };
      await writeRetrievalRecord(root, record, body);
      await refreshProject(root, false);
      return record;
    } catch (error) {
      const camofoxFailure = error instanceof Error ? error.message : String(error);
      record = { ...base, instrument: "camofox", ok: false, ended_at: new Date().toISOString(), error: camofoxFailure, ...escalation };
      await writeRetrievalRecord(root, record);
      await refreshProject(root, false);
      return record;
    }
  }
  record = { ...base, instrument: "firecrawl", ok: false, ended_at: new Date().toISOString(), error: firecrawlFailure ?? "Firecrawl scrape failed." };
  await writeRetrievalRecord(root, record);
  await refreshProject(root, false);
  return record;
}

export interface MapOptions {
  url: string;
  search?: string | undefined;
  limit?: number | undefined;
}

export async function researchMap(root: string, opts: MapOptions): Promise<QueryRecord> {
  const { flow, capability, policy, rung } = await researchContext(root);
  if (!capability.firecrawl) throw new SdlcError("Firecrawl is not configured (AI_SDLC_FIRECRAWL_URL); URL discovery by map is unavailable.");
  const id = await allocateQueryId(root);
  const cap = opts.limit && opts.limit > 0 ? opts.limit : policy.search_result_cap;
  const base = {
    schema_version: 1 as const,
    id,
    flow_id: flow.id,
    kind: "map" as const,
    instrument: "firecrawl" as const,
    capability_rung: rung,
    query: opts.search ?? "",
    url: opts.url,
    started_at: new Date().toISOString(),
    git_commit: gitCommit(root),
    ...(opts.limit && opts.limit > 0 ? { limit: opts.limit } : {})
  };
  let record: QueryRecord;
  try {
    const version = await firecrawlVersion(capability.firecrawl, policy.request_timeout_ms);
    const links = await firecrawlMap(capability.firecrawl, version, opts.url, { search: opts.search, limit: opts.limit, timeoutMs: policy.request_timeout_ms });
    record = {
      ...base,
      ok: true,
      ended_at: new Date().toISOString(),
      api_version: version,
      results: links.slice(0, cap),
      result_count: links.length
    };
  } catch (error) {
    record = { ...base, ok: false, ended_at: new Date().toISOString(), error: error instanceof Error ? error.message : String(error) };
  }
  await writeQueryRecord(root, record);
  await refreshProject(root, false);
  return record;
}

export interface CrawlOptions {
  url: string;
  include?: string[] | undefined;
  limit?: number | undefined;
}

export interface CrawlReport {
  records: RetrievalRecord[];
  pages_returned: number;
  page_cap: number;
}

export async function researchCrawl(root: string, opts: CrawlOptions): Promise<CrawlReport> {
  const { flow, capability, policy, rung } = await researchContext(root);
  if (!capability.firecrawl) throw new SdlcError("Firecrawl is not configured (AI_SDLC_FIRECRAWL_URL); bounded crawling is unavailable.");
  const pageCap = Math.min(opts.limit && opts.limit > 0 ? opts.limit : policy.crawl_page_cap, policy.crawl_page_cap);
  const ids = await allocateRetrievalIds(root, pageCap);
  const commit = gitCommit(root);
  const started = new Date().toISOString();
  const records: RetrievalRecord[] = [];
  try {
    const version = await firecrawlVersion(capability.firecrawl, policy.request_timeout_ms);
    const pages = await firecrawlCrawl(capability.firecrawl, version, opts.url, {
      includePaths: opts.include,
      limit: pageCap,
      waitFor: policy.wait_ms,
      requestTimeoutMs: policy.request_timeout_ms,
      pollTimeoutMs: policy.crawl_poll_timeout_ms
    });
    const ended = new Date().toISOString();
    for (const [index, page] of pages.slice(0, pageCap).entries()) {
      const id = ids[index]!;
      const capped = capBody(page.markdown, policy.body_max_bytes);
      const record: RetrievalRecord = {
        schema_version: 1,
        id,
        flow_id: flow.id,
        url: page.url,
        instrument: "firecrawl",
        via: "crawl",
        ok: true,
        capability_rung: rung,
        started_at: started,
        ended_at: ended,
        git_commit: commit,
        api_version: version,
        body_file: retrievalBodyFile(id),
        body_hash: sha256(capped.body),
        body_bytes: Buffer.byteLength(capped.body, "utf8"),
        truncated: capped.truncated,
        crawl_seed: opts.url,
        ...(page.status_code !== undefined ? { status_code: page.status_code } : {}),
        ...(page.title ? { title: page.title } : {})
      };
      await writeRetrievalRecord(root, record, capped.body);
      records.push(record);
    }
  } catch (error) {
    // The whole crawl failed: one failed record on the first reserved
    // identity carries the reason; the remaining reserved identities stay
    // burned, which the counter contract explicitly allows.
    const record: RetrievalRecord = {
      schema_version: 1,
      id: ids[0]!,
      flow_id: flow.id,
      url: opts.url,
      instrument: "firecrawl",
      via: "crawl",
      ok: false,
      capability_rung: rung,
      started_at: started,
      ended_at: new Date().toISOString(),
      git_commit: commit,
      crawl_seed: opts.url,
      error: error instanceof Error ? error.message : String(error)
    };
    await writeRetrievalRecord(root, record);
    records.push(record);
  }
  await refreshProject(root, false);
  return { records, pages_returned: records.filter((record) => record.ok).length, page_cap: pageCap };
}

export interface DiffOptions {
  ret: string;
  against?: string | undefined;
}

export interface DiffReport {
  ret: string;
  against: string;
  url: string;
  changed: boolean;
  added_lines: number;
  removed_lines: number;
  preview: string;
}

async function retrievalBody(root: string, record: RetrievalRecord): Promise<string> {
  const file = path.resolve(root, retrievalBodyFile(record.id));
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch {
    throw new SdlcError(`Retrieval body for ${record.id} is missing; validate reports broken provenance.`);
  }
  const normalized = normalizeText(text);
  if (sha256(normalized) !== record.body_hash) throw new SdlcError(`Retrieval body for ${record.id} does not match its recorded digest; validate reports broken provenance.`);
  return normalized;
}

function lineCounts(lines: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const line of lines) counts.set(line, (counts.get(line) ?? 0) + 1);
  return counts;
}

/**
 * Deterministic local comparison of two stored retrieval bodies — the
 * reassessment answer to "has this time-sensitive page changed?". Purely
 * local: no HTTP, no record, no lock; fetch first, then diff the records.
 */
export async function researchDiff(root: string, opts: DiffOptions): Promise<DiffReport> {
  await assertResearchFlow(root);
  const records = await loadRetrievalRecords(root);
  const current = records.find((record) => record.id === opts.ret);
  if (!current) throw new SdlcError(`Unknown retrieval record: ${opts.ret}`);
  if (!current.ok) throw new SdlcError(`${opts.ret} is a failed retrieval and has no body to compare.`);
  const against = opts.against
    ? records.find((record) => record.id === opts.against)
    : records.filter((record) => record.ok && record.url === current.url && record.id < current.id).at(-1);
  if (!against) throw new SdlcError(opts.against ? `Unknown retrieval record: ${opts.against}` : `No earlier successful retrieval of ${current.url} exists to compare against.`);
  if (!against.ok) throw new SdlcError(`${against.id} is a failed retrieval and has no body to compare.`);
  const currentBody = await retrievalBody(root, current);
  const againstBody = await retrievalBody(root, against);
  const currentLines = currentBody.split("\n");
  const againstLines = againstBody.split("\n");
  const currentCounts = lineCounts(currentLines);
  const againstCounts = lineCounts(againstLines);
  const added: string[] = [];
  const removed: string[] = [];
  for (const [line, count] of currentCounts) {
    const extra = count - (againstCounts.get(line) ?? 0);
    for (let index = 0; index < extra; index += 1) added.push(line);
  }
  for (const [line, count] of againstCounts) {
    const extra = count - (currentCounts.get(line) ?? 0);
    for (let index = 0; index < extra; index += 1) removed.push(line);
  }
  const previewLines = [
    ...removed.slice(0, 10).map((line) => `- ${line}`),
    ...added.slice(0, 10).map((line) => `+ ${line}`)
  ];
  return {
    ret: current.id,
    against: against.id,
    url: current.url,
    changed: currentBody !== againstBody,
    added_lines: added.length,
    removed_lines: removed.length,
    preview: previewLines.join("\n")
  };
}
