import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * Local HTTP stub for research-instrument tests: the engine talks to a real
 * server on 127.0.0.1, so client behavior (headers, timeouts, JSON parsing)
 * is exercised without any network. Bound explicitly to 127.0.0.1 for the
 * Windows CI matrix.
 */

export interface RecordedRequest {
  method: string;
  url: string;
  authorization: string | null;
  body: string;
}

export interface HttpStub {
  url: string;
  requests: RecordedRequest[];
  close: () => Promise<void>;
}

export async function startStub(handler: (req: IncomingMessage, res: ServerResponse, body: string) => void): Promise<HttpStub> {
  const requests: RecordedRequest[] = [];
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
    req.on("end", () => {
      requests.push({ method: req.method ?? "", url: req.url ?? "", authorization: req.headers.authorization ?? null, body });
      handler(req, res, body);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  };
}

export function respondJson(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(value));
}

export const RESEARCH_ENV_KEYS = [
  "AI_SDLC_SEARXNG_URL",
  "AI_SDLC_FIRECRAWL_URL",
  "AI_SDLC_FIRECRAWL_KEY",
  "AI_SDLC_CAMOFOX_URL",
  "AI_SDLC_CAMOFOX_KEY"
] as const;

export function clearResearchEnv(): void {
  for (const key of RESEARCH_ENV_KEYS) delete process.env[key];
}

/** A firecrawl stub route: version detection posts an empty body, real calls carry a url. */
export function isDetectionPost(body: string): boolean {
  try {
    const parsed: unknown = JSON.parse(body || "{}");
    return !parsed || typeof parsed !== "object" || !("url" in (parsed as Record<string, unknown>));
  } catch {
    return true;
  }
}
