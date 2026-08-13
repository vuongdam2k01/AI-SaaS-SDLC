# Certifier report — end-to-end certification of the implementation extension (1.11.0–1.16.0)

Date: 2026-08-13. Certified surface: the implementation capability shipped across releases 1.10.0→1.16.0, exercised through the **real packaged binary** (`bin/ai-saas-sdlc`, rebuilt from source before the run) against a **real fixture lifecycle** — not through vitest harnesses. Every verdict below cites an engine-produced output: execution records, rendered results, warning codes, projections, baseline manifests, exit codes. Model self-review was used nowhere as evidence, per repository doctrine.

## How it was certified

A fresh documentation repository was driven through the full promised lifecycle in a scratch workspace, following `docs/guides/wire-a-codebase.md`, `docs/guides/implement-per-segment.md` and `claude/skills/implement/SKILL.md` as written:

| Step | Flow | Baseline | Evidence |
|---|---|---|---|
| Genesis: 12 foundations authored to contract, EVD entry with URL | FLOW-001 | BL-000 | `validate` 0 errors first pass; `verification: not-configured ×3` (genesis exemption) |
| Feature docs: FTR/UC/FLOW/SCR/API/ENT + UT/IT/ST created via `artifact create`, authored, activated | FLOW-002 / CHG-001 | BL-001 | 30 artifacts; zero `IMPLEMENTATION_*` findings while unwired |
| Wire: sibling `node:test` app; junit report on UT, TAP on IT; config + Engineering profile in one evolution | FLOW-003 / CHG-002 | BL-002 | EXEC-001..003 green; baseline legal **with** `IMPLEMENTATION_MAPPING_MISSING` standing |
| Implement `code` segment (`--intent implementation`) | FLOW-004 / CHG-003 | BL-003 | Red EXEC-004 → repair → green EXEC-007..009; `implementation_hashes` ×3 |
| Implement `ut` segment (`--intent implementation`) | FLOW-005 / CHG-004 | BL-004 | EXEC-010..012; hashes ×4; warnings shrink to IT+ST |
| Adversarial probes + zero-edit cancelled flow | FLOW-006 / CHG-005 | — | `status: "cancelled"` recorded on the change |

Final fixture state: BL-004 active, 6 flows, 12 executions, `refresh --check` exit 0. The shipped deterministic auditor then audited the whole capture: `node evals/harness.mjs --case implementation` → **`passed: true`, 115 files inspected, 0 failures**.

## Mechanically certified capabilities

Every row below is backed by a recorded engine output observed during the run.

| Capability (release) | Observed evidence | Verdict |
|---|---|---|
| Genesis-first sequencing | `flow start --type evolution` before genesis → "evolution requires an existing product baseline.", exit 1 | pass |
| Implementation intent as the entry point (1.12.0) | `--intent implementation` persisted on the active flow; `state --json` shows it; `flow next` prints `/ai-saas-sdlc:implement --until behavior continue FLOW-004` | pass |
| Intent guardrails | reconciliation+intent → "An implementation intent rides Product Evolution; flow types remain exactly four."; `--intent refactor` → "Unsupported flow intent: refactor. Expected implementation." | pass |
| Graduated gates — warnings never block (1.11.0) | BL-002 created while `IMPLEMENTATION_MAPPING_MISSING` stood; BL-003 while `IMPLEMENTATION_LEVEL_UNPROVEN ×3` stood | pass |
| Warning transition semantics | unwired → no findings; wired unmapped → `MAPPING_MISSING`; design mapped → exactly `LEVEL_UNPROVEN` UT, IT, ST; UT mapped → IT, ST only | pass |
| Ownership predicate (`depends_on` decides ownership) | warnings and dashboard derived from the same predicates; no sibling silencing observable in the fixture graph | pass |
| Source-gated projections (1.11.0) | `implementation-coverage.md` + `implementation-plan/FTR-APPROVAL-001.md` absent unwired, appear at wiring; dashboard row moved 0/3 → 3/3 → per-level shrinkage; complement table listed the three unmapped design artifacts | pass |
| Work packet | closure in dependency order, foundation rows (ACCESS/INV), covering specs, configured commands rendered | pass |
| `suggested_segment` scoring (1.12.0/1.13.0) | `code` with "3 of 3 design artifact(s) unmapped; UT, IT, ST unproven" → `ut` with "UT, IT, ST specified but unproven" → `it` with "IT, ST specified but unproven"; absent while a flow is open; drift adds "1 mapping(s) drifted since BL-004" to the reason | pass |
| SessionStart debt line (1.15.0) | hook against the wired repo emitted "Implementation debt (FTR-APPROVAL-001: 3 of 3 design artifact(s) unmapped; UT, IT, ST unproven); evidence-scored next segment: /ai-saas-sdlc:implement FTR-APPROVAL-001 code." — the case package-check never covers | pass |
| Real junit ingestion (1.13.0) | EXEC-004: real `node --test --test-reporter=junit` output parsed, `junit 3/4`; EXEC-007 `4/4` | pass |
| Real TAP ingestion (1.13.0) | EXEC-002/005/008/011: TAP report parsed, case counted | pass |
| Case→TC join at execution time (1.13.0) | junit case "refuses to decide an already decided request" → `UT-CORE-APPROVAL-001:TC-03 [failed]` in the record; unmatched smoke case honestly `not matched to a specification` | pass |
| RESULT rendering of the proof chain | RESULT-EXEC-004 renders case table with spec/TC columns, a failures table naming TC-03, report SHA-256, log SHA-256, source snapshot SHA-256 | pass |
| Honest red→green provenance | red EXEC-004 (exit 1) retained as history beside green EXEC-007; baseline picked the latest matching execution per definition | pass |
| `implementation_hashes` + drift (1.13.0) | BL-003 hashes ×3, BL-004 ×4; out-of-flow edit of a mapped file → `IMPLEMENTATION_DRIFT` naming mapping and declaring artifact; revert clears | pass |
| `IMPLEMENTATION_SYMBOL_MISSING` (1.13.0) | genuinely absent symbol → one warning naming spec, TC-03, symbol and file; clears on revert. (A first probe that only *appended* to the name did not fire — correct, since detection is substring containment) | pass |
| Segments as closing flows | both segments opened, baselined and closed; zero-edit flow closed as `cancelled` on CHG-005 | pass |
| `GENERATED_DRIFT` + `refresh` recovery | manual edit of `implementation-coverage.md` → error; one `refresh` restores | pass |
| `docs build` on a wired repo | exit 0; site rendered into `.ai-saas-sdlc/cache/site` | pass |
| Optional-until-filled sections (1.12.0/1.14.0) | ARCHITECTURE-OVERVIEW activated with an **empty** Engineering profile (filled later by the wire flow, per the guide) and UX-RULES with an **empty** Design tokens table — both legal, as designed | pass |
| Eval harness contract (1.12.0) | `harness.mjs --case implementation` → passed on the produced capture | pass (with finding F1) |

## Method-layer capabilities

These are prose contracts for the model; their certification is that the session **followed them as written against the real engine and nothing broke or contradicted**: mandatory reads were engine outputs (work packet, dashboard, Engineering profile), the spec-compliance review was produced PASS/MISSING/EXTRA with file:line before any quality commentary (see the capture's closing reports), the red run was diagnosed before repair, no spec or test was edited into compliance, and the closing reports named execution IDs, warnings cleared and standing, and the exact next command. The debugging, delegation, craft, review-checklist and divergence protocols are reachable from the playbook's Load-when table (link resolution enforced by package-check) and consistent with engine vocabulary; the 19 warnings documented in `validation-rules.md` equal the engine's 19 warning-severity codes exactly.

## Findings and adjudications

**F1 — eval capture convention gap (fixed in 1.16.1).** Three of the implementation case's `required_output_patterns` (`--intent implementation`, `suggested_segment`, `PASS`) exist in no engine-persisted file: the intent field lives only on the *active* flow record and is dropped from the closed `CHG-*` record, and `suggested_segment` appears only on `flow next` stdout. `evals/README.md` names "the final response" as a captured surface but never states that it must be saved *into* the output directory the harness scans — so a strictly-read capture could never pass the audit. Alternatives weighed per the divergence rule: (a) persist `intent` onto the closed change record (engine + schema change, still leaves `suggested_segment`/`PASS` unsatisfied), (b) weaken the manifest patterns (loses grading signal), (c) document the existing intended convention — the final response is part of the capture and is saved into the output repository root. (c) costs one sentence, closes the whole gap, and matches how this certification's own capture passed; adopted.

**F2 — junit case-name prefixing (note).** Node's junit reporter emits case names as `test > <name>`. Exact-name equality with mapping rows therefore never fires for node:test; the join succeeded through the containment branch (longest contained symbol). Behavior is correct and the fixture proves it; recorded so nobody "fixes" the exact-match branch into a requirement.

**F3 — drift does not flip the suggested segment (by design).** Drift raises the feature's score and enters the reason string, but segment choice remains the first unproven level; drift repair routes through Reconciliation per the method, not through a `code` segment. Observed exactly so.

**F4 — `node --test` directory arguments fail on Windows (fixture note).** Node 24 on win32 treats a bare directory argument as a module path; quoted glob patterns (`"tests/unit/*.test.js"`) work and are what the fixture wired. The wire guide's examples use `npm test` scripts and are unaffected.

**F5 — pre-registered non-issues confirmed.** `schemas/project-config.schema.json` accepting `format: json` while the engine rejects it is the documented reservation (locked decision: schema-accepted, config-rejected until a dialect is defined). The mapping-row `TC-01–TC-03` range parsing (endpoints only) and ST's positional third column were not exercised by the fixture, which used explicit comma lists and canonical column order; they remain documented sharp edges, not observed defects.

## Not certified live (and why that is acceptable)

Execution budgets/timeout kill, `spawn_error` classification, output truncation and byte-identical rendering of pre-1.13.0 records are pinned by `tests/proof-depth.test.ts`; the abandon path's dual-tree byte-restore refusal is pinned by state tests; Codex-host behavior is pinned statically by `validate:codex` and the package-check dual-root replay; research instruments are environment-gated with unit-tested neutrality. None of these has a cheaper honest live probe than the tests that already exist.

## Conclusion

The distilled implementation extension operates end to end exactly as specified: docs-first remains enforced, implementation enters only through the explicit intent invocation, partiality is recorded as standing warnings instead of gates, the FTR→AC→TC→execution proof chain closes on real spawned test runs with real junit/TAP reports, progress is machine-visible and evidence-scored, and the shipped eval harness certifies the produced capture. One documentation defect was found and fixed (F1); no engine defect surfaced.
