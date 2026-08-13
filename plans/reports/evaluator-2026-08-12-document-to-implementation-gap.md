# Evaluator Report: The Document-to-Implementation Gap

- Date: 2026-08-12
- Role: evaluator
- Question: the plugin today ends at an evidence-grounded documentation repository. How well does it carry a product from those documents to a finished, working implementation, and what is actually missing?
- Basis: working tree at `46c015f` (1.9.0) plus the uncommitted research-tool integration. The tree was being actively modified during exploration; all line references are from the tree as read on 2026-08-12.

## 1. Verdict

The common description "the output is documents" is close but imprecise. The system already ships a real implementation attachment surface: configured implementation sources, flow-gated code-edit rights, `verify --execute` with immutable execution provenance, mapping validation with on-disk existence checks, and baseline gates that block on failed or missing verification. What it does not ship is a route onto that surface or proof depth across it.

`README.md:3` promises an "implementation-ready … documentation repository", and the phrase is exact: **ready for implementation, not a route through it**. The route is missing at both ends:

- **The first mile.** Nothing carries a repository from `BL-000` to a codebase the engine can map and execute against. Repository creation is prohibited (correctly), but no owned artifact records the engineering substrate (stack, layout, dependencies, test frameworks), and no guide documents the manual bootstrap seam.
- **The last link.** The proof chain `FTR → AC → UT spec → TC → executed command → result` is severed at the final link by construction: results are exit-code-level, selection is never bound to execution, drift between mapped code and specs is not computed, and "specified but not built" is invisible in every projection.

The deliberate exclusions (deployment, runtime, CI, Git automation, repository creation) are coherent and should stay. Every gap worth closing is an **information-depth gap** — exactly the direction `CLAUDE.md` sanctions ("increase information depth without adding gates").

## 2. What exists today — the bridge as built

| Capability | Mechanism | Evidence |
|---|---|---|
| Code roots outside the docs repo | `implementation_sources[] = {id, path}`, relative or absolute | `src/core/config.ts:45-46`, `docs/configuration-reference.md:46` |
| Code-edit rights | Gated by **flow type** (Evolution/Reconciliation), enforced by PreToolUse hook | `src/hooks/pre-tool-use.ts:97-111` |
| Real execution | `spawn(command, {shell: true})`, only declared commands, only inside doc root or sources | `src/core/verification.ts:47,66-69` |
| Execution provenance | `EXEC-*` reserved before run; record carries command text, cwd, timestamps, exit code, output hash, git commit, pre-run source snapshot, host; failures immutable; identical-snapshot reuse guard | `src/core/verification.ts:79-121` |
| Result integrity | `RESULT-*` rendered as a pure function of the record; validation re-hashes log and re-renders to detect tampering | `src/core/result-artifact.ts:19-103`, `src/core/execution-provenance.ts:21,33` |
| Mapping validation | `implementation: ["<source-id>:<relative-path>"]`; six error codes including on-disk existence (`IMPLEMENTATION_TARGET_MISSING`) and symlink escape | `src/core/validation.ts:104-117` |
| Baseline gates | Failed verification blocks; `not-run` blocks in Evolution/Reconciliation; sources configured ⇒ each of UT/IT/ST needs ≥1 command; each active feature's closure needs ≥1 mapped artifact | `src/core/baseline.ts:76-115` |
| Flow-scoped drift refusal | Whole-source-tree snapshot at flow start and baseline; dirty close refused | `src/core/implementation-snapshot.ts:92-108`, `src/core/state.ts:149-155` |
| Code-vs-docs authority | Reconciliation authority matrix decided before repair | `resources/protocols/reconciliation.md:32-44` |

This is a sound foundation. The gaps below are absences on top of it, not defects inside it.

## 3. Gap analysis

### G1 — First mile: no path from `BL-000` to a wired codebase (severity: blocks the purpose)

The `implementation` checkpoint presupposes a working codebase, harness and green-able commands. No flow, guide or foundation produces them:

- Repo creation prohibited twice: "never creates or operates a repository" (`docs/guides/implement-a-feature.md:121`), "never create/manage repositories" (`resources/protocols/solution-formation.md:93`).
- `sdlc.config.yaml` initializes with `implementation_sources: []` and empty command lists (`resources/project-template/sdlc.config.yaml:4-8`).
- The implement-a-feature guide says "If nothing is configured, skip to Step 5" (`:113`) — the pure-docs path is documented; the wiring path is not.
- The end-to-end timeline (`docs/end-to-end-timeline.md`) has no moment where a code repo is created, a stack is chosen or a first commit happens.

Consequence: the first genuinely useful `--until implementation` turn sits behind undocumented manual work the method never names. Users hit this wall exactly where the product's promise ("implementation-ready") raises expectations.

### G2 — Engineering truth has no owner (severity: high)

The catalog specifies behavior and contracts unusually deeply (wire schema, error codes with state guarantees, idempotency, concurrency winners, tenancy, retention) and the engineering substrate not at all:

- No foundation or pattern has a field for language, runtime, framework, ORM, package manager, dependency floors, repo layout or test frameworks. Verified across all 24 patterns and 17 foundations.
- `ADR-*` could record a stack choice, but the threshold ("multiple-viable, durable, cross-artifact, expensive to reverse", `resources/protocols/solution-formation.md:78-82`) discourages it, and no playbook prompts for it.
- The only convention rule — "preserve existing conventions" (`solution-formation.md:92`) — is vacuous on an empty repository.
- `ARCHITECTURE-OVERVIEW` owns runtime topology descriptively and explicitly excludes build/signing/deployment (`resources/artifact-patterns/design/architecture-overview.md:50`).

Consequence: a fresh coding agent given a completed repo must invent the substrate, and its choices become durable facts of the product **without ever becoming documentation truth** — the exact failure the system exists to prevent, one layer down.

### G3 — Spec-to-code translation is unguided and unverified (severity: medium, agent-mitigable)

- No test framework is named anywhere in `resources/` or `docs/`; there is no example of a `TC-*` row rendered as a real test. The Implementation mapping table (`unit-test-backend.pattern.md:58-62`) is a post-hoc ledger, not guidance.
- Contract files are hashed, never compiled: `openapi.yaml` is validated for version and hash-tracked only; `.dbml` and `.mmd` are parsed by nothing (`src/core/validation.ts`, `src/core/artifacts.ts:60-72`). Hand transcription into code has no conformance check.
- `FTR-*`/`UC-*`/`FLOW-*` carry no `implementation:` key at all — by design ("consumers own them", `feature.pattern.md:68`); only design and test artifacts map to code.

Mitigation reality: a capable coding agent can translate specs without hand-holding **if** the substrate is known — which routes the real fix back to G2. The unverified-transcription half remains and is only recoverable through executed tests.

### G4 — The proof chain is severed at the last link (severity: high, philosophically load-bearing)

The system's core doctrine is that self-review is never evidence and execution results are the only proof. Its own proof chain stops one link short:

- **Case granularity is structurally unreachable.** `RESULT-*` renders Total/Passed/Failed/Skipped and the entire Case results table as `not reported by configured command` (`src/core/result-artifact.ts:3,74-77,84-86`); outcome derives from exit code alone (`:101`). No JUnit/TAP/JSON parsing exists anywhere in `src/`.
- **Selection is never bound to execution.** `tests select` names spec IDs from the document graph (`src/core/test-selection.ts:15-33`) and never sees a command; `verify` runs opaque strings. Nothing checks the executed commands exercise the selected specs. The only join is level-granular at baseline (`src/core/baseline.ts:113-115`).
- **A spawn error is indistinguishable from a test failure** — both coerce to `exitCode: 1` (`src/core/verification.ts:51`).
- **No timeout, no output cap** on spawned commands; a hung command hangs the flow.
- **Toolchain is a permanently empty field** (`result-artifact.ts:67`).

Consequence: the engine can prove "a declared command exited 0 over snapshot X" but never "TC-12, which covers AC-3 of FTR-003, passed". Business-rule verification coverage rests on the model's honesty in referencing, precisely where the project elsewhere refuses to rest on model honesty.

### G5 — Drift is handled, never detected (severity: high over time)

- Within a flow: whole-tree snapshot comparison refuses a dirty close (`src/core/state.ts:149-155`). Real, but tree-granular.
- Between flows: nothing. No per-mapping content hash exists, so the engine cannot say "the file mapped to `API-003` changed while the artifact did not" — the single most valuable doc/code signal. `refresh --check` is docs-vs-docs only (`docs/command-reference.md:24`).
- Code changes never enter impact: `calculateImpact` reads only artifact hashes and relationships. A pure code change yields an empty impact set.
- Reconciliation is reaction to *noticed* drift ("inspected code or Git diff", `resources/flow-playbooks/reconciliation.md:9-16`); nothing in the method surfaces it.
- Structural exposure: the model assumes all code changes flow through Evolution/Reconciliation sessions in the docs repo. A human editing the app repo directly in an IDE bypasses hooks, flows and snapshots entirely. Silent divergence is then discoverable only by a failing configured test.

### G6 — Implementation status is invisible (severity: medium, cheap to close)

- `generated/implementation-map.md` is two columns (Artifact | Implementation paths) filtered to mapped nodes only (`src/core/projections.ts:186-189`); the complement — active artifacts with zero mappings — is never projected anywhere.
- No warning code covers a missing mapping; the eleven standing warnings cover evidence, specs, platforms and areas, never implementation.
- `not-configured` is a project-wide state, not per-feature.
- No projection joins artifact → mapped path → covering specs → latest execution/result. The four columns live in four files; only the platform dimension ever got the join (`generated/platform-coverage.md`, `src/core/projections.ts:41-81`).

Consequence: a repo at `BL-012` with twelve active features and zero code is structurally identical, in every report and the docs site, to one fully shipped — apart from reading raw `RESULT-*` records.

### G7 — The implementation path is the only unverified major surface (severity: medium)

The eval suite (`evals/`) covers genesis, evolution, reconciliation, anti-procedure and research tools, but no scenario configures a real implementation source with real runnable tests; the evolution eval explicitly accepts the honest `not-configured` state (`evals/evolution/prompt.md`). The doc-to-code seam — configure → map → execute → fail → reconcile → pass → baseline — has never been exercised end-to-end by the project's own verification.

## 4. Deliberate exclusions — keep them

Deployment/runtime operations, CI generation, repository creation and Git automation are excluded in three consistent places (`README.md:5`, `docs/development-roadmap.md:32`, `docs/configuration-reference.md:48`). This boundary is correct: the engine's authority model (deterministic structure and provenance, no operational side effects) would not survive owning deploys, and agent capability outside the plugin covers scaffolding and ops adequately.

Two boundary notes:

1. The name "SDLC" oversells the right edge slightly; the honest scope is "specification through verified implementation". No rename needed — but the bootstrap guide (B2 below) should state the boundary where users actually hit it.
2. Exclusion of *automation* need not mean exclusion of *documentation*. A documented manual seam is not a runtime operation.

## 5. Recommendations

All are compatible, event-driven extensions in the sanctioned direction: more information depth, more provenance, zero new gates. Ordered within clusters by leverage.

### Cluster A — complete the proof chain (engine-only; mirrors existing idioms)

- **A1. Optional test-report ingestion.** Allow a verification command to declare `report: {path, format: junit|tap|json}` next to `platforms:` (same opt-in idiom, `src/core/config.ts:33-39`). After execution, parse the report, join case names to `TC-*` via the spec's Implementation mapping symbols, and fill the `RESULT-*` case table; absent a declaration, today's `not reported` stands. This repairs G4's core at zero gate cost and finally makes `BR_UNVERIFIED`-style claims machine-checkable at case level.
- **A2. Per-mapping drift signal.** At baseline, store a content hash per mapped path (the snapshot walker already visits every file, `src/core/implementation-snapshot.ts:38-55`). `validate`/`refresh --check` then emits a standing warning `IMPLEMENTATION_DRIFT` when a mapped file's hash differs from baseline while its artifact is unchanged. Warning severity, following the `PLATFORM_EVIDENCE_CONTRADICTED` precedent — the record of divergence, not a gate. This gives Reconciliation the detection trigger G5 lacks and catches the IDE-bypass case at the next `validate` on any machine.
- **A3. Implementation coverage projection.** `generated/implementation-coverage.md` joining active design/test artifacts → mapped paths (existence, drift state) → covering specs → latest `EXEC-*`/`RESULT-*` per level, plus the complement list of active mappable artifacts with no mapping when sources are configured. Direct analogue of `platform-coverage.md`, emitted only when sources exist so existing repositories see no drift. Closes G6.
- **A4. Execution hardening.** Timeout and output cap on spawn; a distinct `spawn_error` marker in the execution record so a missing binary stops reading as a failed suite; optionally probe and record the toolchain version of each cwd. Small, contained in `src/core/verification.ts`.

### Cluster B — own the first mile (method/patterns; no automation)

- **B1. Give engineering truth a home.** Either a new foundation (e.g. `IMPLEMENTATION-PROFILE` in `03-design/`) or owned sections in `ARCHITECTURE-OVERVIEW`: language/runtime, framework, package manager, repository layout map, test framework per level, migration tool, build entry points. Ships `draft`; the first Evolution that configures sources fills and activates it — the `TEST-POLICY` precedent, including its hard-won activate-in-the-filling-flow rule (`product-evolution.md:166`). This is where G2's substrate decisions become durable truth and where a coding agent reads before writing code.
- **B2. Document the bootstrap seam.** A guide ("wire a codebase") stating the manual path: scaffold the app repo yourself (or let your agent do it outside the engine's confinement), declare `implementation_sources` and verbatim commands, fill B1's profile, then run the first `--until implementation` Evolution. Additionally: when sources are empty and active design artifacts exist, `flow next`/Inspect State may append a one-line hint that implementation wiring is available — information, not a gate. Closes G1 where users actually feel it.

### Cluster C — verify the seam itself

- **C1. An implementation-path eval.** A scenario repo with a tiny real app and real tests: configure → map → `verify --execute` (red) → Reconciliation → verify (green) → baseline. Graders check honest failure recording, provenance integrity and that no pass was fabricated. Closes G7 and protects Cluster A changes.

### Considered and not recommended

**Engine codegen from contract files** (`openapi.yaml` → stubs, `.dbml` → migrations). It would drag toolchain choice into the deterministic engine, blur the model/engine authority split, and duplicate what coding agents already do well. Contract conformance is better proven by A1's case-level results plus A2's drift signal than by generated code nobody baselines.

## 6. Strategic note

The uncommitted work in this tree is building, for research, exactly the machinery the implementation side lacks: immutable `RET-*`/`QRY-*` records, capability rungs with honest degradation, standing evidence warnings, failure-writes-records-too, validation from committed records only. That is the blueprint. Applied rightward, the same doctrine yields A1–A3 almost mechanically: execution records gain case granularity (records), mappings gain hashes (provenance), coverage gains a join (projection), absence gains a standing warning (honest state). Sequencing Cluster A after the research integration lands would let the two halves of the pipeline meet at the same standard of proof.

---

# Part II — Execution semantics: implementing against a coupled document graph

*Added the same day, after review feedback narrowed the question. Part I covered the two ends of the bridge (bootstrap, evidence granularity). This part covers the middle: how implementation actually proceeds over a tightly interlinked artifact graph — ordering, partial states, coverage sufficiency, mid-flight discovery, accumulation and parallelism. Every claim below was verified directly in the engine source.*

## II.1 The model the engine imposes

Implementation is not a process in this system; it is **one advisory checkpoint inside one serialized documentation transaction**:

- Exactly one flow may be active (`src/core/state.ts:68`); all governed code work rides Evolution or Reconciliation (PreToolUse blocks implementation-source edits outside them).
- Checkpoints are explicitly non-gating labels (`src/core/types.ts:3-7`); nothing distinguishes a flow at `implementation` from one at `behavior`.
- Every configured verification definition, at every level, must have executed inside the current flow for its baseline to exist (`src/core/baseline.ts:95-106`) — a full declared-suite rerun per semantic flow.
- Every flow must change at least one documentation artifact to baseline (`src/core/baseline-flow-rules.ts:54`); a code-only flow can neither baseline nor close (see II.5).

This model is coherent for small, doc-led increments wired to code from day one. The problems below all arise when implementation stops being small, immediate or conflict-free.

## II.2 "Where do I start? In what order?" — no decomposition exists

The document graph is the only map, and no view turns it into work:

- `generated/implementation-order.md` is the topological order of the **entire artifact graph** (`src/core/projections.ts:190-191`) — global, not per-change, not per-feature, blind to what is already mapped or built.
- No projection assembles a per-feature or per-change work packet. To implement `FTR-X` correctly an agent must manually join: its UC/FLOW closure, the design artifacts, the owning `WIRE-*`/`SCHEMA-*`/`TRANSITIONS-*` files, the applicable rows of three repo-wide cross-cutting foundations (`ACCESS-CONTROL`, `SYSTEM-INVARIANTS`, `ERROR-CATALOG`), the UT/IT/ST specs and their TC tables, and existing mappings. That join is recomputed mentally by every implementer, every time, with no artifact recording it.
- Step size is undefined. The playbooks order artifact *authoring* (behavior → design → tests → implementation) but say nothing about implementation-internal order (entities before operations? vertical slice per UC? contract-first?).

## II.3 "What if implementation is incomplete?" — the floor is four mappings per feature

The exact enforcement floor at baseline, with sources configured (`src/core/baseline.ts:66-86`): every active feature's reverse closure must contain ≥1 mapped non-test artifact, and ≥1 mapped **active** UT, IT and ST spec (`:78-84`); mapped paths must exist on disk (`src/core/validation.ts:112`); all configured commands must have run green in-flow (`baseline.ts:102-106`).

Everything below that floor is invisible:

- A feature whose closure holds ten design artifacts passes with one mapped.
- A UT spec listing ten `TC-*` rows passes when its mapped test file implements three — case results render `not reported by configured command` (`src/core/result-artifact.ts:74-86`) and nothing counts rows.
- The `Symbol` column of every Implementation mapping table is prose; no validation checks that a named symbol exists in the mapped file.
- Nothing checks that executed commands exercise the selected specs at all (Part I, G4).

**Consequence: partial implementation produces legal green baselines.** Today, "did we cover enough" is answered by model discipline and reviewer reading, in a system whose stated doctrine is that model discipline is never evidence.

## II.4 "Docs first, build later" — the retroactive conformance cliff

The feature loop at `baseline.ts:66` iterates **all active features in the repository**, not the affected ones. Configuring `implementation_sources` therefore changes the baseline contract retroactively:

1. A repository that validated docs-only through N evolutions has features with full spec coverage and zero mappings.
2. The moment sources are configured, the **next** semantic flow's baseline demands the four mappings — pointing at files that exist on disk — for *every* active feature, plus green runs of every configured command.
3. Slicing the catch-up per feature is impossible: the first slice's baseline is blocked by every other feature's missing mappings. Deferring configuration doesn't help either — mappings cannot be authored before their source is configured (`IMPLEMENTATION_MAPPING_INVALID`, `src/core/validation.ts:106`).
4. The only mechanically legal path is one monster flow that implements (or at least maps, with real on-disk files and passing suites) the entire accumulated repository at once.

The conceptual home for catch-up exists: Reconciliation explicitly supports code-repair baselines carrying only an `ISS-*` plus a successful execution (`baseline.ts:107-110`; `issue` is creatable in both semantic flows, `baseline-flow-rules.ts:10`), and "code absent where docs are truth" is drift by the method's own definition. But the all-features gate blocks reconciliation slices identically. **The gate's implicit assumption — sources wired from the first evolution, mappings accumulated incrementally — contradicts the product's own advertised adoption path (validate the documentation first, build when validated).**

## II.5 "What if implementation reveals two features conflicting at the document level?"

Three branches, walked against the actual close/baseline semantics:

- **(a) The conflict lies inside the current change's impact closure.** Legal to repair in-flow: Evolution may modify affected old artifacts (impact classification "modify"); the closure legitimately reaches both sides. Supported today, though the playbook never names this situation.
- **(b) The conflict lies outside the closure** (discovered incidentally while reading code). Legal path: record an `ISS-*` inside the current flow (engine-legal, `baseline-flow-rules.ts:10`), drive the current flow to its honest baseline, close, then open Reconciliation on the recorded contradiction. Mechanically sound — and documented nowhere as a protocol; an agent improvising here can plausibly try to widen the current flow instead.
- **(c) The discovery invalidates the current flow's own intent after code edits were already made.** There is no abort. An edited, unbaselined flow cannot close (`state.ts:153`); cancellation requires **both** the docs tree and the implementation tree to hash back to their start snapshots (`state.ts:150-152`); baselining requires driving a now-known-wrong design to green. The real escape — restore both trees byte-identical to the flow start, then close as cancelled — is legal, destructive to work-in-progress, and documented nowhere. Parking at a checkpoint is the remaining option, and it occupies the repository's only flow slot indefinitely.

## II.6 Parallelism, and work with no admissible flow

- **All governed implementation is serialized.** One active flow means one semantic change's code work at a time, repo-wide. Two agents (or developers) implementing two features concurrently is structurally impossible on the governed path.
- **The ungoverned path is invisible.** Hooks bind only this session's tools; a human in an IDE edits sources freely. Between flows, nobody compares the code tree against the last baseline's implementation snapshot — close-time checks are within-flow only (`state.ts:149-155`). So the governed path is bottlenecked while the ungoverned path accumulates silent drift: the worst pairing.
- **Pure refactoring has no legal flow.** Evolution requires a semantic product intent; Reconciliation requires a concrete defect; the engine independently blocks any semantic baseline with zero doc-artifact changes (`baseline-flow-rules.ts:54`) and any dirty close. Conformance-preserving code work (rename, extract, dependency bump) must therefore either masquerade as a Reconciliation with a stretched `ISS-*`, happen ungoverned in the IDE, or not happen.

## II.7 Root diagnosis

Documents in this system are **declarative end-state truth**; implementation is a **long-running, order-sensitive, discovery-generating process**. The method models the second as a single step inside a transaction sized for the first. That fit holds when increments are small, code is wired from the start, and nothing surprising is learned mid-flight — and degrades sharply under accumulation (II.4), discovery (II.5), partiality (II.3) and concurrency (II.6). None of this contradicts the system's philosophy; it is the same provenance rigor not yet extended to the one activity the documents exist to cause.

## II.8 Recommendations — Cluster D (execution semantics)

- **D1. Work-packet projection.** `generated/implementation-plan-<CHG>.md` (or per affected feature): the affected closure in dependency order, each artifact with its owning contract files, the applicable `ACCESS-CONTROL`/`SYSTEM-INVARIANTS`/`ERROR-CATALOG` rows by reference, the covering UT/IT/ST specs with their TC tables, current mappings and their drift state. A deterministic join over data the engine already holds — squarely inside its sanctioned authority, no gate added. This is the direct answer to "where do I start and in what order".
- **D2. Defuse the cliff.** Scope the mapping gate at `baseline.ts:78-84` to features whose closure intersects the current change; report every other active feature's missing mapping as a standing warning (`IMPLEMENTATION_MAPPING_MISSING`) instead of a baseline error. Discipline is preserved — the warning is permanent and visible — while sliced catch-up (one Reconciliation per feature, each with its `ISS-*` and green run) becomes legal. Document the catch-up pattern explicitly in the reconciliation playbook.
- **D3. Document the discovery protocol.** Write branches (a)/(b)/(c) of II.5 into the Evolution and Reconciliation playbooks, including the abandon path (dual-tree restore → cancelled close) — or add `flow close --abandon` that verifies the dual-snapshot equality itself and reports exactly what still differs. An undocumented escape hatch is indistinguishable from a trap.
- **D4. Symbol-level mapping check (warning severity).** Validate that each Implementation-mapping `Symbol` occurs textually in its mapped file. Language-agnostic and approximate by design, but it converts pure mapping theater into a visible warning at near-zero cost.
- **D5. Name the concurrency boundary.** State in the docs that the governed implementation path is serialized by design, that the intended unit of work is a small evolution wired from the first feature, and what the ungoverned-IDE consequence is (silent drift until A2's per-mapping hashes exist). An honest limitation documented is a constraint; undocumented, it is a surprise.

Cluster A (Part I) remains the completeness floor-raiser: D1/D2 make implementation *navigable and adoptable*; A1–A3 make its *sufficiency measurable*. They compose.

---

# Part III — The target operating model: docs complete first, implementation as its own controlled process

*Added after the author specified the intended model: documentation is always authored first; implementation follows as a separate, controlled process whose unit of work may be one feature, or one segment inside a feature — for example production code now, UT/IT/ST test code later.*

## III.1 The model is legitimate — and half of it the system already agrees with

At micro scale the system already encodes docs-before-code: inside one Evolution the checkpoint order is behavior → design → tests → implementation. The target model is the same ordering lifted to macro scale — a whole documentation phase, then a whole implementation phase. Phase 1 is fully supported today (pure-docs mode, honest `not-configured` state) and is the product's own advertised adoption path.

One structural fact shapes everything downstream: **phase 1 cannot park features as `draft`.** A draft artifact created by a change blocks that change's own baseline (`src/core/baseline.ts:64`; `00-system/artifact-lifecycle.md:36`), and downstream artifacts may not treat a draft as authority. So the documentation phase necessarily ends with **active** features — exactly the population the all-active-features implementation gate later quantifies over (II.4). The cliff is therefore not an edge case of this model; it is its guaranteed destination.

## III.2 Requirement-by-requirement verdict

| Target requirement | Today | Blocking mechanism |
|---|---|---|
| Docs always authored first | **Supported** | Pure-docs mode; `not-configured` recorded honestly |
| Implementation as a separate, later process | **No entry point** | Evolution's contract wants a behavior-change intent; Reconciliation wants a concrete defect. "Implement what is already specified" is literally neither. Every semantic baseline also needs ≥1 doc-artifact change (`baseline-flow-rules.ts:54`) — satisfied only incidentally, by mapping edits |
| Implement exactly one feature | **Illegal** | First sourced baseline demands 4 mappings × *every* active feature (`baseline.ts:66-84`) — the II.4 cliff |
| Implement one segment: code without UT/IT/ST | **Illegal as a closed state** | The per-feature floor requires mapped **active** UT+IT+ST; the only representation of "code done, tests pending" is a flow parked open at `implementation`, which monopolizes the single flow slot (`state.ts:68`) and blocks all other work, documentation included |
| Controlled, visible progress | **Absent** | No legal persistent state exists between "not started" and "fully mapped + green"; no per-feature implementation status anywhere (I G6, II.3) |

## III.3 The design that hosts this model

Four moves, all inside the standing constraints (four flows + inspector preserved; no new gates — in fact gates become evidence, which is the repository's own 1.8.0 platform doctrine: *"a committed-but-unproven platform is documented as `active` with its unproven-ness in the evidence layer"*):

1. **Name the entry point.** Admit *implementation intent* as an input class of Product Evolution in the playbook: the explicit product decision "build FTR-X now", whose doc diff is the mappings it adds plus any spec refinements implementation forces. Reconciliation remains the home for *discovered* nonconformance. No engine change.
2. **Graduate the gates** (supersedes D2). Scope the 4-mapping baseline **error** to features inside the current change's closure. Every other active feature's missing mapping, and — new — a missing *level* inside an affected feature (UT/IT/ST specified but not yet implemented), becomes a **standing warning** (`IMPLEMENTATION_MAPPING_MISSING`, `IMPLEMENTATION_LEVEL_UNPROVEN`). Incompleteness is recorded, never blocking, never silent.
3. **Make progress machine-visible** (D1 + A3 merged). A per-feature implementation dashboard projection: specified → design mapped n/m → UT/IT/ST mapped → latest execution per level → case results once A1 lands → drift once A2 lands. "Controlled" then means: progress is the delta of warnings and dashboard rows between baselines — derived from mappings, records and hashes, never from authored claims.
4. **Segments are small *closing* flows, never parked flows.** Each segment — "FTR-X code", later "FTR-X tests" — is its own short Evolution: map, run the configured suite, baseline *with* the honest warnings, close. This requires move 2 to be legal. Parking a flow at `implementation` as a segmentation device should be documented as an anti-pattern: it holds the repository's only flow slot hostage.

Costs to state honestly: (a) every segment baseline reruns every configured command (`baseline.ts:102-106`) — negligible for small suites, felt at scale; (b) the further docs run ahead of code, the larger the discovery debt when implementation pushes back (II.5 is the norm, not the exception). The dashboard is what prices that debt continuously instead of letting it surprise.

## III.4 What exists today, honestly

Two shapes work right now, neither of them the target model: **(a)** wire sources from the first evolution and implement each feature fully inside its own flow — coherent, supported, but it merges the two phases and forbids segments; **(b)** the monster catch-up flow — legal, and the exact opposite of controlled. The space between them is what this part specifies, and moves 1–4 are the minimal set that opens it.

## III.5 The activation surface: explicit skill invocation, never automation

The author's model is invocation-driven: implementation happens only when a skill is explicitly called naming the feature and the depth of the segment. This is already the plugin's doctrine — all five skills are manual-invocation-only (`README.md:57`), and the standing constraints exclude monitors and automation — so nothing in this design introduces or assumes automatic implementation. Concretely:

- **The invocation carries the scope contract.** The engine does not need to parse or understand scope; it needs only to *tolerate and record* partiality (move 2). Which feature, which segment (production code / UT / IT / ST code / a named artifact subset) is stated in the invocation text; the evidence layer then records what actually got done (mappings added, executions run) and the warnings record what remains. Scope is an agreement between author and model at invocation time; truth is what the records say afterwards.
- **Turn control and segment control are different axes and both exist.** `--until <stage>` keeps deciding where a *turn* stops inside the flow; the segment decides which *mappings and code* the flow adds before it baselines. A code-only segment runs the whole flow to `baseline` — it is not a flow parked at the `implementation` checkpoint.
- **One surface decision remains** — where the invocation lives:
  - *Minimal:* extend `evolve-product`'s accepted input with the implementation-intent class (Part III move 1). No new skill; the evolution playbook branches to a shortened path (behavior/design/tests already exist and are read, not re-formed) that goes: work packet → code → mappings → execute → baseline.
  - *Explicit:* a sixth thin adapter pair (e.g. `/ai-saas-sdlc:implement <FTR-…> [scope]`) routing to its own playbook (`resources/flow-playbooks/implementation.md`) that still opens `flow start --type evolution`. The four-flows-plus-inspector invariant is about **flow types, not skill count**, so this stays inside the standing constraints; it does change the advertised five-skill surface, which is a product decision. Given that the author's model treats implementation as a first-class separate process, the dedicated adapter is the more honest expression; the minimal path is the cheaper first step and nothing in it precludes promoting to a dedicated skill later.
- **A worked sequence** (target state, with moves 1–4 in place):

  ```text
  /ai-saas-sdlc:implement FTR-PAYMENT-001 code
    → flow start --type evolution  (implementation intent, code segment)
    → read generated/implementation-plan (work packet, D1)
    → write production code in configured source; add SCR/API/ENT mappings
    → verify --all --execute  (declared suite, green)
    → baseline BL-013  → standing warnings: FTR-PAYMENT-001 UT/IT/ST unproven
    → flow close
  ... later ...
  /ai-saas-sdlc:implement FTR-PAYMENT-001 ut,it
    → same shape; warnings shrink to [ST]; dashboard shows the delta
  ```

  Serialization still applies by design: one implementation invocation at a time, each closing its own baseline before the next opens.
