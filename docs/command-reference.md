# Command Reference

The deterministic engine operates on the current working directory. In a development checkout, use `node <plugin-root>/bin/ai-saas-sdlc`; an npm-linked checkout may also expose `ai-saas-sdlc`. Installed host adapters resolve the bundled executable from their own plugin root.

## Initialization and inspection

| Command | Options | Behavior |
|---|---|---|
| `init` | `--project-id <id>`, `--idea <text>` | Copies the project skeleton, pins the installed pattern catalog to `00-system/patterns/`, creates internal state and refreshes projections. Refuses an initialized repository, unsafe destinations and any overwrite. |
| `state` | `--json` | Returns current baseline/evidence state, the active flow if any, and every open question with the baseline it was first seen open at and how many baselines it has stayed open. |
| `patterns list` | `--json` | Lists the consuming repository's verified pinned catalog. Before initialization only, it can list the plugin source catalog. |
| `impact` | `--json` | Compares canonical and fixed-contract hashes with the baseline and walks current plus historical reverse dependencies. |
| `tests select` | `--json` | Returns UT/IT/ST obligations derived from the affected closure and existing test dependencies. It does not execute tests. |
| `docs build` | `--out <dir>`, `--json` | Renders the current artifacts, relations and generated reports as a static, dependency-free HTML site: per-artifact pages with resolved ID links and reverse traceability, an interactive dependency graph, and status-filtered indexes. Writes only the output directory (default `.ai-saas-sdlc/cache/site/`), refuses managed content directories and directories it did not produce. The site is a projection for reading and never becomes authority or evidence. |

## Flow and artifact mutation

| Command | Options | Behavior |
|---|---|---|
| `flow start` | `--type <genesis\|reassessment\|evolution\|reconciliation>`, `--input <text>`, `--until <stage>`, `--intent <implementation>`, `--json` | Opens exactly one flow. Evolution and Reconciliation also reserve a `CHG-*`. `--until` declares where this turn stops: `behavior`, `design`, `tests`, `implementation` or `baseline`; absent, the flow runs to a successor baseline. `--intent implementation` (evolution only) marks the flow as bringing code into conformance with specified behavior; it routes `flow next` guidance and is never a gate. Flow legality and starting snapshots are engine-enforced. |
| `artifact create` | `--type <catalog-type>`, `--id <ID>`, `--title <title>`, `--json` | Creates one new draft from the pinned pattern at its canonical path. Requires a compatible active flow, checks type/ID/path/title, refuses collisions and rejects `test_result`. |
| `flow checkpoint` | `--stage <stage>`, `--until <stage>`, `--json` | Records how far the open flow has come, and optionally retargets where it stops. Checkpoints only move forward; a checkpoint recorded past the declared stop raises the target with it, so a continued flow never keeps a stale stop. |
| `flow next` | `--json` | Reports the open flow's progress and the exact command to run next; an implementation-intent flow continues through the implement skill. With no open flow, implementation sources configured and mapping debt standing, the report adds a `suggested_segment` — the feature and segment the warning ledger scores highest (unmapped design 4, unproven UT 3, IT/ST 2 each). Information only; read-only. |
| `refresh` | `--check`, `--editorial`, `--json` | Rebuilds generated projections, including `rule-coverage.md`. `--check` reports drift without writing. `--editorial` first accepts an eligible body-only representation change. The two flags cannot be combined. Any writing form also records the resolved engine at `.ai-saas-sdlc/engine.json`. |
| `baseline create` | `--json` | Runs validation and flow-specific completion, impact and verification rules; then records the required evidence/product baseline. Reassessment advances EVR while retaining the product baseline ID. |
| `flow close` | `--json` | Closes a baselined flow or records a clean cancellation. Rejects dirty work without the flow's baseline and changes made after that baseline. |

`artifact create` substitutes identity metadata only. It does not synthesize product content or activate the artifact. New `created_by_change` values are bound to the active `FLOW-*` or `CHG-*`.

## Validation and verification

| Command | Options | Behavior |
|---|---|---|
| `validate` | `--active`, `--all`, `--json` | Checks the initialized repository and generated drift. In schema v1, `--active` and `--all` are accepted playbook/CI intent flags over the same full deterministic report. Returns non-zero when any error exists. |
| `verify` | `--unit`, `--integration`, `--system`, `--all`, required `--execute`, `--json` | Runs exact commands from `sdlc.config.yaml` only during Evolution or Reconciliation. With no level flag, all three levels are selected. Every attempt reserves a new `EXEC-*` and renders `RESULT-EXEC-*`; failures remain in history and return non-zero. A completed run resynchronizes generated projections, so record-dependent views such as `generated/platform-coverage.md` stay current mid-flow. |
| `migrate` | `--check`, `--json` | Reports whether config/state schema differs from schema 1. Version 1 provides no predecessor transformation; a mismatch returns non-zero. |

## Research retrieval

Optional self-hosted instruments, configured through environment variables only (see [research tools](research-tools.md)). With nothing configured every command below except `probe` refuses politely and the flows use the host's own tools, exactly as before.

| Command | Options | Behavior |
|---|---|---|
| `research probe` | `--json` | Reaches each configured instrument for real and reports the effective rung, per-instrument reachability, detected Firecrawl API generation and the active policy caps. Legal anywhere — even before `init`; takes no lock and writes nothing. Always returns zero. |
| `research search` | `--query <text>`, `--pass <authority\|official\|discussion\|counter\|freshness>`, `--engines <csv>`, `--categories <csv>`, `--language <code>`, `--page <n>`, `--time-range <day\|month\|year>`, `--json` | One SearXNG discovery pass recorded as an immutable `QRY-*` record, including per-engine failures — an unresponsive engine is never mistaken for market silence. Requires an active genesis or reassessment flow. A failed pass writes a failed record and returns non-zero. |
| `research fetch` | `--url <url>`, `--wait <ms>`, `--json` | Inspects one public page through Firecrawl; on failure with Camofox configured, escalates automatically and stamps the escalation on the single resulting record. Writes `RET-*.json` plus the CRLF-normalized, size-capped, sha256-hashed body `RET-*.md`. A retrieval that fails on every configured instrument writes a failed record and returns non-zero. |
| `research map` | `--url <url>`, `--search <term>`, `--limit <n>`, `--json` | Enumerates a site's URLs through Firecrawl map as a `QRY-*` record — competitor pricing/security/docs pages are found, not guessed. |
| `research crawl` | `--url <url>`, `--include <csv>`, `--limit <n>`, `--json` | Captures a bounded page subtree through Firecrawl crawl: one `RET-*` record and body per page, capped by the local policy's `crawl_page_cap`. Reserved-but-unused identities stay burned; a failed crawl records one failed retrieval. |
| `research diff` | `--ret <RET-id>`, `--against <RET-id>`, `--json` | Deterministic local comparison of two stored bodies of the same URL — reassessment's answer to "has this page changed?". Defaults to the previous successful retrieval of the URL. No HTTP, no record, no lock. |

Mutating research commands allocate their record identity and burn the counter under the project lock, release it for the network work, and re-acquire it to persist the body-then-record pair — the lock is never held across HTTP. Each command ends by resynchronizing generated projections, so the retrieval sections of `generated/research-coverage.md` stay current mid-flow.

Validation covers configuration, canonical type/path identity, metadata, permanent IDs, graph references and cycles, lifecycle and supersession, immutable input/ADR/terminal history, active content contracts, pinned-pattern integrity, internal state/change/execution/retrieval schemas, execution/result binding, retrieval body digests, implementation mappings and generated synchronization. Baseline creation adds flow boundaries, coverage and required execution verdicts.

Seventeen findings are reported as warnings and never block a baseline, because each names a judgement or a debt rather than a broken structure: `RULE_UNVERIFIED` for a declared business rule no specification claims, `SPEC_OVERSIZED` for a live integration or system specification past the case threshold, `CASE_REFERENCE_BROKEN` for a qualified case reference naming a case its specification does not declare, `QUESTION_STALE` for an open question that has outlived three baselines, `PLATFORM_EVIDENCE_MISSING` for a live platform target no verification command declares evidence for, `PLATFORM_DECLARATION_UNKNOWN` for a declaration naming no live platform target, `PLATFORM_EVIDENCE_CONTRADICTED` for a live platform target whose declared `host_os` token no recorded execution declaring it has ever observed, `WIRE_AUTHORITY_UNDECLARED`, `SCHEMA_AUTHORITY_UNDECLARED` and `TRANSITION_AUTHORITY_UNDECLARED` for a live operation, entity or screen that names no owning contract file in `depends_on` while its family holds sibling files, `AREA_UNREGISTERED` for a live artifact whose ID names an area outside the optional `areas` registry, `EVD_RETRIEVAL_MISSING` for an engine-retrieved URL whose evidence entry does not cite its `RET-*` record, `EVD_RETRIEVAL_BROKEN` for a cited retrieval record that is absent, failed or retrieved a different URL, `RESEARCH_CAPABILITY_UNDERUSED` for a cited URL that instrument discovery surfaced but no engine retrieval inspected, `RETRIEVAL_RUNG_DEGRADED` for a failed engine retrieval no later success covers — the durable record of a fallback to host tools, `IMPLEMENTATION_MAPPING_MISSING` for an active feature none of whose declaring artifacts maps to a configured implementation source — the durable record that it is specified but not yet implemented, and `IMPLEMENTATION_LEVEL_UNPROVEN` for a feature level whose active UT, IT or ST specifications include none mapped to an implemented test. They are work owed, and they are reported precisely so that owing it stays visible.

## Mutation safety

All mutating engine operations use a project-scoped lock. Managed writes are path-contained and symlink-aware. Internal records, pinned patterns, generated projections, result artifacts and retrieval records with their stored bodies are engine-owned committed provenance. JSON output is intended for host skills, hooks and CI; human-readable output is intentionally compact.
