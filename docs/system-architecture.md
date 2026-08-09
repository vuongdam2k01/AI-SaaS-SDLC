# System Architecture

AI SaaS SDLC is one shared domain package exposed through two host-specific skill surfaces. The model performs evidence synthesis and design reasoning; the engine owns deterministic repository state and proof boundaries.

## Runtime layers

| Layer | Location | Responsibility |
|---|---|---|
| Claude adapters | `claude/skills/` | Five manual slash-command skills and Claude tool-name mapping |
| Codex adapters | `skills/` | Five explicit Codex skills plus `agents/openai.yaml` presentation metadata |
| Flow playbooks | `resources/flow-playbooks/` | Complete accepted-input, read, transform, write, close and re-entry behavior |
| Protocols | `resources/protocols/` | Shared research, behavior, solution, impact, test and repair rules loaded as needed |
| Source patterns | `resources/artifact-patterns/` | Versioned scalable patterns and data-driven foundation/content contracts |
| Project skeleton | `resources/project-template/` | Fixed live repository files copied by initialization |
| Deterministic engine | `src/`, built `dist/`, `bin/ai-saas-sdlc` | State, locks, catalog resolution, creation, graph, validation, verification, baselines and projections |
| Portable hooks | `hooks/hooks.json`, `src/hooks/` | Shared session context and narrow preventive checks for Claude Code and Codex |

Both manifests identify the same product/version and route to the same packaged resources and engine. Host adapters contain invocation syntax, not independent copies of the method.

## Consuming repository

Initialization produces three distinct truth classes:

```text
00-system/patterns/   immutable snapshot of the installed authoring contracts
01-discovery/..05-control/   canonical live product records
generated/            reproducible indexes, coverage and impact projections
.ai-saas-sdlc/        engine-owned state, changes, executions and baseline manifest
```

The source library is copied and hash-pinned. Once initialized, catalog listing, artifact creation and active-content validation use the consuming snapshot, so upgrading the installed plugin does not silently rewrite the repository's authoring contract. Live artifacts define product truth; generated files and internal records are not edited by the model.

## Temporal model

There are four mutation flows and one read-only interface:

- Genesis creates the first evidence revision and product baseline.
- Evidence Reassessment advances evidence while retaining product-baseline identity.
- Product Evolution creates a change and successor product baseline.
- Reconciliation creates a repair change and successor product baseline.
- Inspect State reads current state without opening a flow or writing files.

`EVR-*` identifies public-evidence revision. `BL-*` identifies verified product/document semantics. `CHG-*` exists only for Evolution and Reconciliation. `FLOW-*` identifies every mutation attempt, including a clean cancellation. Git retains representation history but does not replace the engine's temporal records.

Only one flow may be active. The engine captures canonical and configured implementation-source snapshots at flow start. A dirty flow can close only after its own baseline and with no later drift; an unchanged flow may close as a cancellation. Body-only editorial synchronization is explicit and never accepts evidence, metadata, relationships or immutable records.

## Dependency and coverage model

Canonical artifacts declare forward relationships: `depends_on`, `decisions`, `writes_to`, `supersedes` and `implementation`. The engine builds reverse edges and unions current and previous-baseline graphs, so removing an old dependency or shared-write edge still reaches its former consumers.

`SDLC-CONFIG`, OpenAPI, DBML and screen transitions participate as fixed contracts. Impact compares current hashes with the baseline, then walks reverse dependencies. Test selection derives UT/IT/ST obligations from the affected closure. Coverage projections join evidence, product acceptance, behavior/design and verification references without copying reverse links into authored files.

## Enforcement boundary

| Actor | Can establish | Cannot establish |
|---|---|---|
| Host/model | Meaning from public sources, explicit decisions, inspected code and design reasoning | Machine provenance, an execution pass without running it, or semantic truth by self-review |
| Engine | Schema/config validity, canonical identity/path, content-contract shape, references, lifecycle, immutability, path confinement, graph/coverage rules, execution/result binding, baselines and generated synchronization | Whether prose is persuasive, a market conclusion is commercially correct, or a design is subjectively good |
| Host hooks | Session context, denial of common direct edits, and one-time Stop blocking for active-flow hard errors | Full validation, semantic review, or a substitute for baseline creation |

### Portable plugin hooks

- SessionStart reports repository detection, active BL/EVR/flow and machine-owned boundaries.
- PreToolUse blocks direct or obvious shell-indirected writes to `generated/`, pinned patterns, results and internal state; it also protects captured raw input, accepted ADRs, terminal artifacts and configured implementation sources outside Evolution/Reconciliation.
- Stop runs deterministic validation for an active flow and may block once for hard errors. It explicitly does not start a prose-review loop.

The shared hook file uses one portable command string per handler. Claude Code and Codex discover it from the conventional `hooks/hooks.json` plugin path. Codex requires review and trust of the command-hook definition before it runs. These hooks are fast safeguards and do not intercept every possible filesystem mechanism or replace the authoritative data model.

### Codex boundary

Codex loads the same conventional `hooks/hooks.json` without a manifest override; it also supplies `CLAUDE_PLUGIN_ROOT` for compatible plugin-hook path resolution. Codex maps `apply_patch` through the Edit/Write matcher aliases, and the PreToolUse handler extracts its target paths before enforcing protected-file and flow boundaries. Hook trust can be disabled or withheld by the user or administrator, so lifecycle, pinned-snapshot integrity, active-content contracts, immutable records, result provenance and baseline acceptance remain engine-enforced on both hosts.

## Verification provenance

The engine executes only commands declared in `sdlc.config.yaml`, only during Evolution or Reconciliation, and only in the documentation root or configured implementation sources. Each attempt receives a non-reusable `EXEC-*`, captured log and `RESULT-EXEC-*`. The result is deterministically rendered and bound to the active flow, command ID/string, working directory, source commit when available, pre-execution source snapshot, exit code and log digest.

Failed attempts remain immutable history. A later successful run is a new record, never an overwrite.

## Safety properties

Mutating operations are serialized by a project lock. Managed paths are normalized, root-confined and checked against symlink/junction escape. Initialization refuses overwrite. Original input, accepted ADR bodies, retired/superseded artifacts, pinned patterns, generated projections, internal records and results have specialized protection and validation.
