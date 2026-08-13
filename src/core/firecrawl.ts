import { SdlcError } from "./errors.js";
import type { InstrumentConfig } from "./research-capability.js";

export type FirecrawlApiVersion = "v1" | "v2";

/**
 * Only the inspection surface is implemented. /extract is LLM extraction —
 * inference wearing a tool's clothes — and /search duplicates what SearXNG
 * does with operator-controlled engine attribution; neither may produce
 * evidence, so neither exists here.
 */

function headers(config: InstrumentConfig): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...(config.key ? { Authorization: `Bearer ${config.key}` } : {})
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export async function firecrawlReady(config: InstrumentConfig, timeoutMs: number): Promise<{ ready: boolean; status?: number }> {
  try {
    const response = await fetch(`${config.url}/v0/health/readiness`, { signal: AbortSignal.timeout(timeoutMs) });
    return { ready: response.ok, status: response.status };
  } catch {
    return { ready: false };
  }
}

/**
 * Self-hosted builds expose either the v1 or the v2 API generation. An empty
 * POST distinguishes them without side effects: an existing route rejects the
 * body (400-class), an absent route answers 404. The result is stamped on
 * records as api_version so the provenance says which generation served it.
 */
export async function detectFirecrawlVersion(config: InstrumentConfig, timeoutMs: number): Promise<FirecrawlApiVersion> {
  for (const version of ["v2", "v1"] as const) {
    let status: number;
    try {
      const response = await fetch(`${config.url}/${version}/scrape`, {
        method: "POST",
        headers: headers(config),
        body: "{}",
        signal: AbortSignal.timeout(timeoutMs)
      });
      status = response.status;
    } catch (error) {
      throw new SdlcError(`Firecrawl is unreachable: ${String(error)}`);
    }
    if (status !== 404) return version;
  }
  throw new SdlcError("Firecrawl exposes neither /v2/scrape nor /v1/scrape; is the URL pointing at a Firecrawl instance?");
}

export interface FirecrawlPage {
  url: string;
  markdown: string;
  title?: string;
  status_code?: number;
}

function parsePage(requested: string, data: unknown): FirecrawlPage {
  if (!isRecord(data) || typeof data.markdown !== "string") throw new SdlcError("Firecrawl returned no markdown body.");
  const metadata = isRecord(data.metadata) ? data.metadata : {};
  const source = typeof metadata.sourceURL === "string" && metadata.sourceURL.length > 0 ? metadata.sourceURL : requested;
  return {
    url: source,
    markdown: data.markdown,
    ...(typeof metadata.title === "string" && metadata.title.length > 0 ? { title: metadata.title } : {}),
    ...(typeof metadata.statusCode === "number" ? { status_code: metadata.statusCode } : {})
  };
}

async function firecrawlError(operation: string, response: Response): Promise<SdlcError> {
  let detail = "";
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && typeof body.error === "string") detail = `: ${body.error}`;
  } catch {
    // The status alone still names the failure.
  }
  return new SdlcError(`Firecrawl ${operation} failed: HTTP ${response.status}${detail}`);
}

export async function firecrawlScrape(config: InstrumentConfig, version: FirecrawlApiVersion, url: string, opts: { waitFor?: number | undefined; timeoutMs: number }): Promise<FirecrawlPage> {
  let response: Response;
  try {
    response = await fetch(`${config.url}/${version}/scrape`, {
      method: "POST",
      headers: headers(config),
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        ...(opts.waitFor && opts.waitFor > 0 ? { waitFor: opts.waitFor } : {}),
        timeout: opts.timeoutMs
      }),
      // The page itself may legitimately take the full scrape budget; the
      // HTTP deadline leaves headroom so the server's own timeout answers first.
      signal: AbortSignal.timeout(opts.timeoutMs + 5000)
    });
  } catch (error) {
    throw new SdlcError(`Firecrawl is unreachable: ${String(error)}`);
  }
  if (!response.ok) throw await firecrawlError("scrape", response);
  const parsed: unknown = await response.json();
  if (!isRecord(parsed) || parsed.success !== true) throw new SdlcError("Firecrawl scrape did not succeed.");
  return parsePage(url, parsed.data);
}

export async function firecrawlMap(config: InstrumentConfig, version: FirecrawlApiVersion, url: string, opts: { search?: string | undefined; limit?: number | undefined; timeoutMs: number }): Promise<Array<{ url: string; title?: string }>> {
  let response: Response;
  try {
    response = await fetch(`${config.url}/${version}/map`, {
      method: "POST",
      headers: headers(config),
      body: JSON.stringify({
        url,
        ...(opts.search ? { search: opts.search } : {}),
        ...(opts.limit && opts.limit > 0 ? { limit: opts.limit } : {})
      }),
      signal: AbortSignal.timeout(opts.timeoutMs)
    });
  } catch (error) {
    throw new SdlcError(`Firecrawl is unreachable: ${String(error)}`);
  }
  if (!response.ok) throw await firecrawlError("map", response);
  const parsed: unknown = await response.json();
  if (!isRecord(parsed) || parsed.success !== true || !Array.isArray(parsed.links)) throw new SdlcError("Firecrawl map did not return links.");
  // v1 returns links as strings, v2 as {url, title?} objects; both collapse
  // to the same shape so callers never see the generation difference.
  const links: Array<{ url: string; title?: string }> = [];
  for (const item of parsed.links) {
    if (typeof item === "string" && item.length > 0) links.push({ url: item });
    else if (isRecord(item) && typeof item.url === "string" && item.url.length > 0) {
      links.push({ url: item.url, ...(typeof item.title === "string" && item.title.length > 0 ? { title: item.title } : {}) });
    }
  }
  return links;
}

export async function firecrawlCrawl(config: InstrumentConfig, version: FirecrawlApiVersion, url: string, opts: { includePaths?: string[] | undefined; limit: number; waitFor?: number | undefined; requestTimeoutMs: number; pollTimeoutMs: number }): Promise<FirecrawlPage[]> {
  let submit: Response;
  try {
    submit = await fetch(`${config.url}/${version}/crawl`, {
      method: "POST",
      headers: headers(config),
      body: JSON.stringify({
        url,
        limit: opts.limit,
        ...(opts.includePaths && opts.includePaths.length > 0 ? { includePaths: opts.includePaths } : {}),
        scrapeOptions: {
          formats: ["markdown"],
          onlyMainContent: true,
          ...(opts.waitFor && opts.waitFor > 0 ? { waitFor: opts.waitFor } : {})
        }
      }),
      signal: AbortSignal.timeout(opts.requestTimeoutMs)
    });
  } catch (error) {
    throw new SdlcError(`Firecrawl is unreachable: ${String(error)}`);
  }
  if (!submit.ok) throw await firecrawlError("crawl", submit);
  const submitted: unknown = await submit.json();
  if (!isRecord(submitted) || typeof submitted.id !== "string" || submitted.id.length === 0) throw new SdlcError("Firecrawl crawl did not return a job ID.");
  const deadline = Date.now() + opts.pollTimeoutMs;
  for (;;) {
    let poll: Response;
    try {
      poll = await fetch(`${config.url}/${version}/crawl/${submitted.id}`, { headers: headers(config), signal: AbortSignal.timeout(opts.requestTimeoutMs) });
    } catch (error) {
      throw new SdlcError(`Firecrawl is unreachable while polling crawl ${submitted.id}: ${String(error)}`);
    }
    if (!poll.ok) throw await firecrawlError("crawl status", poll);
    const status: unknown = await poll.json();
    if (!isRecord(status)) throw new SdlcError("Firecrawl crawl status is unreadable.");
    if (status.status === "completed") {
      const pages: FirecrawlPage[] = [];
      if (Array.isArray(status.data)) {
        for (const item of status.data) {
          if (!isRecord(item) || typeof item.markdown !== "string") continue;
          const metadata = isRecord(item.metadata) ? item.metadata : {};
          const source = typeof metadata.sourceURL === "string" && metadata.sourceURL.length > 0 ? metadata.sourceURL : url;
          pages.push(parsePage(source, item));
        }
      }
      return pages;
    }
    if (status.status === "failed" || status.status === "cancelled") throw new SdlcError(`Firecrawl crawl ${submitted.id} ended as ${String(status.status)}.`);
    if (Date.now() >= deadline) throw new SdlcError(`Firecrawl crawl ${submitted.id} exceeded the ${opts.pollTimeoutMs}ms poll budget.`);
    await delay(2000);
  }
}
