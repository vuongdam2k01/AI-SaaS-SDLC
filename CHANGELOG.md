# Changelog

## 1.1.1 - 2026-08-10

### Fixed

- An artifact saved with a UTF-8 byte order mark is read normally. Windows
  editors and PowerShell's default UTF-8 writer prepend a BOM the author never
  sees; every command that scanned such a file previously failed the whole
  repository with `Missing YAML frontmatter`. Found while probing the Stop hook
  on Windows.
- The Stop hook reports an unreadable repository as a structural failure instead
  of terminating with a stack trace, so the author sees what to fix rather than
  what looks like a broken plugin.

## 1.1.0 - 2026-08-10

Findings from two full GitHub-distribution acceptance runs. The first run's
report is the source for D-1, D-2 and D-4; the second run's for the rest.

### Fixed

- Claude no longer auto-discovers the Codex host adapter. It moved from the
  repository root to `codex/skills/`, so a Claude host loads exactly the five
  manual skills instead of ten, always-on cost drops from ~839 to ~384 tokens,
  and a session no longer advertises the Codex command form to a Claude user.
- The published editorial mechanism can be reached from the documentation
  repository alone. `init` and every writing `refresh` record the resolved engine
  in `.ai-saas-sdlc/engine.json` as `editorial_command`, `init` adds that file to
  `.gitignore`, and Inspect State prints the resolved command whenever it names
  an editorial edit as the next valid action. Previously a session applying a
  body-only change had no plugin root to resolve and could execute a different
  copy of this package.
- Issues carry their own lifecycle. `open` and `resolved` are accepted for the
  `issue` type and rejected for every other type, matching `ARTIFACT-LIFECYCLE`
  and `issue.pattern.md`. A closed issue no longer has to masquerade as `active`
  to satisfy validation.
- `git_commit` no longer names a tree that was never tested. A commit recorded
  over a modified or untracked working tree is suffixed `+dirty`.
- A superseded accepted ADR is no longer presented as though it still governs.
  `decision-index.md` derives `In force` and `Superseded by` from the successor's
  `supersedes` edge, leaving the immutable original untouched.
- A flow no longer re-runs a verification command that cannot observe anything
  new. An identical command over an identical source snapshot within the same
  flow reuses its existing execution record instead of adding a second one.

### Added

- `generated/rule-coverage.md` and the `RULE_UNVERIFIED` validation warning.
  Every business rule a live feature declares must be claimed by at least one
  UT, IT or ST specification. Which level holds a rule stays a derivation
  judgement; having a level at all is now a checkable contract. Reported as a
  warning so it never blocks a baseline on a placement preference.

### Changed

- Genesis always passes `--project-id`, deriving a stable identifier from the
  product when the user supplies none, instead of letting the engine fall back to
  the containing directory name.
- Product Evolution must state, in its closing report, any boundary named by the
  semantic intent for which it allocated no artifact, and must not leave a
  client obligation such as an idempotency key without either an owning artifact
  or a recorded question.

## 1.0.0 - 2026-08-09

### Added

- Dual-host Claude Code and Codex plugin packaging with five thin, explicitly invoked adapters per host over one shared engine and domain resource set.
- Five temporal interfaces: Genesis, Evidence Reassessment, Product Evolution, Reconciliation and read-only Inspect State.
- Complete shared flow playbooks and focused research, behavior, solution, impact, test-derivation and reconciliation protocols.
- A 23-type scalable artifact catalog plus data-driven completion contracts for fixed discovery, product, design, verification and control foundations.
- `patterns list` and flow-aware `artifact create` for canonical pinned-pattern draft instantiation.
- Deterministic active-content validation for required sections, meaningful table rows, unresolved placeholders, unchanged template content and required local-ID namespaces.
- Reproducible evidence, traceability, implementation, coverage, issue, decision, impact and baseline projections.
- Configured UT/IT/ST execution with non-reusable `EXEC-*`, captured logs, source snapshots and engine-rendered `RESULT-EXEC-*` records.
- Development/package validation for Claude and Codex manifests, all ten skills, installed-root resolution and in-root package references.
- A single declared test and hook timeout budget in `vitest.config.ts`, enforced by the package check so per-case literals cannot reintroduce parallel-run timeouts.

### Changed

- Separated canonical plugin source patterns (`resources/artifact-patterns/`), consuming pinned snapshots (`00-system/patterns/`) and live project instances (`01`-`05`).
- Replaced stage-like or shallow workflow guidance with four event-driven mutation flows; repeated Product Evolution is horizontal scale.
- Expanded Genesis into attributable public-web evidence and complete discovery/product foundations without pre-creating feature/design/test records.
- Restricted Reassessment to evidence/discovery truth, with issues recording product assumptions that may now be invalid.
- Expanded Evolution and Reconciliation through observable behavior, conditional design, historical impact closure, UT/IT/ST derivation and successor baselines.
- Made fixed OpenAPI, DBML, screen-transition and configuration contracts participate in baselines and impact.
- Made SessionStart, PreToolUse and Stop commands portable across Claude Code and Codex, while retaining deterministic engine validation and baselining as the authoritative cross-host boundary.

### Security and integrity

- Added project-scoped mutation locking, canonical path/type enforcement, symlink-aware managed-path confinement and initialization overwrite refusal.
- Pinned consuming pattern snapshots with integrity metadata and rejected direct snapshot mutation.
- Preserved immutable raw input, accepted ADR bodies, retired/superseded artifacts, internal records, generated projections and execution-backed results.
- Bound each result to its exact flow, configured command, working directory, source state, log bytes and output digest.
- Added clean-flow cancellation, post-baseline drift rejection, permanent ID reservation and old/new graph union for removals and supersession.
- Added explicit body-only editorial synchronization without allowing evidence, metadata, relationship or lifecycle changes.

### Removed or excluded

- Procedural approval gates, automatic semantic prose review, custom research agents, simulated evidence, interviews/outreach/presales, mandatory MCP integrations, runtime/deployment operations and additional test levels.
