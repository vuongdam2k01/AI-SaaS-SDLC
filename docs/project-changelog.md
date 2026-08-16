# Project Changelog

See the root [CHANGELOG](../CHANGELOG.md) for the release summary. This contributor view records documentation-impact areas that must remain synchronized with implementation.

## 1.22.0 - 2026-08-16

| Area | Documentation impact |
|---|---|
| Method | `inspect-state.md` gains `config requirements` in its mandatory read-only actions when implementation sources are configured, a report line for the configuration surface, and the standing instruction to state key names only — never report, request or infer a value |
| Engine | New `runtime-config.ts` (`observedConfigKeys` nine-form multi-language scan, `suppliedConfigKeys` presence-only check, `configKeyStates` shared joined view, `unrunnableCommands`); `config.ts` and `project-config.schema.json` accept the top-level `configuration` list and per-command `requires_config`; `types.ts` gains `ConfigRequirement`; `validation.ts` pushes the findings beside the areas registry |
| Validation | Three new warnings — `CONFIG_KEY_UNDECLARED`, `CONFIG_REQUIREMENT_UNSUPPLIED`, `CONFIG_DECLARATION_UNKNOWN`; warning table reaches thirty-five; no new projection files, because supply state is machine-local and a generated file carrying it would raise `GENERATED_DRIFT` |
| Config | `sdlc.config.yaml` template documents both new keys and states the workflow explicitly: run `config requirements` first, declare in response to what the code already reads. Six optional keys now exist, not four |
| Docs | `command-reference.md` gains the `config requirements` row |
| Compatibility | Both new config keys are optional and every finding is a warning, so an existing repository upgrades without a schema edit and without losing the ability to close a baseline. No catalog generation change: the configuration surface is engine-derived, not an artifact contract |

## 1.21.0 - 2026-08-16

| Area | Documentation impact |
|---|---|
| Method | `genesis.md` §8 adds the visual identity commitment to the consolidated material interaction — commit now or defer as a `QST-*` citing `UX-RULES#design-tokens`, silence is not a deferral; `design-implementation.md` §1 makes the token-versus-implementer boundary exact (cite `DT-*` rows, record shared choices back, proceed under the standing warning when the table is empty) |
| Engine | New `design-tokens.ts` (`committedDesignTokens` shared predicate, `designTokensDeferred`, `designTokenFindings`); `pattern-catalog.ts` accepts `min_rows: 0` and `minimum: 0` so a contract can own a shape without forcing a premature commitment; `validation.ts` pushes the new findings beside screen coverage |
| Validation | One new warning — `DESIGN_TOKENS_UNCOMMITTED`: live screens rendering with no committed `DT-*` token and no open question citing `UX-RULES#design-tokens`; no new projection files |
| Patterns | Catalog generation 6: `ux_rules` gains the `Design tokens` heading, table shape and `design_token` namespace (`DT-NN`), the first zero-minimum contract; `screen.pattern.md` and `shared-component.pattern.md` contract comments extend the never-restate rule to token values; `artifact-patterns/README.md` consumer row updated |
| Project template | `ux-rules.md` Design tokens comment stops naming a flow that does not exist and states the commit-or-defer rule with `DT-*` IDs; completion contract gains the tokens box; `validation-rules.md` warning count thirty-one → thirty-two plus the commitment-warning paragraph |
| Docs | `command-reference.md` (thirty-two warnings), `inspect-and-check-results.md` (table row, count), `artifact-reference.md` (generation 6 paragraph), `wire-a-codebase.md` (visual commitment routed to Product Evolution, no longer to the wire flow), `implement-a-feature.md`, `inspect-state.md` reporting contract |
| Certification | New `tests/design-tokens.test.ts` — pure findings tiers plus a packaged-repository arc through `addApprovalFeature`; `packaged-lifecycle.test.ts` count and version pins moved |
| Compatibility | Catalog generation 5 → 6. Existing repositories keep their pin until `patterns migrate` is run deliberately; after migrating, a repository with live screens and no committed tokens reports `DESIGN_TOKENS_UNCOMMITTED` — a warning that never blocks a baseline, closed through Product Evolution or a deferring question. Accepted ADRs and the original idea stay exempt from the tightened contract |

## 1.20.0 - 2026-08-14

| Area | Documentation impact |
|---|---|
| Method | `impact-analysis.md` "Engine observations" gains `ripple`; "Classify affected items" replaces the storage sentence with the `impact classify` verb and keeps the substance in canonical artifacts/issues; "Test selection" gains `SPEC_EXECUTION_UNATTRIBUTED`; the stop condition becomes observable. `product-evolution.md` §5/§8/§12, `reconciliation.md` §6/§9 and `inspect-state.md` reporting contract updated |
| Engine | New `ripple-classification.ts` (verb + derivation + findings), `selection-evidence.ts`, `claim-dependencies.ts`, `change-records.ts` (lenient loader), `editorial-digests.ts`; `graph.ts` gains `rippleClosure` beside `reverseClosure`; `impact.ts` gains the `ripple` field; `mapping-hashes.ts` gains `documentationDriftedArtifacts`; `baseline.ts` stamps the ledger, records structural digests and refuses structural editorial edits; `impact` becomes a command group retaining its parent action |
| Validation | Four new warnings — `IMPACT_UNCLASSIFIED`, `DOCUMENTATION_DRIFT`, `SPEC_EXECUTION_UNATTRIBUTED`, `CLAIM_WITHOUT_DEPENDENCY`; `change-impact/<CHG-ID>.md` gains an existence-gated `Classification` section; no new projection files |
| Project template | `validation-rules.md` warning count twenty-seven → thirty-one plus the consequence-warning paragraph; `document-rules.md` DR-12 and DR-16 name where they are machine-checked |
| Docs | `command-reference.md` (impact/classify/tests/refresh rows, thirty-one warnings), `inspect-and-check-results.md` (four table rows, count, editorial structural-guard section), `configuration-reference.md` (drift paragraph), `evolve-existing-behavior.md`, `reconcile-a-failure.md`, `implement-a-feature.md`, root README command block |
| Certification | New `tests/ripple-classification.test.ts`, `tests/selection-evidence.test.ts`, `tests/claim-dependencies.test.ts`, `tests/editorial-digests.test.ts`; `proof-depth.test.ts` and `contract-and-flow-safety.test.ts` extended; `cli.test.ts` pins bare `impact --json` against the group conversion |
| Compatibility | Additive schema on both records: `ChangeRecord.classification` and `impact.ripple`, `BaselineManifest.editorial_digests`. Records and baselines written before 1.20.0 observe nothing — no debt reported, editorial path unchanged. A 1.19 engine rejects records a 1.20 engine touched; do not downgrade mid-repository. Run `refresh` once after upgrading. All four warnings never block a baseline |

## 1.19.0 - 2026-08-14

| Area | Documentation impact |
|---|---|
| Method | New `resources/protocols/test-case-derivation.md`, cited from `test-derivation.md`, `product-evolution.md` §9 and `reconciliation.md` §7; `behavior-formation.md` case derivation expanded into trigger expansion |
| Engine | New `claims.ts` (shared claim predicate and foundation reference table), `foundation-coverage.ts`, `screen-coverage.ts`, `system-documents.ts`, `pattern-migration.ts`; `pattern-catalog.ts` gains the `system_documents` contract layer; `pattern-snapshot.ts` gains `writePatternSnapshot`; `patterns migrate` CLI subcommand reporting three contract sections; content contracts accept a frozen-artifact exemption |
| Validation | Six new warnings — `ACCESS_UNVERIFIED`, `INVARIANT_UNVERIFIED`, `ERROR_UNVERIFIED`, `UX_UNVERIFIED`, `SCREEN_BEHAVIOR_UNCLAIMED`, `SYSTEM_DOCUMENT_INCOMPLETE`; two new projections `foundation-coverage.md` and `screen-coverage.md`, both existence-gated; the four `00-system` documents are validated without entering the artifact graph |
| Patterns | Catalog generation 5: every normative prose block becomes an identified table across design, product, verification and control patterns; IT/ST failure checks folded into `TC-*` rows; `Detail rule` sentence in all 24 contract comments; `artifact-patterns/README.md` gains the consumer table; catalog gains a third contract layer beside patterns and foundations |
| Project template | `access-control.md`, `error-catalog.md`, `ux-rules.md` and `test-policy.md` rule sections become identified tables; six foundations declare local-ID namespaces; `document-rules.md` gains `DR-01`–`DR-16` and `glossary.md` gains `NR-01`–`NR-05`, while `artifact-lifecycle.md` and `validation-rules.md` keep prose with a stated reason; `validation-rules.md` warning count twenty-one → twenty-seven; `glossary.md` gains both coverage rows |
| Evals | New `spec-derivation` case with `closure-honesty` grader, run against two deliberately unequal screens so size proportionality is graded; `eval-contracts.test.ts` and `evals/README.md` move from six cases to seven |
| Docs | `command-reference.md` (patterns migrate, twenty-seven warnings), `artifact-reference.md` (generation 5 namespaces, system-document layer), `pattern-to-instance.md` (migration path and the third layer), `inspect-and-check-results.md` (warning table and generated views), `implement-a-feature.md`, guides index and root README generated-view lists |
| Certification | Real-binary drive with two adversarial red-proofs in `plans/reports/certifier-2026-08-14-canonical-model-certification.md`; retained end-to-end coverage in `tests/packaged-lifecycle.test.ts` |
| Compatibility | Catalog generation 4 → 5. Existing repositories keep their pin until `patterns migrate` is run deliberately; the two new projections appear only once a screen or live foundation rule exists, so run `refresh` once after upgrading to avoid `GENERATED_DRIFT`. All six new warnings never block a baseline. Accepted ADRs and the original idea are exempt from tightened content contracts after baselining. Migration re-pins system-document contracts without carrying the documents, so `SYSTEM_DOCUMENT_INCOMPLETE` is expected until they are brought forward from the template |

## 1.18.2 - 2026-08-14

| Area | Documentation impact |
|---|---|
| Guides | New `resume-an-interrupted-flow.md`; `implement-a-feature.md` retitled and routed to the implement skill; `implement-per-segment.md`, `inspect-and-check-results.md`, `wire-a-codebase.md`, `reconcile-a-failure.md`, `start-a-new-product.md`, `reassess-evidence.md` and `evolve-existing-behavior.md` corrected and extended; index gains resume and drift rows plus the Codex install link |
| Project template | `00-system/validation-rules.md` warning count corrected to twenty-one; `sdlc.config.yaml` documents all four optional keys with `report` and `timeout_ms` examples |
| Schemas | `project-config.schema.json` no longer advertises the reserved `json` report format the loader rejects |
| Reference | `configuration-reference.md` verification row lists `report` and `timeout_ms`; the budgets section states the format enum |
| Compatibility | Documentation and template text only; no engine, schema-accepting, gate or catalog behavior change |

## 1.18.1 - 2026-08-14

| Area | Documentation impact |
|---|---|
| Engine | Mapping-table parsing (alignment dividers, backticks, pipe-less rows, fenced examples), `isWithin` containment, one path-missing finding per specification, resume/continuation agreement, ancestor-walking hook sentinel, rewritten init marker guard |
| Validation | New regression tests in `proof-depth`, `implementation-gates`, `implementation-intent`, `project-integration` and `hooks`, each proven red against the committed 1.18.0 tree first |
| Docs | `plans/reports/certifier-2026-08-14-post-hardening-certification.md` records the defects, the real-binary evidence and three adjudications, including that the singular `Case ID` header the parser tolerates is rejected by the pinned content contract |
| Compatibility | Message and diagnostic changes only; no schema, gate, catalog or record-shape change |

## 1.18.0 - 2026-08-13

| Area | Documentation impact |
|---|---|
| Engine | `state.ts` uninitialized message names the docs-repo precondition; `init --force` + code-marker refusal; `flow next` implementation continuation carries feature/segment; per-command `timeout_ms`; byte-accurate output caps; `case_row_cap` record field; two mapping-row warnings |
| Hooks | Bash keyword rules (internal directory included) gated on the managed-repo sentinel; SessionStart open-flow line carries intent, stages and the exact resume command |
| Method | Implementation playbook gains docs-root precondition, resume mechanics, cold-start reconstruction, refresh-before-re-read, read budgets, delegation-outcome report bullet; delegation protocol gains the packet template, delegate refusal rule and bounded controller loop; scouting gains the first-ten blast-radius cap |
| Adapters | All twelve host skills state the docs-root precondition; the four agents carry the packet-absent refusal rule; implement accepts the `continue FLOW-*` trailer |
| Docs | configuration-reference (timeout_ms, new warnings), command-reference (init --force, flow next, twenty-one warnings), validation-rules template, inspect guide/playbook warning lists, wire-a-codebase direction note |
| Compatibility | Config accepts a new optional command key; execution records may carry `case_row_cap` (one-way ratchet like `timed_out`); old records and baselines render and validate unchanged |

## 1.17.1 - 2026-08-13

| Area | Documentation impact |
|---|---|
| Claude adapters | The four agents pin the cost gradient (`haiku`/`opus`/`sonnet`/`fable`) as floors; `claude/skills/implement/SKILL.md` instructs upward-only spawn overrides |
| Method | `implementation-delegation.md` states the floor rule for delegate tiers |
| Validation | package-check requires the exact model pin on every agent |
| Docs | `plans/reports/evaluator-2026-08-13-host-capability-audit.md` gains the model-allocation amendment |
| Compatibility | Configuration-only patch: no engine, schema, message, gate or catalog change; blocked pins substitute gracefully per host model-config rules |

## 1.17.0 - 2026-08-13

| Area | Documentation impact |
|---|---|
| Claude adapters | `claude/agents/` ships four delegate adapters (scout, reviewer, debugger, counsel); `claude/skills/implement/SKILL.md` names them as the delegation protocol's preferred delegates on this host |
| Hooks | `hooks/hooks.json` SessionStart matcher gains `compact\|fork`; `src/hooks/pre-tool-use.ts` gates repo-shaped protections on the `.ai-saas-sdlc/` sentinel while keeping internal-directory rules unconditional |
| Method | Delegation economics and the counsel role in `implementation-delegation.md`; reviewer anti-chase in `spec-compliance-review.md`; never-weaken-a-spec in `craft-testing.md`; untrusted-content and `[UNVERIFIED]` re-grep in `implementation-scouting.md`; counsel consult in `implementation-debugging.md` |
| Validation | package-check enforces the four-agent surface and the SessionStart matcher; the Codex manifest rejects an `agents` field; `tests/dual-host-packaging.test.ts` pins the manifest routing; `tests/hooks.test.ts` pins unmanaged-repo pass-through, unconditional internal denial and the compact-source summary |
| Docs | README, system-architecture, flow-reference, codex-installation, development-roadmap, the implement-per-segment guide, CLAUDE.md and AGENTS.md state the agent surface and the Codex asymmetry |
| Compatibility | No engine schema, message, gate or catalog change; hook behavior changes are scoped to unmanaged repositories and post-compaction context |

## 1.16.1 - 2026-08-13

| Area | Documentation impact |
|---|---|
| Evals | `evals/README.md` states the capture convention explicitly: the session's final response(s) are saved into the output repository so the harness can audit the response-only output markers (`--intent implementation`, `suggested_segment`, PASS/MISSING/EXTRA) |
| Reports | `plans/reports/certifier-2026-08-13-implementation-extension-certification.md` records the end-to-end certification evidence matrix, findings F1–F5 and their adjudications |
| Compatibility | Documentation-only patch: no engine, schema, message, gate or catalog change |

## 1.16.0 - 2026-08-13

| Area | Documentation impact |
|---|---|
| Method | `solution-formation.md` gains *Divergence before convergence* (anti-strawman rule anchored to the ADR pattern's credible-option cells); Genesis §8 presents competing opportunity framings as explicit alternatives inside the existing consolidated interaction; Reconciliation §6 diverges on multiple viable repairs |
| Compatibility | Text-only method release: no engine, schema, message, gate or catalog change |

## 1.15.1 - 2026-08-13

| Area | Documentation impact |
|---|---|
| Method | `spec-compliance-review.md` gains the size-gated, diff-verified simplification pass |
| Compatibility | Text-only patch: no engine, schema, message or catalog change |

## 1.15.0 - 2026-08-13

| Area | Documentation impact |
|---|---|
| Method | Nine additions under `resources/protocols/`: `implementation-debugging`, `implementation-delegation`, `implementation-review-checklists`, `craft-api-and-backend`, `craft-data`, `craft-auth-and-payments`, `craft-client`, `craft-testing`; `spec-compliance-review` gains the edge-case scout, overlay wiring and pre-submit sweep; the implementation playbook gains the load-by-situation table and routes debugging/delegation to their owners |
| Hooks/engine | `suggestNextSegment` exported from `flow-guidance.ts`; SessionStart prints the implementation-debt line (fail-open) |
| Compatibility | Method + one advisory hook line; no schema, gate, message or validation change |

## 1.14.0 - 2026-08-13

| Area | Documentation impact |
|---|---|
| Method | New `resources/protocols/design-implementation.md` (screen brief from owned sources, countable self-review gate, host-capability visual verification) and `resources/protocols/content-implementation.md` (string ownership table, writing rules, conversion-claim traceability); implementation playbook section 6 routes screen segments through both |
| Pinned system contracts | `UX-RULES` template gains the optional `## Design tokens` section (guidance comment, no catalog change — new repositories only) |
| Guides | Per-segment guide describes the screen-segment path; wire-a-codebase names the token-filling moment |
| Compatibility | Method-only: no engine, schema, message or validation change; pinned template reaches new repositories only |

## 1.13.0 - 2026-08-13

| Area | Documentation impact |
|---|---|
| Engine | `test-report.ts` (junit/TAP subset parsers, symbol join with longest-unique disambiguation), `mapping-hashes.ts` (per-mapping hashes + drift derivation); `verification.ts` budgets, flags and report ingestion; conditional `RESULT-*` case rendering with byte-compat for old records; baseline manifest gains optional `implementation_hashes`; two new warnings in `implementation-evidence.ts`; dashboard Drift and Cases columns; `flow next` drift weight |
| Schemas | `execution-record` gains optional flags/report/cases; `project-config` commands gain `report`; `baseline-manifest` gains `implementation_hashes` — all optional-additive, schema_version unchanged |
| Commands | Command reference: `verify` row documents budgets, flags and report parsing; warning paragraph counts nineteen |
| Configuration | Configuration reference gains *Test-report declarations* and *Execution budgets* sections; implementation-source boundary names drift and symbol warnings |
| Pinned system contracts | `VALIDATION-RULES` warning table grows to nineteen |
| Guides and playbooks | Inspect guide table grows to nineteen; Inspect State playbook bullet covers drift and symbol findings |
| Compatibility | Optional-additive throughout: records without new fields validate and render byte-identically (asserted); baselines without hashes observe nothing; unwired repositories unchanged |

## 1.12.0 - 2026-08-13

| Area | Documentation impact |
|---|---|
| Method | New `resources/flow-playbooks/implementation.md` plus three protocols (`implementation-scouting`, `spec-compliance-review`, `implementation-verification`); Evolution and Reconciliation accepted-input sections route implementation intents and name the catch-up slice |
| Host adapters | Sixth pair: `claude/skills/implement` and `codex/skills/ai-saas-implement` (with `agents/openai.yaml`); package-check and the Codex validator count six per host |
| Engine | `ActiveFlow.intent` (optional, evolution-only, schema + strict validation), `flow start --intent`, `flow next` implement continuation and weighted `suggested_segment` |
| Pinned system contracts | ARCHITECTURE-OVERVIEW template gains the owned `Engineering profile` section (guidance comment, no catalog change — new repositories only) |
| Reference and guides | README/flow-reference/command-reference/codex-installation/system-architecture count six skills and twelve adapters; flow reference gains the Implementation interface row and section; guides index routes two new situations; new `wire-a-codebase` and `implement-per-segment` guides |
| Evals | Sixth case `implementation` with the `segment-honesty` grader: two segment flows over a wired red-then-green fixture, honesty graded from the trace |
| Compatibility | Additive: the intent field is optional and evolution-only; repositories without it are unchanged; no migration |

## 1.11.0 - 2026-08-13

| Area | Documentation impact |
|---|---|
| Engine gate | Per-feature baseline errors over mapping presence removed from `baseline.ts` with an in-place rationale comment; `implementation-evidence.ts` owns the shared predicates and the two standing warnings; `implementation-projections.ts` owns the dashboard and per-feature work packets, wired source-gated into `projections.ts` |
| Commands | Command reference warning paragraph counts seventeen and names the two implementation warnings |
| Configuration | Configuration reference *Implementation-source boundary* gains the mapping-is-evidence contract and both projections |
| Flow method | Evolution playbook section 10 states the implementation-evidence doctrine beside the platform one; Inspect State reports the two warnings with `implementation-coverage.md` as the joined view |
| Pinned system contracts | `VALIDATION-RULES` warning table grows to seventeen; glossary gains *Implementation coverage* and *Work packet* rows |
| Guides | Feature guide: wiring sources owes nothing at once, warnings and the two generated views named; inspect guide table grows to seventeen (including the four 1.10.0 research warnings it had missed) and lists both projections; guides index names them |
| Compatibility | Pure relaxation: previously-blocked baselines (docs-only feature in a wired repository) now pass with warnings; no previously-passing baseline changes outcome; unwired repositories byte-identical (asserted by the neutrality test); no schema or message change otherwise |

## 1.10.0 - 2026-08-12

| Area | Documentation impact |
|---|---|
| Research protocol | *Instrument rungs* section: the rung ladder, mandatory instrument depth (counter pass, map-before-profiling, escalation instead of write-off), rung-3 absolutes, unchanged stopping rules, hook-denied-URL fallback |
| Flow method | Genesis and Reassessment playbooks open research with `ENGINE research probe --json` and state the `- Retrieval: RET-###` citation duty; Reassessment names `research diff` as the freshness check; Inspect State reports the four new warnings with `research-coverage.md` as the joined view |
| Host adapters | All four research-flow adapters (Claude and Codex genesis/reassess) map rung ≥ 1 to `ENGINE research` commands and keep rung 0 as the exact prior behavior |
| Commands | Command reference gains the six-row *Research retrieval* table with gating, exit codes and the lock/HTTP sequencing note; the warning paragraph counts fifteen |
| Configuration | Configuration reference gains the env-var table and the git-ignored policy file; new `docs/research-tools.md` holds instrument setup, records, validation and limitations; README, guides index, both research guides and the Codex parity row link the capability |
| Pinned system contracts | `VALIDATION-RULES` warning table grows to fifteen; the evidence-ledger example gains the optional `- Retrieval:` line (new repositories only) |
| Architecture | System architecture gains the *Retrieval provenance* section, the engine-layer clause and `.ai-saas-sdlc/retrievals/` in the repository tree |
| Compatibility | Additive, no migration; rung 0 byte-identical (asserted by the package-check probe smoke); pinned changes reach new repositories only, method files reach every repository on plugin update |

## 1.9.0 - 2026-08-12

| Area | Documentation impact |
|---|---|
| Pattern defect | Decision pattern ships `status: draft` + `adr_status: proposed`; a test instantiates every scalable pattern and asserts the result validates |
| Lifecycle contract | `ARTIFACT-LIFECYCLE` state set matches the engine (`draft`/`active`/`deprecated`/`retired`/`superseded`, plus `open`/`resolved` for issues); `adr_status` documented as a separate field; no `rejected` or `generated` state |
| Genesis | Evidence ledger named in the activation step the engine's baseline gate requires |
| Method surface | Inspect State reports all eleven warnings; Reconciliation gains sibling ownership, oversized-spec check, platform declarations and the filled-foundation rule; test derivation gains `host_os`, `PLATFORM_EVIDENCE_CONTRADICTED` and platform coverage; both allocating protocols state the permanence of the AREA segment |
| Pinned system contracts | `VALIDATION-RULES` separates errors from warnings and names all eleven; glossary defines the 1.4–1.8 terms and expands artifact prefixes; document rules list `adr_status`/`host_os`/`execution_id`; config template shows the optional `platforms` and `areas` keys |
| Reference and guides | Flow reference gains the checkpoint model; `docs build` stated consistently as the inspector's one write; README engine block completed; feature guide gains the sibling-file ordering and permanent-name rules, persistence authority and `UT-CORE-*`; lifecycle guide states a committed platform is `active` |
| Compatibility | No engine, schema, message or validation change; pinned contracts reach new repositories only, method files reach every repository on plugin update; catalog version 4 |

## 1.8.1 - 2026-08-12

| Area | Documentation impact |
|---|---|
| Flow method | Evolution playbook: a foundation the flow fills (TEST-POLICY) is activated in the same flow; a test seam weakening a stated invariant is recorded in TEST-POLICY, never silent |
| Guides | Feature guide states observed per-stage cost/duration and advises one `--until` stage per turn beyond small features |
| Compatibility | Text-only patch: no engine, schema, message or catalog change |

## 1.8.0 - 2026-08-12

| Area | Documentation impact |
|---|---|
| Read-only projection | `docs build` documented in the command reference, inspect guide and inspect-state playbook/skills as the one permitted Inspect State write; a projection, never authority or evidence |
| Platform method | Platform pattern and evolution playbook state that a committed-but-unproven platform is `active` with its unproven-ness in the evidence layer, never `draft` |
| Flow method | Evolution playbook and command reference document that a checkpoint past the recorded stop raises the target; continuation guidance says to pass `--until` when carrying a flow further |
| Namespace method | Evolution playbook suggests registering `areas` once IDs carry stable area segments |
| Validation wording | `PLATFORM_EVIDENCE_MISSING`/`PLATFORM_EVIDENCE_CONTRADICTED` messages and the inspect-guide table state the standing warning is the durable record |
| Guides | Feature guides print `continue FLOW-*` to match `flow next` output |
| Compatibility | Recorded the byte-frozen RESULT renderer, the message-text-only change on upgrade, and the no-migration doctrine for the pattern text |

## 1.7.0 - 2026-08-12

| Area | Documentation impact |
|---|---|
| Platform evidence | Documented the optional `host_os` frontmatter token on `PLT-*` with its declaration-not-observation doctrine and `PLATFORM_EVIDENCE_CONTRADICTED`; pattern contract comment, configuration reference, evolution playbook and feature guide updated |
| Projections | `generated/platform-coverage.md` documented in the command reference, inspect guide and inspect playbook as the joined targets/commands/executions/hosts view, emitted only when platform targets exist |
| Verification | `verify` documented as resynchronizing generated projections after completed runs |
| Validation | Command reference and inspect guide enumerate all eleven warnings |
| Compatibility | Recorded the byte-frozen RESULT renderer, the optional-everywhere `host_os` shape, the no-migration doctrine for the pattern text, and the one-time coverage drift for repositories that already hold platform targets |

## 1.6.0 - 2026-08-11

| Area | Documentation impact |
|---|---|
| Contract authorities | Interface/DBML/transition families documented as multi-file: sibling discovery, `WIRE-*`/`SCHEMA-*`/`TRANSITIONS-*` identities, `depends_on` ownership, per-file impact convergence and the add-file-first transition recipe |
| Data method | Entity pattern documents the `Persistence authority` line and the store-neutral `Store target` column; DBML documented as one file per database with non-relational and client-local stores declared on the entity; pinned catalog version 3 |
| Architecture method | `Runtime topology` documented as the architecture overview's required section owning runtime units, network boundaries and crossing contracts; subsystem pattern points at the new owner |
| Validation | Command reference and inspect guide enumerate all ten warnings, adding the three authority declarations and `AREA_UNREGISTERED` |
| Configuration | `areas` registry documented as the second optional schema-v1 key beside `platforms` |
| Compatibility | Recorded both skew directions: old engines see sibling files as unscanned and their declarations as broken references; new engines read existing repositories byte-identically |

## 1.5.0 - 2026-08-11

| Area | Documentation impact |
|---|---|
| Verification provenance | Documented `platforms` declarations on verification commands, the observed-host fields on execution records, and both in `RESULT-*` provenance |
| Validation | Documented `PLATFORM_EVIDENCE_MISSING` and `PLATFORM_DECLARATION_UNKNOWN`; command reference now enumerates all six warnings |
| Design method | OS entry points decomposed into UC/FLOW triggers, `PLT-*` capability rows and `SCR-*` surfaces; screens carry a form-factor rule; single-user products state OS-account/device boundaries |
| Guides | Adopted the how-to guide set into the repository and aligned its allocation table with the 24-type catalog |

## 1.4.0 - 2026-08-11

| Area | Documentation impact |
|---|---|
| Artifact contracts | Added `platform_target` (`PLT-*`) as the 24th scalable type and widened `unit_test_backend` to accept `UT-CORE-*` beside `UT-API-*` |
| Design authority | `API-*` documented as covering any invocable operation, with OpenAPI authoritative for HTTP only and the `API-*` document owning non-HTTP invocation contracts in full |
| Verification method | Platform variance documented as a viewpoint inside UT/IT/ST with per-platform execution limits recorded in `TEST-POLICY`; derivation rows added for platform constraints, permissions, update/migration and IPC boundaries |
| Validation | `CONTENT_CONTRACT_UNPINNED` documented as the error for a live artifact whose type the pinned catalog predates |
| Compatibility | Recorded that no pattern migration exists: existing repositories stay on their init-time catalog and the new type reaches new projects only |

## 1.0.0 - 2026-08-09

| Area | Documentation impact |
|---|---|
| Repository model | Defined canonical plugin source patterns, consuming `00-system/patterns/` snapshots and live `01`-`05` instances as separate layers |
| Artifact contracts | Documented 23 scalable types, fixed foundations, `artifact create`, active content validation and engine-only result creation |
| Temporal method | Documented four mutation flows, read-only Inspect State, legal re-entry events and non-gated editorial behavior |
| Dual-host package | Documented Claude marketplace/development loading, Codex local-plugin use and the ten thin adapters over shared resources |
| Enforcement | Defined Claude SessionStart/PreToolUse/Stop safeguards versus cross-host engine authority |
| State and provenance | Documented EVR/BL/CHG/FLOW identities, cancellation, historical graph closure, implementation snapshots and immutable execution-backed results |
| Commands/configuration | Synchronized CLI options, strict schema-v1 configuration, path boundaries and documentation-only verification behavior |
| Scope | Removed stale stage-gate, agent, interview, deployment and semantic self-review implications |
