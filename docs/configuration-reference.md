# Configuration Reference

`sdlc.config.yaml` belongs at the root of the centralized documentation repository. It is a fixed canonical contract (`SDLC-CONFIG`) and participates in baselines and impact analysis.

```yaml
schema_version: 1
project_id: approval-workflow
research_mode: public-web-only
areas: [APPROVAL, BILLING]
implementation_sources:
  - id: web-app
    path: ../approval-web-app
verification:
  unit:
    - id: web-unit
      cwd: ../approval-web-app
      command: npm test -- --runInBand
  integration:
    - id: web-integration
      cwd: ../approval-web-app
      command: npm run test:integration
  system:
    - id: web-system
      cwd: ../approval-web-app
      command: npm run test:system
      platforms: [PLT-WIN-001]
```

No additional top-level or nested keys are accepted in schema version 1; the optional keys are the command-level `platforms` list and the top-level `areas` registry.

## Core fields

| Field | Contract |
|---|---|
| `schema_version` | Must be integer `1`. |
| `project_id` | Stable lowercase letters, numbers and hyphens. |
| `research_mode` | Must be `public-web-only`. Real host search/page inspection is required for claimed evidence. |
| `implementation_sources` | Array of unique `{id, path}` mappings; IDs use lowercase letters, numbers and hyphens. |
| `verification` | Exactly `unit`, `integration` and `system`, each containing unique `{id, cwd, command}` entries, each optionally carrying `platforms: [PLT-...]` — the live platform targets the command produces execution evidence for. |
| `areas` | Optional non-empty array of unique uppercase area segments (`ORDERS`, `ORDERS-EU`). When present, every live scalable artifact whose ID parses as `<PREFIX>-<AREA>-<NNN>` must name a registered area; violations are `AREA_UNREGISTERED` warnings. |

## Implementation-source boundary

An implementation source declares the only external source tree a Product Evolution or Reconciliation may map, inspect or edit. It does not make that source part of the documentation repository, and the host still needs user-authorized filesystem access.

Paths may be relative to the documentation repository or absolute. The engine verifies real-path containment and rejects symlink/junction escapes. It records configured source state when a flow starts and when a baseline is created, using Git state when available and a deterministic content snapshot otherwise. This lets close/cancellation detect source changes outside canonical documents.

The plugin never initializes, clones, commits, pushes, deploys or operates an implementation repository.

Artifact implementation links use `<source-id>:<relative-path>`:

```yaml
implementation:
  - web-app:src/approval/revoke-link.ts
```

The source ID must exist, the relative target must remain inside that source, and the mapped path must exist.

Mapping presence is evidence, never a gate. With sources configured, `validate` reports `IMPLEMENTATION_MAPPING_MISSING` for an active feature none of whose declaring artifacts carries a mapping, and `IMPLEMENTATION_LEVEL_UNPROVEN` for a feature whose active UT, IT or ST specifications include none mapped to an implemented test. Both are standing warnings of the platform-evidence doctrine: a documentation-first repository wires a codebase without owing whole-repository conformance, a feature is implemented one segment at a time with each baseline recording honestly what remains, and a feature validated on paper before anyone builds it is a legitimate permanent state whose warning is its durable record. Once sources are configured, `generated/implementation-coverage.md` renders the per-feature join — design and specification mappings, latest executions per level and the unmapped complement — and `generated/implementation-plan/<FTR-ID>.md` renders one work packet per active feature: its closure in dependency order with mappings, owning contract files, referenced foundation rows, covering specifications and configured commands.

## Verification commands

The engine does not infer commands from package files or document prose. `verify --execute` runs only the exact strings declared under the selected UT, IT or ST level. A command's `cwd` must resolve to the documentation root or a configured implementation source.

Each execution records:

- non-reusable `EXEC-*` identity and active `FLOW-*`;
- level and configured command ID;
- exact command and configured working directory;
- start/end time and exit code;
- Git commit when available;
- pre-execution source snapshot hash;
- captured log path and digest;
- the observed host (operating system, release, architecture, Node version);
- the command's `platforms` declaration, copied verbatim when present.

The engine renders the matching `RESULT-EXEC-*` from that record. It never overwrites a failed attempt; a rerun receives a new execution/result ID. Baseline verification uses the latest applicable attempt for each declared command, and an execution recorded before a `platforms` declaration was added does not count for it — the command re-runs so the record carries what was declared.

### Platform evidence declarations

A command that exercises a shipped platform declares it: `platforms: [PLT-WIN-001]`. The declaration is a human claim, recorded beside the machine-observed host so the two never blur — an Android declaration whose records always show a `win32` host is visible to any reviewer. `validate` reports `PLATFORM_EVIDENCE_MISSING` for every live platform target no command declares, and `PLATFORM_DECLARATION_UNKNOWN` for a declaration matching no live target. Both are warnings: a platform that cannot be executed on any available machine legitimately stays undeclared, with the limitation recorded in `TEST-POLICY`.

A platform target may additionally declare the host its evidence is expected to be observed under, with the optional `host_os` frontmatter field on the `PLT-*` artifact itself — a `process.platform` token such as `win32`, `darwin` or `linux` (an iOS target exercised from macOS machines declares `darwin`). The token is a declaration, not a merge of the two records: when every recorded execution declaring the target observed a different host os, `validate` reports `PLATFORM_EVIDENCE_CONTRADICTED`, a standing warning of the same doctrine. Once any platform target exists, `generated/platform-coverage.md` renders the whole join — targets, declaring commands, latest matching executions, observed hosts and unknown declarations — in one view.

## Area registry

`areas` is an opt-in namespace registry. Undeclared, IDs stay unconstrained, exactly as before. Declared, every live scalable artifact whose ID parses as `<PREFIX>-<AREA>-<NNN>` must name a registered area — `SUB-ORDERS-001` demands `ORDERS`; `SUB-ORDERS-EU-001` demands `ORDERS-EU`, never the shorter prefix. `validate` reports `AREA_UNREGISTERED` as a warning: an unregistered area is a naming decision made visible, not a broken structure, and IDs without a numeric suffix are exempt.

## Research instruments (optional)

Self-hosted research instruments are configured through environment variables, never through this file: `sdlc.config.yaml` is a baselined, hashed contract, and endpoints or keys are machine-local facts that must not enter committed history. `research_mode` stays `public-web-only` — the instruments change how public pages are reached, not what counts as evidence.

| Variable | Meaning |
|---|---|
| `AI_SDLC_SEARXNG_URL` | SearXNG origin for engine-recorded discovery passes |
| `AI_SDLC_FIRECRAWL_URL` | Firecrawl origin for engine-recorded page inspection |
| `AI_SDLC_FIRECRAWL_KEY` | Optional bearer key; the header is attached only when set |
| `AI_SDLC_CAMOFOX_URL` | camofox-browser origin for rung-3 escalation; setting it is consent |
| `AI_SDLC_CAMOFOX_KEY` | Optional bearer key; only when the instance requires one |

With none of these set, every flow behaves byte-identically to a build without the feature. Numeric operating caps live in the optional, git-ignored `.ai-saas-sdlc/research-tools.json` (`crawl_page_cap`, `body_max_bytes`, `search_result_cap`, `request_timeout_ms`, `wait_ms`, `crawl_poll_timeout_ms`) — user-created by hand, because the host's safety hook denies assistant writes under `.ai-saas-sdlc/`. See [research tools](research-tools.md) for instrument setup, records and validation.

## Documentation-only mode

Keep `implementation_sources` and all verification command arrays empty when no implementation repository is in scope:

```yaml
implementation_sources: []
verification:
  unit: []
  integration: []
  system: []
```

Evolution still requires active FTR -> UC/FLOW -> UT/IT/ST specification coverage. Execution is reported as `not-configured`; no pass is inferred or fabricated.
