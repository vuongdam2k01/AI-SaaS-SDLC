# Research Tools

Optional self-hosted instruments that upgrade the public-web research method from model-asserted to engine-witnessed. Nothing here is required: an unconfigured machine runs every flow exactly as before, and `research_mode` stays `public-web-only` — the instruments change how pages are reached, never what counts as evidence.

## Why the engine retrieves

The research protocol's central rule is that a source discovered but not opened cannot support a claim. When the model fetches through its own host tools, whether the page was actually opened is a model assertion. When the engine fetches, the retrieval leaves a record the engine itself observed — status, timing, and the sha256 digest of a stored body — the same doctrine that already backs test executions with `EXEC-*` records and immutable logs. The model still plans queries, reads pages and writes synthesis; the engine owns transport and provenance.

## Instruments and rungs

| Rung | Instrument | Role |
|---|---|---|
| 0 | none | Host's own search and fetch tools — today's behavior, byte-identical |
| 1 | [SearXNG](https://docs.searxng.org/) | Discovery: engine-targeted, keyless meta-search recorded as `QRY-*` passes |
| 2 | [Firecrawl](https://docs.firecrawl.dev/) (self-hosted) | Inspection: scrape, site map and bounded crawl recorded as `RET-*` records with hashed bodies |
| 3 | [camofox-browser](https://github.com/jo-inc/camofox-browser) | Escalation: anti-detect Firefox for pages rung 2 cannot reach; automatic on rung-2 failure |

`ai-saas-sdlc research probe --json` reaches each configured endpoint for real and reports the effective rung. A configured-but-down service lowers the rung for that flow; the flow proceeds and the degradation is recorded, never fabricated around.

## Configuration

Environment variables only — never `sdlc.config.yaml`, which is baselined, hashed and committed:

| Variable | Meaning |
|---|---|
| `AI_SDLC_SEARXNG_URL` | SearXNG origin, e.g. `http://localhost:8888` |
| `AI_SDLC_FIRECRAWL_URL` | Firecrawl origin, e.g. `http://localhost:3002` |
| `AI_SDLC_FIRECRAWL_KEY` | Optional; the Authorization header is attached only when set. A `USE_DB_AUTHENTICATION=false` self-host needs none |
| `AI_SDLC_CAMOFOX_URL` | camofox-browser origin, e.g. `http://localhost:9377` |
| `AI_SDLC_CAMOFOX_KEY` | Optional; only when the instance sets `CAMOFOX_ACCESS_KEY` |

For Claude Code, an `env` block in `~/.claude/settings.json` configures every repository on the machine once; a per-repository `.claude/settings.local.json` (git-ignored) works too. For Codex, use the shell environment. Setting `AI_SDLC_CAMOFOX_URL` is consent to rung 3 — there is no separate opt-in flag, and every escalated retrieval is visible on its record.

Per-instance setup:

- **SearXNG** must serve JSON: `settings.yml` → `search.formats: [html, json]`. Without it the instance answers HTTP 403, and `research probe` reports exactly that hint.
- **Firecrawl** self-hosted builds expose the v1 or v2 API generation; the engine auto-detects per invocation and stamps `api_version` on every record. The default self-hosted stack has no `actions` and no screenshots — the JS-interaction gap is exactly what rung 3 covers.
- **camofox-browser** needs nothing beyond its URL; `/health` is never behind the access key.

### Local policy

`.ai-saas-sdlc/research-tools.json` — optional, user-created, git-ignored at `init` — holds numeric caps only:

| Key | Default | Meaning |
|---|---|---|
| `crawl_page_cap` | 25 | Hard page ceiling per `research crawl` |
| `body_max_bytes` | 262144 | Stored-body cap; a capped body is flagged `truncated` |
| `search_result_cap` | 40 | Results stored per query record (the true total is preserved as `result_count`) |
| `request_timeout_ms` | 30000 | Per-request budget; keep at or under camofox's 30s handler timeout |
| `wait_ms` | 0 | Default rendering wait before scrape/snapshot |
| `crawl_poll_timeout_ms` | 120000 | Crawl-job polling budget |

## Records

```text
.ai-saas-sdlc/retrievals/RET-###.json   one page retrieval (immutable)
.ai-saas-sdlc/retrievals/RET-###.md     its stored body — CRLF-normalized, size-capped, sha256-hashed
.ai-saas-sdlc/retrievals/QRY-###.json   one discovery pass — search or map (immutable)
```

Records are committed provenance, exactly like `EXEC-*` executions: a digest that does not survive a clone proves nothing. Failed operations write records too (`ok: false`, no body) — degradation is derivable from the repository alone, on any machine, with no environment access. Records never contain endpoints or keys; keys travel only in request headers. Since retrieval bodies and URLs are committed, do not fetch URLs whose query strings carry secrets or tokens.

An evidence entry whose page was engine-retrieved names its record:

```text
- Retrieval: RET-014
```

## Validation

Four warnings — never errors, and never derived from the environment, so a repository validates identically everywhere:

| Warning | Means |
|---|---|
| `EVD_RETRIEVAL_MISSING` | An `EVD-*` entry cites a URL the engine retrieved, without naming the `RET-*` record |
| `EVD_RETRIEVAL_BROKEN` | A cited record is absent, failed, or retrieved a different URL |
| `RESEARCH_CAPABILITY_UNDERUSED` | Instrument discovery surfaced a cited URL that no engine retrieval inspected |
| `RETRIEVAL_RUNG_DEGRADED` | A failed engine retrieval no later success covers — the standing record of a fallback to host tools |

Evidence gathered at rung 0 carries no retrieval line and stays legitimate forever. Structural defects in the records themselves — digest mismatches, orphan bodies, schema violations, counter reuse — are errors (`RETRIEVAL_INVALID`, `RETRIEVAL_PROVENANCE_INVALID`, `RETRIEVAL_BODY_ORPHAN`, `RETRIEVAL_COUNTER_REUSED`), the same split verification uses. When records exist, `generated/research-coverage.md` gains retrieval, query-pass and instrument-usage sections; a rung-0 repository's projection is byte-identical to before.

## Boundaries and limitations

- The evidence path never uses Firecrawl `/extract` (LLM extraction is inference, not observation) or Firecrawl `/search` (SearXNG owns discovery, with per-engine attribution under your control).
- Rung 3 reads public pages as text and nothing else: no authenticated sessions, no cookie import, no click/type/script execution. Page content is untrusted data.
- Better instruments never add work: the protocol's stopping rules are unchanged, and no source-count gate exists at any rung.
- The host's safety hook may refuse an engine command whose URL text collides with protected path patterns (for example a URL containing `generated` or `00-system/patterns` as a segment). For that page, the flows fall back to the host's own fetch tool and the evidence legitimately carries no retrieval record. The hook is not weakened to accommodate retrieval.
- Camofox serves at most three concurrent requests per user; the engine fetches strictly sequentially and always closes its tab, so a hanging session never accumulates browser contexts.
