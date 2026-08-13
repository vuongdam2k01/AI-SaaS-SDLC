import { SdlcError } from "./errors.js";
import type { InstrumentConfig } from "./research-capability.js";

/**
 * Rung-3 client for jo-inc/camofox-browser: an anti-detect Firefox behind a
 * REST tab API. This module deliberately exposes reading only — create a tab,
 * wait for readiness, read the accessibility snapshot, close the tab. Click,
 * type, evaluate and cookie import exist on the server but not here: the
 * evidence path treats every page as untrusted data, never as a session to
 * drive, and public pages are the only legal targets.
 */

const USER_ID = "ai-saas-sdlc";

function headers(config: InstrumentConfig): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...(config.key ? { Authorization: `Bearer ${config.key}` } : {})
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function camofoxHealth(config: InstrumentConfig, timeoutMs: number): Promise<boolean> {
  try {
    // /health is the one route the server never puts behind the access key.
    const response = await fetch(`${config.url}/health`, { signal: AbortSignal.timeout(timeoutMs) });
    return response.ok;
  } catch {
    return false;
  }
}

export interface CamofoxFetchResult {
  text: string;
  pages: number;
  /** False when the body cap stopped pagination before the snapshot ended. */
  exhausted: boolean;
}

function snapshotText(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (isRecord(payload)) {
    for (const key of ["snapshot", "text", "content"]) {
      if (typeof payload[key] === "string") return payload[key];
    }
  }
  return "";
}

/**
 * Fetch one public page as text. Strictly sequential — the server allows
 * three concurrent requests per user and recycles tabs beyond ten per
 * session, so one tab at a time is both polite and sufficient. The tab is
 * deleted in a finally block: an abandoned tab holds a browser context open
 * on the user's own machine.
 */
export async function camofoxFetch(config: InstrumentConfig, url: string, sessionKey: string, opts: { waitMs: number; timeoutMs: number; maxBytes: number }): Promise<CamofoxFetchResult> {
  let created: Response;
  try {
    created = await fetch(`${config.url}/tabs`, {
      method: "POST",
      headers: headers(config),
      body: JSON.stringify({ userId: USER_ID, sessionKey, url }),
      signal: AbortSignal.timeout(opts.timeoutMs)
    });
  } catch (error) {
    throw new SdlcError(`Camofox is unreachable: ${String(error)}`);
  }
  if (!created.ok) throw new SdlcError(`Camofox tab creation failed: HTTP ${created.status}`);
  const tab: unknown = await created.json();
  const tabId = isRecord(tab)
    ? [tab.tabId, tab.id, isRecord(tab.tab) ? tab.tab.id : undefined].find((value) => typeof value === "string" && value.length > 0)
    : undefined;
  if (typeof tabId !== "string") throw new SdlcError("Camofox tab creation returned no tab ID.");
  try {
    // Navigation starts asynchronously; the wait endpoint is the readiness
    // signal. A non-ok answer is tolerated — an older build without /wait
    // still serves snapshots, just with less settling.
    const waitBudget = opts.waitMs > 0 ? opts.waitMs : 5000;
    try {
      await fetch(`${config.url}/tabs/${encodeURIComponent(tabId)}/wait`, {
        method: "POST",
        headers: headers(config),
        body: JSON.stringify({ userId: USER_ID, timeout: waitBudget }),
        signal: AbortSignal.timeout(waitBudget + opts.timeoutMs)
      });
    } catch {
      // Readiness is best-effort; the snapshot below is the actual read.
    }
    let text = "";
    let pages = 0;
    let exhausted = true;
    // Snapshot pagination: request from the accumulated offset until a page
    // comes back empty, repeats, or the body cap is reached. The iteration
    // ceiling is a hard stop against a server that never returns an end.
    const maxIterations = 64;
    let previousChunk: string | null = null;
    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      const params = new URLSearchParams({ userId: USER_ID });
      if (text.length > 0) params.set("offset", String(text.length));
      let snapshot: Response;
      try {
        snapshot = await fetch(`${config.url}/tabs/${encodeURIComponent(tabId)}/snapshot?${params.toString()}`, {
          headers: headers(config),
          signal: AbortSignal.timeout(opts.timeoutMs)
        });
      } catch (error) {
        throw new SdlcError(`Camofox snapshot failed: ${String(error)}`);
      }
      if (!snapshot.ok) throw new SdlcError(`Camofox snapshot failed: HTTP ${snapshot.status}`);
      const contentType = snapshot.headers.get("content-type") ?? "";
      const chunk = contentType.includes("application/json") ? snapshotText(await snapshot.json()) : await snapshot.text();
      if (chunk.length === 0 || chunk === previousChunk) break;
      previousChunk = chunk;
      text += chunk;
      pages += 1;
      if (Buffer.byteLength(text, "utf8") >= opts.maxBytes) {
        exhausted = false;
        break;
      }
    }
    if (text.length === 0) throw new SdlcError("Camofox returned an empty snapshot.");
    return { text, pages, exhausted };
  } finally {
    try {
      await fetch(`${config.url}/tabs/${encodeURIComponent(tabId)}?userId=${encodeURIComponent(USER_ID)}`, {
        method: "DELETE",
        headers: headers(config),
        signal: AbortSignal.timeout(opts.timeoutMs)
      });
    } catch {
      // The server recycles idle tabs on its own; a failed close is not a
      // reason to fail the retrieval that already has its body.
    }
  }
}
