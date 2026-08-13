import { SdlcError } from "./errors.js";
import { assertSafeManagedPath, projectPaths } from "./paths.js";
import { pathExists } from "./state.js";
import { readJson } from "./utils.js";

/**
 * Optional research instruments are configured through environment variables
 * only. sdlc.config.yaml is a baselined, hashed canonical contract and must
 * never carry machine-local endpoints or secrets; the environment is per
 * machine, never committed, and its absence is the documented rung-0 state.
 */
const ENV_SEARXNG_URL = "AI_SDLC_SEARXNG_URL";
const ENV_FIRECRAWL_URL = "AI_SDLC_FIRECRAWL_URL";
const ENV_FIRECRAWL_KEY = "AI_SDLC_FIRECRAWL_KEY";
const ENV_CAMOFOX_URL = "AI_SDLC_CAMOFOX_URL";
const ENV_CAMOFOX_KEY = "AI_SDLC_CAMOFOX_KEY";

export interface InstrumentConfig {
  url: string;
  /** Auth material; a header is attached only when this is present. */
  key?: string;
}

export interface ResearchCapability {
  /** Highest configured tier: 0 none, 1 searxng, 2 firecrawl, 3 camofox. */
  rung: 0 | 1 | 2 | 3;
  searxng: InstrumentConfig | null;
  firecrawl: InstrumentConfig | null;
  camofox: InstrumentConfig | null;
}

/**
 * Numeric operating caps for the research instruments. Machine-local and
 * git-ignored like the engine pointer: none of these values are product
 * truth, so they never enter a baseline.
 */
export interface ResearchPolicy {
  crawl_page_cap: number;
  body_max_bytes: number;
  search_result_cap: number;
  request_timeout_ms: number;
  wait_ms: number;
  crawl_poll_timeout_ms: number;
}

export const DEFAULT_RESEARCH_POLICY: ResearchPolicy = {
  crawl_page_cap: 25,
  body_max_bytes: 262144,
  search_result_cap: 40,
  // Camofox rejects handlers after 30s (HANDLER_TIMEOUT_MS); staying at or
  // under it keeps one request from outliving what the server will serve.
  request_timeout_ms: 30000,
  wait_ms: 0,
  crawl_poll_timeout_ms: 120000
};

function instrumentFromEnv(env: NodeJS.ProcessEnv, urlVar: string, keyVar?: string): InstrumentConfig | null {
  const raw = env[urlVar]?.trim();
  if (!raw) return null;
  if (!/^https?:\/\//.test(raw)) throw new SdlcError(`${urlVar} must be an http(s) origin, got: ${raw}`);
  const url = raw.replace(/\/+$/, "");
  const key = keyVar ? env[keyVar]?.trim() : undefined;
  return key ? { url, key } : { url };
}

/**
 * The single place the engine reads instrument environment. The resolved rung
 * is stamped onto records as capability_rung; validation never calls this —
 * a repository must validate identically on every machine.
 */
export function resolveResearchCapability(env: NodeJS.ProcessEnv = process.env): ResearchCapability {
  const searxng = instrumentFromEnv(env, ENV_SEARXNG_URL);
  const firecrawl = instrumentFromEnv(env, ENV_FIRECRAWL_URL, ENV_FIRECRAWL_KEY);
  const camofox = instrumentFromEnv(env, ENV_CAMOFOX_URL, ENV_CAMOFOX_KEY);
  const rung = camofox ? 3 : firecrawl ? 2 : searxng ? 1 : 0;
  return { rung, searxng, firecrawl, camofox };
}

export async function loadResearchPolicy(root: string): Promise<ResearchPolicy> {
  const file = projectPaths(root).researchPolicy;
  if (!(await pathExists(file))) return { ...DEFAULT_RESEARCH_POLICY };
  await assertSafeManagedPath(root, file);
  const candidate = await readJson<unknown>(file);
  const allowed = Object.keys(DEFAULT_RESEARCH_POLICY);
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)
    || !Object.keys(candidate).every((key) => allowed.includes(key))
    || !Object.values(candidate).every((value) => Number.isInteger(value) && (value as number) >= 0)) {
    throw new SdlcError(`Invalid ${file}: expected integer values for a subset of ${allowed.join(", ")}.`);
  }
  return { ...DEFAULT_RESEARCH_POLICY, ...(candidate as Partial<ResearchPolicy>) };
}

export interface InstrumentProbe {
  configured: true;
  reachable: boolean;
  status?: number | undefined;
  api_version?: "v1" | "v2" | undefined;
  hint?: string | undefined;
}

export interface ProbeReport {
  /** Highest configured tier whose service actually answered. */
  rung: 0 | 1 | 2 | 3;
  configured_rung: 0 | 1 | 2 | 3;
  instruments: {
    searxng: InstrumentProbe | null;
    firecrawl: InstrumentProbe | null;
    camofox: InstrumentProbe | null;
  };
  policy: ResearchPolicy;
}

async function probeSearxng(config: InstrumentConfig, timeoutMs: number): Promise<InstrumentProbe> {
  try {
    const response = await fetch(`${config.url}/search?q=probe&format=json`, { signal: AbortSignal.timeout(timeoutMs) });
    if (response.status === 403) {
      return { configured: true, reachable: false, status: 403, hint: "SearXNG rejected format=json; enable it on the instance: settings.yml -> search.formats: [html, json]." };
    }
    if (!response.ok) return { configured: true, reachable: false, status: response.status };
    await response.json();
    return { configured: true, reachable: true, status: response.status };
  } catch (error) {
    return { configured: true, reachable: false, hint: String(error) };
  }
}

async function probeFirecrawl(config: InstrumentConfig, timeoutMs: number): Promise<InstrumentProbe> {
  try {
    const { firecrawlReady, detectFirecrawlVersion } = await import("./firecrawl.js");
    const ready = await firecrawlReady(config, timeoutMs);
    if (!ready.ready) return { configured: true, reachable: false, status: ready.status };
    const version = await detectFirecrawlVersion(config, timeoutMs);
    return { configured: true, reachable: true, status: ready.status, api_version: version };
  } catch (error) {
    return { configured: true, reachable: false, hint: String(error) };
  }
}

async function probeCamofox(config: InstrumentConfig, timeoutMs: number): Promise<InstrumentProbe> {
  try {
    const response = await fetch(`${config.url}/health`, { signal: AbortSignal.timeout(timeoutMs) });
    return { configured: true, reachable: response.ok, status: response.status };
  } catch (error) {
    return { configured: true, reachable: false, hint: String(error) };
  }
}

/**
 * Reaches every configured instrument for real. Legal anywhere, including an
 * uninitialized repository: it reads no state and writes nothing. A service
 * that is configured but down lowers the effective rung; the flow degrades
 * and records it instead of failing.
 */
export async function probeResearchTools(root: string, env: NodeJS.ProcessEnv = process.env): Promise<ProbeReport> {
  const capability = resolveResearchCapability(env);
  const policy = await loadResearchPolicy(root);
  const [searxng, firecrawl, camofox] = await Promise.all([
    capability.searxng ? probeSearxng(capability.searxng, policy.request_timeout_ms) : Promise.resolve(null),
    capability.firecrawl ? probeFirecrawl(capability.firecrawl, policy.request_timeout_ms) : Promise.resolve(null),
    capability.camofox ? probeCamofox(capability.camofox, policy.request_timeout_ms) : Promise.resolve(null)
  ]);
  const rung = camofox?.reachable ? 3 : firecrawl?.reachable ? 2 : searxng?.reachable ? 1 : 0;
  return { rung, configured_rung: capability.rung, instruments: { searxng, firecrawl, camofox }, policy };
}
