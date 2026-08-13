# Post-hardening certification — releases 1.17.0 through 1.18.1

Date: 2026-08-14. Trigger: the author asked for the 1.17–1.18 work to be verified and the bugs it turned up to be fixed.

Method, in order: (1) an adversarial read of the 1.18.0 diff executed against the real parsers, (2) a regression test per defect, proven red against the committed 1.18.0 code before any fix, (3) fixes, (4) a real-binary certification on a repository built from an empty directory through `bin/ai-saas-sdlc`, (5) two behavioral probes of agent text, labelled indicative. Fixture bodies were copied from `tests/fixtures/complete-saas/*-content.ts`; **every engine state transition ran through the packaged binary**, never through `src/`.

## Part I — Defects found and fixed

Nine defects, six of them in code shipped in 1.18.0 hours earlier. Each row's "proven by" test was run against the committed 1.18.0 tree first and observed failing.

| # | Defect | Proven by (observed failure before the fix) | Fix |
|---|---|---|---|
| D1 | `IMPLEMENTATION_MAPPING_ROW_IGNORED` fired on ordinary GFM alignment dividers (`/^-+$/` misses `:---`), so any author who ran a markdown formatter got a permanent warning naming a divider of a table that parses perfectly | `proof-depth` "accepts a formatter's alignment divider" — `expected [ { …(3) } ] to deeply equal []` | `DIVIDER_CELL = /^:?-+:?$/` in both consumers |
| D2 | `implementationResumeCommand` claimed to be shared with `flowGuidance` "so the two cannot drift"; `flowGuidance` re-derived inline, and on a baselined flow SessionStart still said *resume the segment* while `flow next` said `flow close` | `implementation-intent` "stops resuming a baselined segment" | Return null once `baseline_created` is set or no stage remains; `flowGuidance` now calls the shared helper |
| D3 | The unparseable-input fallback emitted `/ai-saas-sdlc:implement --until tests continue FLOW-003`, whose first positional argument is a flag — the skill's grammar would read `--until` as the feature ID | same test — `expected '/ai-saas-sdlc:implement --until behav…' to contain '…implement FTR-APPROVAL-…'` | Parser widened (trailing punctuation, missing comma, `segment:`); residual fallback emits a `<FTR-ID> <segment>` shape and the reason says why |
| D4 | Two silent drops still escaped the diagnostic built to catch silent drops: backticked placeholders (parser strips backticks before testing `<`, diagnostic did not) and pipe-less GFM tables (dropped whole, unreported) | `proof-depth` "names the drops it used to swallow" | Strip backticks before the placeholder test; classify a line with ≥3 pipes and no leading pipe |
| D5 | `mappingTableLines` was fence-unaware: a fenced example produced a false `ROW_IGNORED`, and — worse — a fenced example row was **parsed as a live mapping** | `proof-depth` "treats a fenced example as documentation" — `expected [ 'tests/approval.test.ts', …(1) ]`, i.e. the example row had been ingested | Fence tracking in `mappingTableLines`; both consumers inherit it |
| D6 | The init marker guard over- and under-fired: it refused MkDocs (`requirements.txt`) and Docusaurus (`package.json`) documentation repositories with a message asserting they were code projects, while missing Kotlin-DSL Gradle, `.csproj`/`.sln`, `Makefile`, `mix.exs`, `Package.swift`, `setup.py`, `deno.json`; a *directory* named `package.json` also tripped it | `project-integration` "detects the marker families the first list missed" — `promise resolved "undefined" instead of rejecting` | One `readdir`, regular files only, names + extensions, widened list, and a reworded advisory refusal |
| D7 | 1.18.0's Bash narrowing widened an existing hole: the sentinel keyed on `input.cwd`, so a session started in a docs-repo **subdirectory** lost the `.ai-saas-sdlc` shell rule that was global in 1.17.1 | `hooks` "keeps shell protections … in a subdirectory" run against the 1.18.0 bundle — the hook returned nothing at all | The sentinel walks ancestors to the filesystem root; this also closes the nested-monorepo caveat 1.17.0 documented |
| D8 | Mapping-path containment used `startsWith`, so source `app` swallowed sibling `app-tools`: a row pointing outside every configured source was read anyway, suppressing the unresolved-path finding | `implementation-gates` — `expected '…' to contain 'app-tools/probe.test.ts'` | `isWithin`, the codebase's idiom everywhere else |
| D9 | `IMPLEMENTATION_MAPPING_PATH_MISSING` was per-row and said "transposed or stale row", which does not name the actual first-time mistake — the path convention — while a partially implemented level could emit one warning per row | same test (`toHaveLength(1)`) | One finding per specification listing up to five unresolved paths, naming the convention |

Also corrected during certification: the refusal message read `package.json suggest this directory is a code project`. Now `package.json — this directory looks like a code project`, grammatical for one marker or many.

## Part II — Real-binary certification

Two stages, 38 checks, all passed. Repository built from an empty directory; every transition through `node <plugin>/bin/ai-saas-sdlc`.

**Stage A — guards and documentation lifecycle (15/15).** `init` refused `package.json`, `requirements.txt`, `build.gradle.kts` and `Approval.csproj` directories, each naming the marker it found; `--force` overrode it. `state` in a code repository printed the precondition rather than recommending a destructive `init`. Evolution before a baseline was refused (`evolution requires an existing product baseline.`). Genesis produced `BL-000` over 21 artifacts with zero findings; the feature-documentation evolution produced `BL-001` over nine artifacts with **zero `IMPLEMENTATION_*` findings while unwired**.

**Stage B — wiring, budgets, evidence, resume, diagnostics, hooks (23/23).**

- Wiring: `EXEC-001..003` green across junit, TAP and plain commands; baseline `BL-002` legal with exactly one `IMPLEMENTATION_MAPPING_MISSING` standing; `flow next` scored `{feature: FTR-APPROVAL-001, segment: code, reason: "2 of 2 design artifact(s) unmapped; UT, IT, ST unproven"}`.
- Budgets: a command carrying `timeout_ms: 400` under a 600 s machine policy produced `EXEC-005 timed_out=true`, and the CLI printed `Timed out: EXEC-005. Raise command_timeout_ms in .ai-saas-sdlc/verification-tools.json, or set timeout_ms on the command in sdlc.config.yaml.`
- Evidence at scale: a real 63-case junit run (62 passed, 1 failed) produced `EXEC-006` carrying `case_row_cap=50`; the artifact rendered exactly 50 passed rows, the failure row, and a five-cell trailer `| capped at 50 passed rows | — | passed | not shown | 12 more passed cases; the full set is in .ai-saas-sdlc/executions/EXEC-006.json |`. `validate` reported zero errors, so the stored artifact re-rendered to identical bytes on a second machine-independent pass — the property a content-conditional cap would have broken.
- Resume: `flow next` on an open implementation flow printed `/ai-saas-sdlc:implement FTR-APPROVAL-001 code --until behavior continue FLOW-004`, and the SessionStart hook invoked with `source: compact` printed `Active flow: evolution (intent implementation) (FLOW-004, CHG-003); reached none, target behavior. Resume: <the same command>`. After `BL-003`, `flow next` switched to `ENGINE flow close` and the hook offered no resume.
- Diagnostics on a real repository: an alignment-divider table produced no finding while `| TC99 | … |` and a three-column row each produced one, and the unresolved path collapsed into a single finding naming the convention. A well-formed table produced zero mapping findings, and the junit case joined to `UT-API-APPROVAL-001 TC-01`. The `ut` segment shrank the unproven ledger to IT and ST at `BL-004`.
- Hooks: an unrelated repository passed through both a `generated/` write and `git commit -m "note about .ai-saas-sdlc"` while direct fabrication of engine state stayed denied; a session started in `04-verification/` kept the shell protections.
- Sweep: `refresh --check` reported `synchronized: true`, and `docs build` rendered 100 pages with 643 resolved ID references.

## Part III — Behavioral probes (indicative, never evidence)

Two agents were given the `spec-compliance-reviewer` and `implementation-counsel` bodies verbatim with packetless requests in an unrelated context ("review my changes against the spec" in a Python repo; "what database should I use?"). Both returned `Status: NEEDS_CONTEXT` and named the missing fields instead of improvising a review or a recommendation — the behavior the refusal invariants added in this release exist to produce. Model behavior is not product evidence under this repository's doctrine; this is recorded as a probe of the text, not as proof of the agents.

## Part IV — Adjudications

- **A1 — the singular `Case ID` header is unreachable in a valid repository.** 1.18.0 taught the parser to accept it; certification showed the pinned content contract rejects such a table with `CONTENT_TABLE_MISSING` (an error), so a repository carrying it never validates. The tolerance is defensive only and stays: it costs nothing and protects the parser from a header variant it might meet in a hand-edited tree. Recorded so nobody mistakes it for a supported authoring form.
- **A2 — `IMPLEMENTATION_MAPPING_PATH_MISSING` remains gated on `spec.implementation.length > 0`.** Certification confirmed the gate keeps `code` segments silent (UT/IT/ST frontmatter is still empty then) and fires only once a specification has claimed its mappings, which is the honest trigger.
- **A3 — the trailer row renders `passed` in the outcome column.** It is a summary row, not a case; the wording names the cap explicitly and the table stays five columns wide, so no reader can mistake it for a case result.

## Verdict

Nine defects found and fixed, each pinned by a test proven red beforehand; 38 real-binary checks passed across a full documentation-to-implementation lifecycle; the full suite, strict Claude validation and staged-manifest validation green. No defect surfaced in the certification itself that is not fixed in this release.
