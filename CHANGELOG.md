# Changelog

## 1.3.4 - 2026-08-11

Repository tooling, not the plugin. The manifest validator could not find the
Claude CLI and reported that as a failed validation.

### Fixed

- `scripts/validate-plugin-manifests.mjs` assumed `claude.exe` on Windows. A
  global npm install leaves `claude.cmd`; the native installer leaves
  `claude.exe`; a machine has one or the other, so on CI the script exited in
  400ms with no output at all — indistinguishable, in the log, from a plugin
  that failed strict validation.

  The CLI is now resolved from `PATH` by extension, `.cmd` and `.bat` are
  spawned through a shell because Node refuses them otherwise, a candidate must
  be a *file* (a directory named `claude` on `PATH` otherwise resolved as the
  executable), and a missing CLI is reported as a missing CLI rather than as a
  validation failure.

## 1.3.3 - 2026-08-11

The last red test on `windows-latest`, and the only one of the batch that was a
real engine defect rather than test scaffolding.

### Fixed

- **Engine-owned exclusions were dropped whenever the repository path did not
  spell itself the way `realpath` does.** Implementation sources are resolved
  through `realpath` before sampling, while the exclusions — `.ai-saas-sdlc`,
  `generated`, `04-verification/results` — were built from the configured
  spelling. Reach the same directory through a junction, a mapped drive or an
  8.3 short name such as `C:\Users\RUNNER~1\...`, and every exclusion fails its
  containment test and is discarded in silence.

  The snapshot then contains the engine's own state directory, which the engine
  writes to during every flow. The consequence is not subtle: **no flow can ever
  be recognised as having changed nothing**, so an accidental or abandoned flow
  can never be cancelled, and `flow close` refuses with a list of changes the
  author did not make. Exclusions are now resolved the same way sources are, and
  a test drives a real junction to prove it.

- Sampling refreshes the git index first, so two samples of an unchanged
  worktree cannot disagree through a stale stat cache. Added while pursuing the
  wrong explanation for the failure above and kept on its own merits: a snapshot
  that answers "did the implementation change" must not answer it differently
  twice over the same bytes.

## 1.3.2 - 2026-08-11

Continuous integration had failed on **every commit since the first release**,
on all four matrix entries, while local checks passed. Nobody had looked. Two
independent causes, neither of them in the shipped engine, and both invisible to
a Windows developer running the suite locally.

### Fixed

- **Line endings.** No `.gitattributes` meant a clone with `core.autocrlf=true`
  received every Markdown file as CRLF. The test fixtures located the
  frontmatter boundary in a normalized copy and then sliced the *original*
  string — an index short by one byte for every line above the boundary — which
  produced fixture artifacts whose frontmatter was never closed and failed 23
  tests on `windows-latest`. Fixtures normalize before indexing, and
  `* text=auto eol=lf` stops the input from varying by platform at all.

  The engine itself was never affected: all 23 patterns instantiate identically
  from CRLF and LF input, verified pattern by pattern. `render` now normalizes
  once at the top regardless, and a test pins the invariant that a CRLF checkout
  still yields an LF artifact with intact frontmatter.

- **Executable bit.** `bin/ai-saas-sdlc` was committed `100644`; the build
  chmods it to `755`, so on Linux the "committed bundles are current" step saw a
  mode-only difference and failed. Recorded as `100755`, which it always should
  have been.

## 1.3.1 - 2026-08-11

Found by 1.3.0 doing its job. The first real flow run under the new warning did
exactly what it was meant to — it gave the new boundary its own specifications
instead of appending to a file the engine had already called oversized — and in
doing so exposed a reference class nothing had ever checked.

### Added

- **`CASE_REFERENCE_BROKEN`.** A qualified case reference such as
  `IT-X#TC-40` is now checked against the cases its specification actually
  declares. `validate` had always refused a reference to a missing *artifact*;
  a reference to a case inside one was written in prose and verified by nobody.

  The gap only became reachable once specifications started splitting: an author
  who cites `IT-X#TC-40` while planning to append to `IT-X`, then correctly puts
  the cases in a new specification, leaves a reference to a case that never came
  to exist. In the run that found this, the artifact holding the broken
  references was an accepted ADR — immutable after baselining, so the reference
  can never be repaired in place.

  A warning, deliberately. Failing on it would leave such a repository unable to
  baseline anything ever again over a stale cross-reference.

### Changed

- Test derivation forbids writing a qualified case reference before the case
  exists, and Product Evolution says the same where accepted ADRs are written —
  cite the specification, the acceptance criterion or the rule until the cases
  are real.
- Test derivation states that a specification whose cases are bound to executed
  `RESULT-*` records is not renumbered. Split forward, and record the deferral in
  `TEST-POLICY`.

## 1.3.0 - 2026-08-11

Measurement for the debts a growing repository accumulates silently. A
longitudinal run added five features to a finished product and found no
structural degradation — 86 business rules, none unverified, no validation
findings — but it also found three things nothing in the system could see:
integration and system specifications that absorbed every new case instead of
splitting, open questions that grew from 16 to 27 with none ever closed, and two
declared lifecycle statuses no run had ever produced. None of them fails a
baseline. All of them are invisible until a human reads the whole repository.

### Added

- **`SPEC_OVERSIZED`.** `validate` reports every live `IT-*` or `ST-*` holding
  more than twelve completed test cases, naming the axis to split on:
  integration boundary for `IT-*`, user journey for `ST-*`. A warning, never an
  error — where a case belongs is a derivation judgement, and a baseline must not
  fail on document size.

- **`QUESTION_STALE`.** Baseline creation stamps each open `QST-*` with the
  baseline it was first seen open at, and `validate` reports the ones that have
  outlived three baselines with what they still block. `state --json` gains
  `open_questions` with each question's age. Age lives in engine state rather
  than in the ledger table so that no repository written before this release
  needs migrating.

### Changed

- **Level ownership is now derivable, not free.** `test-derivation.md` states the
  rule: the owning level is the lowest whose boundary can observe the violation,
  a second claimant needs a named reason, and an existing claim does not move
  without a changed contract, a changed boundary or a failed execution. Three
  acceptance runs had placed the same rules at three different levels; coverage
  stayed complete each time, which is exactly why nothing noticed.

- **Deprecation granularity is stated.** Change an artifact's *status* only when
  the whole artifact stops being the authority; when part of it survives,
  deprecate the business rule inside it with a named replacement and a removal
  condition. Recorded in Product Evolution and the artifact reference.

- **Evidence Reassessment must settle the stale questions in its scope**:
  resolved by evidence, closed by a decision that makes them moot, or left open
  with what would close them. Silence is no longer a legal outcome, and closure
  by decision is now written down as legitimate.

- Inspect State reports question ages and oversized specifications; Product
  Evolution checks specification size before adding cases at the `tests`
  checkpoint.

### Fixed

- `deprecated` and `retired` were declared statuses that no run had ever
  produced. The full path `active → deprecated → retired` is now driven by a
  test, together with the four guards standing along it: dependency lifecycle,
  post-baseline immutability, deletion in place of retirement, and the refusal to
  baseline while live artifacts still depend on a retired one.

## 1.2.0 - 2026-08-10

Author control over how much of a flow runs in one turn. Two acceptance runs
measured single Evolution commands at 33 and 49 minutes, each rewriting dozens of
artifacts with no visible progress and no point at which the author could read
the behaviour before tests were derived from it. A flow that cannot be steered is
a flow that can only be waited on.

### Added

- **Flow checkpoints.** `behavior`, `design`, `tests`, `implementation`,
  `baseline`. `flow start --until <stage>` declares where a turn stops;
  `flow checkpoint --stage <stage>` records how far it came. A flow that reaches
  its target stops there and stays open. Continuing it is invoking the same skill
  again — the machinery that already resumed an interrupted Genesis across
  sessions, now exposed as a control instead of a recovery path.

  Checkpoints are not lifecycle stages. They add no gate, no review round and no
  approval step, and the four mutation flows are unchanged.

- **`flow next`.** Reports the open flow's progress and the exact command to run
  next, so the author never derives it from the artifact tree. Inspect State and
  every flow's closing report now quote it verbatim.

### Changed

- Product Evolution announces each checkpoint as it is reached instead of working
  silently, and every closing report ends with the flow's state and the literal
  next command.
- `evolve-product` accepts `--until <stage>` or the same intent in plain words
  ("stop after the design", "only the tests this time").

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
