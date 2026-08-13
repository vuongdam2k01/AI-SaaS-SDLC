# Implementation Playbook

Implementation is not a fifth flow. It is Product Evolution invoked with a declared **implementation intent**: bring code into conformance with behavior the repository has already specified, one feature at a time, one segment at a time. Flow types remain exactly four; this playbook governs what happens inside the evolution the implement skill opens. Nothing here runs automatically — every segment begins with an explicit invocation naming the feature and the depth.

The host adapter supplies `ENGINE = node "<plugin-root>/bin/ai-saas-sdlc"`.

## 1. Accepted input

Required:

- one active `FTR-*` to implement;
- a segment: `code`, one or more of `ut`, `it`, `st` (comma-joined), or `all`. Absent, the segment is `all`.

Preconditions, checked before opening anything:

- `implementation_sources` is configured and the user permits changes inside it. Unconfigured, stop and route to the wire-a-codebase guide — this flow has nothing legal to write.
- The feature is fully specified: active `UC/FLOW/UT/IT/ST` in its closure. A gap is documentation work — route to `evolve-product`.

Route away, never absorb:

- behavior change discovered mid-segment that the author must decide → record it and route to `evolve-product`;
- a defect or contract contradiction in baselined truth → `reconcile`;
- wording-only edits → `refresh --editorial`.

The segment is a contract between author and model carried by the invocation. The engine does not parse it; the engine tolerates and records partiality, and the closing report is judged against the segment as stated.

## 2. Mandatory reads

Engine-computed context replaces improvised discovery; read it before touching anything:

1. `ENGINE state --json` — active baseline, no incompatible open flow.
2. `generated/implementation-plan/<FTR-ID>.md` — the work packet: closure in dependency order, mappings, owning contract files, referenced ACCESS-CONTROL/SYSTEM-INVARIANTS/ERROR-CATALOG rows, covering specifications with their test-case tables, configured commands.
3. `generated/implementation-coverage.md` — the feature's current mapping state and the latest execution per configured command.
4. The `Engineering profile` section of `ARCHITECTURE-OVERVIEW` — language, framework, package manager, repository layout, test frameworks per level, migration tool. Empty or missing profile on a first implementation: fill it in this flow (it is an owned section of an active foundation, a normal edit) from what the codebase itself evidences.
5. `TEST-POLICY`, and the foundation rows the packet names.
6. The owning contract files (`openapi.yaml`, `.dbml`, `.mmd`) for every operation, entity and screen in the segment.

## 3. Open the flow

```text
ENGINE flow start --type evolution --intent implementation --input "implement <FTR-ID>, segment <segment>" [--until <stage>] --json
```

Use the returned `CHG-*` as `created_by_change` for anything the flow creates. Checkpoints and `--until` keep their evolution semantics; for an implementation intent the `behavior`, `design` and `tests` checkpoints are read-and-confirm passes over documents that already exist, and the real work sits at `implementation`.

**A segment is a small closing flow, never a parked one.** It opens, maps, executes, baselines with honest standing warnings and closes — usually in one turn. Parking a flow open at the `implementation` checkpoint as a way to hold "code done, tests pending" is an anti-pattern: it monopolizes the repository's only flow slot and blocks documentation work; the warning ledger is the correct holder of that state.

## 4. Scout the delta

Follow `resources/protocols/implementation-scouting.md`. Five outputs, stated before any edit: conventions to match (with `file:line`), the blast radius, the doc↔code delta keyed by artifact ID, existing partial implementations, and the seams present. Scouting here answers "what does the codebase already do about this spec", never "what should the product do" — the documents answer that, and doubting them routes to another flow.

### Protocols, loaded by situation

The method is progressive: this playbook is the spine, and each protocol loads exactly when its situation arises — reading all of them up front is noise, skipping the one whose trigger fired is the failure.

| Load | When |
|---|---|
| `implementation-scouting.md` | Every segment, before the first edit |
| `spec-compliance-review.md` + `implementation-review-checklists.md` | Every segment, at review — the checklist file's overlay for the segment's boundary types |
| `implementation-verification.md` | Every segment, at verify and before any completion claim |
| `implementation-debugging.md` | Any failure met while implementing — red run, wrong output, broken build |
| `implementation-delegation.md` | Before the first subagent spawn of the flow; as a self-checklist when the host has none |
| `design-implementation.md` + `content-implementation.md` | Segments touching `SCR-*`/`CMP-*` surfaces |
| `craft-api-and-backend.md` | Segments touching `API-*`, `SUB-*`, `JOB-*`, `EVT-*` |
| `craft-data.md` | Segments touching `ENT-*` or `SCHEMA-*` files |
| `craft-auth-and-payments.md` | Segments touching `ACCESS-CONTROL`-governed surfaces or payment/external-provider `INT-*` |
| `craft-client.md` | Client-side state, data-fetching or form work beyond the screen brief |
| `craft-testing.md` | `ut`/`it`/`st` segments, before deriving test code from the spec tables |

The craft files carry version-agnostic engineering judgment — decision rules, invariants, budgets — never framework facts that age; where a craft rule and a repository document disagree, the document wins and the disagreement routes like any discovery (§9).

## 5. The segment contract

| Segment | Maps | Executes | Expected to leave standing |
|---|---|---|---|
| `code` | Design artifacts of the feature (`SCR/CMP/SUB/API/ENT/INT/JOB/EVT`) to production paths | Full configured suite (regression discipline) | `IMPLEMENTATION_LEVEL_UNPROVEN` for UT/IT/ST |
| `ut` | The feature's `UT-*` specifications to implemented test files | Full configured suite | `IMPLEMENTATION_LEVEL_UNPROVEN` for the levels still unimplemented |
| `it` | The feature's `IT-*` specifications likewise | Full configured suite | likewise |
| `st` | The feature's `ST-*` specifications likewise | Full configured suite | likewise |
| `all` | Everything above | Full configured suite | nothing for this feature |

Every segment runs the same close sequence; segments differ only in what they map and therefore in which warnings remain. Test-code segments derive each test from its specification's test-case table — the spec is the source; a test that asserts something the spec does not state is an EXTRA finding in review, and a spec row the tests skip stays visible as an unimplemented case.

## 6. Implement

When the segment includes an `SCR-*` surface, additionally follow `resources/protocols/design-implementation.md` (the screen brief assembled from owned sources, the countable self-review gate, host-capability visual verification) and `resources/protocols/content-implementation.md` (every string bound to the artifact that owns its meaning; no placeholder text ships).

1. Edit only mapped paths and paths the segment is adding, inside configured roots. Preserve the Engineering profile's conventions; where the profile is silent and the codebase shows a convention, follow the codebase and record the convention in the profile.
2. Update `implementation:` mappings on every artifact the segment implements, and the Implementation-mapping tables inside test specifications (case IDs → test path → test name — the sync-back is part of the work, not an afterthought). Derive nothing by memory: after mapping, re-read `generated/implementation-coverage.md` and confirm the state moved.
3. Consult host capability, never require it: enumerate the host's installed skills against the live catalog when the segment touches a domain one covers (a framework, a database, browser verification); use what exists, continue with this playbook when nothing matches, and name in the closing report what was consulted. Never instruct the author to install anything.
4. Delegation is optional and bounded, and `resources/protocols/implementation-delegation.md` owns its rules: the four mechanisms that justify a spawn, the trigger table, the eight-field packet, roles-as-enforcement (a reviewer never edits), parallel ownership safety and the status protocol. Absent subagent support — Codex included — the same protocol reads as the checklist the main agent holds itself to, and no delegation is ever faked.
5. A test seam that weakens a stated invariant or access rule is recorded in `TEST-POLICY` beside what it exists to test, never left silent in code.

## 7. Spec-compliance review, first and blocking

Follow `resources/protocols/spec-compliance-review.md` before any quality judgement: every acceptance criterion, business rule and spec row in the segment graded PASS / MISSING / EXTRA with `file:line` evidence. Well-written code that does not match the specification is still wrong. MISSING blocks: fix inside this flow and re-review. EXTRA is scope the documents never asked for: remove it, or route the behavior change to `evolve-product`.

## 8. Verify

Follow `resources/protocols/implementation-verification.md`. The iron laws: no fix without root-cause investigation first; no completion claim without fresh engine-recorded evidence.

```text
ENGINE verify --all --execute --json
```

The per-segment definition of done, all five proofs before the close sequence:

1. every acceptance criterion and spec row the segment claims is observably met;
2. the full configured suite is green — including modules sharing files or contracts with the change;
3. every touchpoint and caller in the packet's closure has been explicitly walked, not assumed;
4. no new lint, type or build failure anywhere the declared commands reach;
5. public contracts (`openapi.yaml`, `.dbml`, `.mmd`, exported interfaces) unchanged — or the change happened docs-first in an evolution that owns it.

A configured test that fails is never edited into compliance. If the code is wrong, diagnose under `resources/protocols/implementation-debugging.md` — the six-question root-cause gate and the four phases, no fix before the cause is named — then repair in this flow. If the specification is wrong, that is a contract contradiction: record it and route to `reconcile`. If a regression in an old feature surfaces, STOP and present the author two to four concrete options (fix the dependents here; revert the segment; accept and record) — never silently patch around it. The debugging protocol's three-strike rule stands: after three failed attempts at the same defect, record the `ISS-*`, question the design, and route to `reconcile` or an ADR through `evolve-product`.

## 9. Discovery during implementation

Implementation reads documents against reality and sometimes finds them wanting. Three branches, none improvised:

- **(a) The finding sits inside this feature's closure** — a spec detail implementation proves wrong, an ambiguous row. Repair it in this flow: the closure is this change's legal surface, the edit is part of the segment's diff, and the closing report names it.
- **(b) The finding sits outside the closure** — two other features contradict, an unrelated spec is wrong. Record an `ISS-*` (creatable inside evolution), finish this segment honestly, close, then open `reconcile` on the recorded contradiction. Never widen a segment to absorb someone else's defect.
- **(c) The finding invalidates this segment's own premise** — the feature cannot be implemented as specified. Stop implementing. If docs and code changes so far are worth keeping as a record, drive to an honest baseline with the `ISS-*` that says why. If not, abandon: restore both trees — documentation and implementation source — to their state at flow start, and `ENGINE flow close` records the cancellation. Abandonment is byte-exact restoration, not "mostly reverted"; the engine verifies both snapshots and refuses anything less.

## 10. Deterministic close sequence

```text
ENGINE refresh
ENGINE validate --active --json
ENGINE baseline create --json
ENGINE flow close --json
```

Fix structural failures and failed configured tests. The standing warnings the segment is expected to leave — `IMPLEMENTATION_LEVEL_UNPROVEN` for levels deferred by design, `IMPLEMENTATION_MAPPING_MISSING` for features not yet started — are not failures: name them in the report as the honest remainder. A clean no-change flow closes as a recorded cancellation.

## 11. Output contract

Report:

- the feature, the segment as invoked, and the segment as actually delivered;
- spec-compliance table outcome (PASS/MISSING/EXTRA counts, with what happened to each MISSING and EXTRA);
- files changed in configured sources, mappings added or updated;
- execution and result IDs with verdicts — by ID, never by paraphrase;
- warnings expected and now standing, warnings cleared this segment;
- discoveries recorded (`ISS-*`, `QST-*`) and where they were routed;
- host capabilities consulted, or none;
- successor `BL-*`.

The repository and its records are the authority on all of the above; if a claim in the report cannot be traced to an artifact, a mapping, a record or a validate finding, the claim does not go in the report. End with the state of the flow and the exact next command from `ENGINE flow next --json` — including its `suggested_segment` hint when one exists, so the author sees what the evidence says is owed next. Never end with "let me know how you would like to proceed."

## 12. Stop and re-entry

Stop when the segment as invoked is delivered and its baseline closed, or at the requested `--until` checkpoint. Legal re-entry is a new invocation naming a feature and segment, a failed execution, an inspected drift or a recorded contradiction — never a desire to polish delivered code.

| The thought | The answer |
|---|---|
| "The segment is small, skip the packet and scout" | Small segments are where conventions get missed and callers get broken. |
| "The suite is slow, run only the new tests" | The declared commands are the regression contract; the baseline requires them regardless. |
| "The spec is obviously wrong, I'll just code what's right" | Obviously-wrong is branch (a), (b) or (c) of section 9 — all of them recorded, none of them silent. |
| "Map it later, the code is what matters" | Unmapped work is invisible work: the dashboard, the warnings and the next session all read mappings, not memory. |
| "One more fix attempt" (the fourth) | Three strikes was the limit; the defect is now a design question with a name. |
