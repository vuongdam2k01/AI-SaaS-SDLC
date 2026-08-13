import { SdlcError } from "./errors.js";
import type { InstrumentConfig } from "./research-capability.js";

export const SEARCH_PASSES = ["authority", "official", "discussion", "counter", "freshness"] as const;
export type SearchPass = (typeof SEARCH_PASSES)[number];

/**
 * Default engine targeting per protocol pass. Authority and discussion name
 * the source classes the research protocol prefers explicitly; the general
 * passes ride the instance's default engine set, which the operator tuned,
 * rather than guessing which general engines that instance has enabled.
 */
export function passEngines(pass: SearchPass): string[] {
  if (pass === "authority") return ["arxiv", "crossref", "pubmed", "semantic scholar", "wikidata"];
  if (pass === "discussion") return ["reddit", "hackernews", "stackoverflow"];
  return [];
}

export interface SearxngQuery {
  q: string;
  engines?: string[] | undefined;
  categories?: string | undefined;
  language?: string | undefined;
  pageno?: number | undefined;
  time_range?: "day" | "month" | "year" | undefined;
}

export interface SearxngResult {
  url: string;
  title?: string;
  engine?: string;
  score?: number;
  published?: string;
}

export interface SearxngResponse {
  results: SearxngResult[];
  unresponsive_engines: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * One discovery query against a self-hosted SearXNG instance. No retries: a
 * failed pass is a recorded fact, not something to paper over. SearXNG needs
 * `search.formats: [html, json]` in its settings.yml before format=json is
 * served; without it the instance answers 403, which gets a targeted hint.
 */
export async function searxngSearch(config: InstrumentConfig, query: SearxngQuery, timeoutMs: number): Promise<SearxngResponse> {
  const params = new URLSearchParams({ q: query.q, format: "json" });
  if (query.engines && query.engines.length > 0) params.set("engines", query.engines.join(","));
  if (query.categories) params.set("categories", query.categories);
  if (query.language) params.set("language", query.language);
  if (query.pageno && query.pageno > 1) params.set("pageno", String(query.pageno));
  if (query.time_range) params.set("time_range", query.time_range);
  let response: Response;
  try {
    response = await fetch(`${config.url}/search?${params.toString()}`, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    throw new SdlcError(`SearXNG is unreachable: ${String(error)}`);
  }
  if (response.status === 403) throw new SdlcError("SearXNG rejected format=json (HTTP 403). Enable it on the instance: settings.yml -> search.formats: [html, json].");
  if (!response.ok) throw new SdlcError(`SearXNG search failed: HTTP ${response.status}`);
  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch (error) {
    throw new SdlcError(`SearXNG returned unparseable JSON: ${String(error)}`);
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.results)) throw new SdlcError("SearXNG response is missing the results array.");
  const results: SearxngResult[] = [];
  for (const item of parsed.results) {
    if (!isRecord(item) || typeof item.url !== "string" || item.url.length === 0) continue;
    results.push({
      url: item.url,
      ...(typeof item.title === "string" && item.title.length > 0 ? { title: item.title } : {}),
      ...(typeof item.engine === "string" && item.engine.length > 0 ? { engine: item.engine } : {}),
      ...(typeof item.score === "number" && Number.isFinite(item.score) ? { score: item.score } : {}),
      ...(typeof item.publishedDate === "string" && item.publishedDate.length > 0 ? { published: item.publishedDate } : {})
    });
  }
  // Instances report failed upstream engines either as strings or as
  // [engine, errorType] tuples; both collapse to the engine name so the
  // record can say which engines did not answer this query.
  const unresponsive: string[] = [];
  if (Array.isArray(parsed.unresponsive_engines)) {
    for (const item of parsed.unresponsive_engines) {
      if (typeof item === "string") unresponsive.push(item);
      else if (Array.isArray(item) && typeof item[0] === "string") unresponsive.push(item[0]);
    }
  }
  return { results, unresponsive_engines: [...new Set(unresponsive)].sort() };
}
