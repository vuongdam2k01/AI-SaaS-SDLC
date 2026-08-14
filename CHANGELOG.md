# Changelog

## 1.19.0 - 2026-08-14

The quality of an artifact type is a property of its model, not of each
instance. Where a model is missing, quality tracks whoever happened to write
that instance; where one exists, most of it is settled before anyone starts
writing. An audit of this plugin against that standard found the patterns were
strong as shape contracts and silent as models: they described what a finished
artifact looks like and said nothing about how to derive its content, how far
to go, or how to know when nothing had been left out.

Three specific gaps followed from that. Every pattern still carried normative
prose bullets — a screen's accessibility requirements, an operation's
transaction semantics, an integration's reliability rules — and a prose bullet
cannot be cited, claimed or reported as unclaimed; it can only be read and
forgotten. That is exactly the shape of the failure this plugin exists to
prevent, sitting inside the plugin's own templates. The closure condition that
holds for business rules held for nothing else, so the derivation map could
promise a test consequence for an access rule or an error code and never
observe whether one was taken. And no protocol answered the question that
follows level allocation: given one specification, which cases does it contain,
and how do you know when it has them all.

This release closes all three, and gives existing repositories a way to receive
the new contracts at all.

### Added

- `resources/protocols/test-case-derivation.md` — the derivation between level
  allocation and test code. Three destinations for every declared behavior
  (case, exclusion, question); a construction-based classifier for frontend
  specifications; the sub-case expansion of one action with its multiply-versus-
  add rule; the two gates a region product must pass; the subtraction that keeps
  display rules from inflating a specification; and the three-level role rule
  whose reduced-surface case carries the negative expectation no document
  states — that the operation supplying hidden data is not called. It adds no
  level and no gate.
- Five closure warnings — `ACCESS_UNVERIFIED`, `INVARIANT_UNVERIFIED`,
  `ERROR_UNVERIFIED`, `UX_UNVERIFIED` and `SCREEN_BEHAVIOR_UNCLAIMED` — with
  `generated/foundation-coverage.md` and `generated/screen-coverage.md` derived
  through the same predicates, so a view and a finding can never disagree. A
  screen behavior counts as closed by a case, by an exclusion naming its
  receiving specification, or by an open question; reaching none of the three is
  the silent gap these exist to name. Warnings, never errors: which level holds
  a claim stays a judgement.
- `ai-saas-sdlc patterns migrate` — the missing way across. A pinned snapshot
  keeps a repository reproducible, which also means a standard improved in the
  plugin could only ever reach repositories created afterwards. Migration
  verifies the existing pin, re-pins the current catalog, and reports the
  contract delta per artifact type; `--check` reports without writing. It never
  edits an instance: `validate` afterwards names what no longer fits, and
  repairing it is ordinary flow work.
- Content contracts for the four `00-system` documents, and the twenty-seventh
  warning, `SYSTEM_DOCUMENT_INCOMPLETE`. These documents state the repository's
  own authority, lifecycle, vocabulary and validation rules, and nothing checked
  them: `scanArtifacts` reads layers 01 through 05, so a project could gut its
  own document rules and every command would still report a clean repository.
  They are contracted without becoming artifacts — they enter no graph, no
  baseline manifest and no projection, which is what makes this possible without
  moving any existing repository's artifact count or generated views. Reported
  as a warning rather than an error because a repository initialized under an
  older template carries an older copy it did not author, and `patterns migrate`
  re-pins contracts without carrying system documentation; the migration report
  now says so when those contracts change.
- `evals/spec-derivation` — grades whether a derived specification traverses
  the screen it verifies, routes what it cannot prove, and records undefined
  behavior as questions instead of inventing message strings. It runs against
  two deliberately unequal screens, so the grader can also catch the failure a
  single screen hides: specification size that tracks the author rather than the
  object, in either direction — two near-equal specifications for two unequal
  surfaces, or a small one that is small because the author stopped early. The
  smaller screen is also where a group of behavior the larger one has none of
  becomes visible at all.
- `src/core/claims.ts` — one definition of what a claim is, shared by every
  closure check, replacing three near-identical private copies.

### Changed

- Pattern catalog generation 4 → 5. Every normative prose block in the design,
  product, verification and control patterns is now an identified table:
  `AX-` accessibility, `TX-` transactions, `CC-` concurrency, `EM-`/`DL-`/`EP-`
  event semantics, `AU-`/`RL-`/`OB-` integration boundaries, `OW-`/`T-`/`REL-`/
  `RT-` entity ownership and lifecycle, `G-` use-case guarantees, `EE-` flow
  entry and exit, `DEC-`/`FC-` decision statements and follow-on constraints,
  and `EX-` unit-test exclusions, which the receiving specification can now cite
  back. Discovery unknowns and an issue's resolution stay prose deliberately,
  and each says so with its reason.
- The `access_control`, `error_catalog`, `ux_rules` and `test_policy`
  foundations gain identified tables for their rule sections — denial behavior,
  exposure and logging, content rules, and the three policy rule blocks — and
  those four plus `system_invariants` and `question_ledger` now declare
  local-ID namespaces the engine enforces.
- Integration and system specifications no longer carry a separate un-identified
  failure-check table. Those checks are `TC-*` rows, where an execution record
  can name them; the integration case table gains a State guarantee column and
  both completion contracts require a failure path where one exists.
- Every pattern's contract comment carries a `Detail rule` sentence derived from
  its consumer — what they already have open, and therefore what this artifact
  must not restate. `resources/artifact-patterns/README.md` carries the consumer
  table those sentences come from.
- `behavior-formation.md` expands its case checklist into trigger expansion,
  naming which dimensions multiply rather than add.
- Accepted decision records and the original idea are exempt from content
  contracts once baselined. A contract that tightens after they were sealed
  would otherwise demand an edit immutability forbids, leaving an error nobody
  can repair and a baseline nobody can cut.
- `implementation-projections.ts` now joins UX rules into work packets; they
  were the one foundation family it omitted.
- `00-system/document-rules.md` and `00-system/glossary.md` give their rule
  sections local IDs (`DR-01`–`DR-16`, `NR-01`–`NR-05`) so a review can cite the
  rule an artifact broke. `00-system/artifact-lifecycle.md` and
  `00-system/validation-rules.md` deliberately keep theirs as prose, each with a
  comment saying why: those rules are executed by the engine, so the code is
  already the authority and a local ID would be a second copy of it, drifting
  the moment either side changed. The distinction is the rule to apply when
  identifying content anywhere — identify what a person applies, leave what the
  engine executes.

### Certification

Certified end to end on repositories built from an empty directory through the
packaged binary, with the two highest-risk claims proven red before green. That
discipline paid for itself: the first version of the sealed-decision-record
check was **vacuous** — it asserted no error on an ADR the fixture never
creates, and stayed green with the exemption disabled. Evidence and the honest
limits in `plans/reports/certifier-2026-08-14-canonical-model-certification.md`;
the coverage no unit test held is kept as `tests/packaged-lifecycle.test.ts`.

### Upgrading

An existing repository keeps its pinned catalog until `patterns migrate` is run
deliberately, and sees the two new projections only once it has a screen or a
live foundation rule — at which point `refresh` writes them and `validate` stops
reporting `GENERATED_DRIFT`. Run `refresh` once after upgrading the plugin.

After migrating, expect `SYSTEM_DOCUMENT_INCOMPLETE` until the four `00-system`
documents are brought forward from the current project template: migration
re-pins contracts, and those documents ship outside the pinned catalog. The
warning is the record of that debt and blocks nothing.

## 1.18.2 - 2026-08-14

The how-to guides had drifted as far back as 1.9.0 while the engine reached
1.18.1 — an audit found the guide titled "Implement a feature" never once
mentioned the implement skill, no guide taught resuming an interrupted flow,
and one guide's own prose contradicted the table printed directly beneath it.
This release re-aligns the user-facing layer with what the plugin actually
does.

### Added

- `docs/guides/resume-an-interrupted-flow.md` — the situation nothing covered:
  reading the session banner's `Resume:` line, what survives an interruption in
  files versus what is re-derived, continuing with `continue FLOW-*`,
  cancelling a flow, and the single-flow-slot refusal.
- Guides now teach what 1.13.0 through 1.18.1 shipped: declaring `report:` to
  turn a suite into per-case evidence joined to `TC-*` rows; per-command
  `timeout_ms`; `timed_out` / `spawn_error` / `output_truncated` as outcomes
  that are *not* test failures; the `init` code-project refusal and `--force`;
  the docs-root precondition; the four delegate agents by their real names and
  boundaries; every segment running the full suite; the three-strike rule;
  divergence-before-convergence at the ADR threshold; and `IMPLEMENTATION_DRIFT`
  routed explicitly to Reconciliation.

### Fixed

- `inspect-and-check-results.md` claimed "Nineteen findings are warnings"
  directly above a twenty-one row table; the generated-file list omitted six
  paths that exist; the execution section predated report ingestion and the
  execution budgets, and never stated that execution is legal only inside
  Evolution or Reconciliation.
- `implement-a-feature.md` — retitled *Specify a feature end to end*, now
  routes planned construction to the implement skill instead of leaving the
  newest capability invisible, corrects the claim that the documented config
  keys were exhaustive, adds `PLT-*` to the design checkpoint, and replaces an
  unsourced time-and-cost estimate with a claim the repository can stand behind.
- `wire-a-codebase.md` and `implement-a-feature.md` showed config fragments a
  reader could paste over `sdlc.config.yaml` and break it; both now say what
  they add to what `init` wrote.
- `implement-per-segment.md` forbade leaving a flow open at all, contradicting
  the `--until` checkpoint the engine and skill both support, stated
  `suggested_segment` unconditionally when it appears only with no flow open,
  and listed a screen self-review gate missing visible focus and 4.5:1 contrast.
- `reconcile-a-failure.md` never named the warning built as its trigger, and
  never routed a specified-but-unbuilt feature away from Reconciliation.
- The project template shipped both defects into every initialized repository:
  `validation-rules.md` said nineteen warnings exist, and `sdlc.config.yaml`
  said two optional keys exist. Both now say what is true, and the config
  template documents `report` and `timeout_ms` inline.
- `schemas/project-config.schema.json` advertised `format: json`, which the
  loader rejects — a config could validate against the shipped schema and then
  fail to load. The schema now matches the loader; `json` remains reserved.

## 1.18.1 - 2026-08-14

The 1.17–1.18 work was verified the way this repository defines verification:
an adversarial read executed against the real parsers, a regression test per
defect proven red against the committed tree, then a full lifecycle driven
through the packaged binary from an empty directory. Nine defects surfaced,
six of them in code shipped in 1.18.0, and all nine are fixed here. Evidence
matrix in `plans/reports/certifier-2026-08-14-post-hardening-certification.md`.

### Fixed

- Mapping-table diagnostics no longer misfire or under-fire: a GFM alignment
  divider (`|:---|:---:|`) is a divider, not an ignored row — previously any
  author who ran a markdown formatter earned a permanent warning about a
  table that parsed perfectly; backticked placeholders and pipe-less tables
  are now named instead of dropped silently; and a fenced example inside the
  section is documentation, so it is neither reported nor — as it was —
  parsed as a live mapping row.
- Mapping-path containment uses `isWithin` rather than a string prefix, so a
  source `app` no longer swallows a sibling `app-tools` and suppresses the
  unresolved-path finding. That finding is now one per specification listing
  its unresolved paths, and it names the convention (paths are relative to
  the configured source root, never prefixed with the source ID) rather than
  asserting a transposition.
- `flow next` and the SessionStart hook agree in every state: neither offers
  to resume a segment whose baseline exists, and an input the parser cannot
  read yields a `<FTR-ID> <segment>` shape with the reason explaining it,
  never a command whose first positional argument is a flag. The input parser
  also tolerates a missing comma, a colon and trailing punctuation.
- The PreToolUse sentinel walks ancestors, so a session started in a
  subdirectory of the documentation repository keeps every protection —
  1.18.0's Bash narrowing had widened a pre-existing cwd hole.
- The init marker guard reads the directory once, matches regular files by
  name and extension, covers Kotlin-DSL Gradle, `.csproj`/`.sln`, `Makefile`,
  `mix.exs`, `Package.swift`, `setup.py` and `deno.json`, ignores a directory
  merely bearing a marker's name, and refuses advisorily: a documentation
  toolchain legitimately carries `package.json` or `requirements.txt`, so the
  message says the directory *looks like* a code project and points at
  `--force`.

## 1.18.0 - 2026-08-13

A systematic hunt for the defect class the model-allocation challenge exposed
— decisions calibrated from the authoring context that fail on real installed
usage — across engine, hooks, method and adapters. Three parallel audits and
a blast-radius pass produced the findings; every fix shipped with its test.

### Added

- Per-command `timeout_ms` in `sdlc.config.yaml` verification commands,
  overriding the machine policy for that command alone; `verify --execute`
  prints a stderr hint naming timed-out executions and both remedies.
- Two mapping-table warnings: `IMPLEMENTATION_MAPPING_ROW_IGNORED` (a row
  present but unparseable — previously dropped silently, indistinguishable
  from "not written yet") and `IMPLEMENTATION_MAPPING_PATH_MISSING` (on a
  frontmatter-mapped specification, a row whose test path resolves under no
  source — the transposed-columns signature). The header accepts the singular
  "Case ID" authors sometimes write.
- The delegation packet as a copyable template, a delegate-side refusal rule
  (no packet → `NEEDS_CONTEXT`, wired into all four agent bodies including a
  counsel carve-out from its zero-questions rule), a bounded controller-side
  failure loop (one enriched re-send, then inline or escalate), delegation
  outcomes in the closing report, resume mechanics and cold-start
  reconstruction in the implementation playbook, and the docs-root
  precondition stated on the invocation path of all twelve host skills.
- `init --force`; without it, initialization refuses a directory carrying a
  code-project marker (package.json, go.mod, …) — the wrong-cwd error had
  been recommending exactly that destructive `init`, and the new
  uninitialized-repository message now names the real precondition.

### Changed

- `flow next` for an implementation-intent flow prints a continuation the
  implement skill can actually parse — feature and segment recovered from the
  flow's verbatim input — and the SessionStart summary for an open flow now
  carries intent, reached/target stages and the exact resume command.
- RESULT artifacts cap passed-case rows at 50 via a record field written only
  by new engines on large sets (failures are never capped); records without
  the field — everything older engines wrote — render byte-identically. An
  old engine validating a new capped record reports a schema mismatch: the
  same one-way ratchet as the `timed_out`/`report` fields.
- Verification output accounting is byte-accurate with per-stream decoders:
  the old cap compared UTF-16 units against a byte budget and could split
  multibyte sequences into U+FFFD on real suites.
- The Bash keyword rules in PreToolUse — the internal-directory rule included
  — now apply only inside a managed repository, revising 1.17.0's
  "unconditional everywhere" wording for the shell channel: matching command
  text machine-wide denied innocent mentions like
  `git commit -m "fix .ai-saas-sdlc parser"` in unrelated projects (confirmed
  by execution). Direct-tool and apply_patch path rules stay unconditional.
- The Node version guard prints one clean line instead of a bundle stack
  trace.

## 1.17.1 - 2026-08-13

The author's challenge to 1.17.0's model allocation held up: `inherit` on the
judgment agents was calibrated from a strongest-model authoring session, and
on the cheaper sessions real installations commonly run, it routed review,
diagnosis and counsel by session budget — the exact failure the delegation
protocol's own rule forbids, and a contradiction of the counsel's written
"strongest available tier" contract. Official host behavior removed the
reason for the caution: a pinned tier an account lacks substitutes
gracefully (family alias → newest permitted version of the family, else the
inherited model, with an interactive warning), and users keep two override
levers above the frontmatter (`CLAUDE_CODE_SUBAGENT_MODEL`, then the
per-invocation model parameter).

### Changed

- Agent model pins now carry agentkit's full cost gradient as floors:
  `implementation-scout` stays `haiku`, `spec-compliance-reviewer` pins
  `opus`, `implementation-debugger` pins `sonnet` and
  `implementation-counsel` pins `fable` — making the counsel contract
  mechanically true on every session tier. The delegation protocol states
  the floor rule (where the host allows a per-spawn model choice, overrides
  go upward to the session's model only), the implement skill instructs the
  controller accordingly, package-check requires the exact pin on every
  agent, and the audit report carries the re-evaluation as an amendment.

## 1.17.0 - 2026-08-13

The host-capability audit (`plans/reports/evaluator-2026-08-13-host-capability-audit.md`)
became shippable mechanism. The implement flow's delegation roles now exist as
four thin Claude agent adapters with harness-enforced tool boundaries, the
PreToolUse hook learned to tell an engine-managed repository from everyone
else's, SessionStart context survives compaction, and the delegation method
carries the measured economics it previously only implied.

### Added

- Four agent adapters under `claude/agents/`, routed by the Claude manifest:
  `implementation-scout` (read-only, cheap tier), `spec-compliance-reviewer`
  (read-only — it physically cannot edit), `implementation-debugger`
  (reproduces with Bash, never edits, never runs engine operations) and
  `implementation-counsel` (a one-turn, zero-question second opinion at the
  three-strike or design-fork boundary; advises only). Bodies are role wiring
  over the shared protocols — no method text lives in them. The Codex plugin
  stays skills-only and the delegation protocol remains its self-checklist.
- Method distillations at their owning anchors: delegation economics (three
  to five delegates, one-to-two-thousand-token summaries, roughly fifteen
  times single-conversation cost, spent only on reads and independent
  verifications), the counsel spawn row and role boundary, the reviewer
  anti-chase rule, the never-weaken-a-spec rule for test segments, the
  scout's untrusted-content and `[UNVERIFIED]` re-grep disciplines, and the
  counsel consult at the debugging protocol's three-strike rule.
- Package check enforces the new surface: exactly four agent files, exact
  per-role tool lists with no editing tools anywhere, filename-equals-name,
  single-line descriptions, the cheap tier pinned only on the scout, manifest
  routing in lockstep with disk, and the SessionStart matcher string; the
  Codex manifest additionally rejects an `agents` field and the dual-host
  test pins the routing.

### Fixed

- PreToolUse protections are sentinel-gated on the `.ai-saas-sdlc/`
  directory: unrelated repositories no longer receive engine-branded denials
  for their own `generated/` paths, and a Genesis `--idea` containing a
  boundary-delimited word like "generated" no longer wedges `init` itself.
  The internal-directory rules stay unconditional everywhere — fabricating
  engine state is denied even outside managed repositories. Accepted
  residuals, stated: pre-init fabrication of result-shaped files now falls to
  explicit validation and the Stop hook rather than PreToolUse, and the
  sentinel anchors to the session's working directory, which the operating
  model already fixes at the docs root.
- The SessionStart hook matcher covers `compact` and `fork`, so baseline,
  flow, debt and next-segment context is re-injected after compaction —
  previously it was silently lost in exactly the longest flows.

## 1.16.1 - 2026-08-13

The implementation extension was certified end to end through the real
packaged binary against a real fixture lifecycle: Genesis to BL-000, feature
docs to BL-001, wiring to BL-002 with `IMPLEMENTATION_MAPPING_MISSING`
standing, a `code` segment whose red run (EXEC-004, junit case joined to
TC-03) was repaired to green, and a `ut` segment shrinking the warning set to
IT and ST — twelve real executions, real junit and TAP reports, drift and
symbol probes firing and clearing, the SessionStart debt line observed on a
wired repository, and the shipped harness auditing the produced capture to
`passed: true`. One defect surfaced, in documentation, and is fixed here; no
engine defect surfaced. The full evidence matrix lives in
`plans/reports/certifier-2026-08-13-implementation-extension-certification.md`.

### Fixed

- **Eval capture convention stated explicitly** in `evals/README.md`: the
  session's final response(s) are saved into the output repository as part of
  a capture. Three of the implementation case's required output markers
  (`--intent implementation`, `suggested_segment`, PASS/MISSING/EXTRA
  grading) exist only in the model's closing reports — the intent field lives
  on the active flow record and is dropped from the closed change record —
  so a capture without the response could never pass the deterministic audit.
  Documenting the convention was chosen over persisting intent onto closed
  change records (heavier, and it would still leave the other two markers
  unsatisfied) and over weakening the manifest patterns (loses grading
  signal).

## 1.16.0 - 2026-08-13

Brainstorm's two halves got two different verdicts. Its contract frame
(outcome, constraints, non-goals, acceptance) already lives as the artifact
structure itself and gained nothing from duplication. Its divergence
discipline was genuinely missing: the method said when a choice deserves an
ADR but never forced generating real alternatives before converging, so a
first workable idea could anchor the decision and back-fill strawman
alternatives to lose on paper. Method-only release; no stage, gate, flow,
agent or interview — all constitutionally excluded — and no engine change.

### Added

- **Divergence before convergence** in `solution-formation.md`: at or near
  the ADR threshold, alternatives are generated before any is chosen — each
  real, distinct in consequence, evidence-costed; a rejected option must be
  credible enough that a later maintainer sees why it nearly won, and its
  cost lands in the ADR's `Options considered` table. Reasoning inside the
  flow, never a new interaction: a determined answer converges without
  ceremony.
- **Genesis applies it to the pipeline's most leveraged decision**: two or
  more evidence-supported framings of the opportunity/beachhead are presented
  as explicit alternatives inside the existing consolidated interaction; the
  do-not-manufacture-a-checkpoint rule stands.
- **Reconciliation applies it to repair choice**: multiple viable repairs
  diverge before repairing, the successor ADR carries the credible losers,
  and the debugging protocol's three-strike route lands under the same rule.

## 1.15.1 - 2026-08-13

Text-only patch closing the one distillation gap a completeness audit found:
the size-gated simplification discipline. The review protocol's quality pass
now runs a behavior-preserving simplification over large diffs (reference
thresholds ~400 changed lines / 8 files / 200 single-file lines), scoped to
changed files, proven by diff statistics and the green suite — never by
prose — and skipped silently below the thresholds. No engine, schema or
gate change.

## 1.15.0 - 2026-08-13

The 1.12.0 implementation surface carried the discipline of building — spec
compliance, verification iron laws, honest failure — but deliberately thin
craft: a decision that conflated two different things inside domain knowledge.
Framework facts age and were rightly excluded; the durable engineering
judgment underneath them — decision rules, invariants, budgets, checklists —
ages slowly and had no home. This release distills that judgment into the
method as nine protocols the playbook loads by situation, plus the session
hook surfacing implementation debt. Method-only beyond one hook line: no
engine change, no gate, no required tooling, no framework facts.

### Added

- **Progressive craft loading.** The implementation playbook gains a
  load-by-situation table: scouting, review, verification always; debugging
  on any failure; delegation before any spawn; design/content for screens;
  and five craft protocols by boundary type. Craft rules are explicitly
  subordinate to repository documents — where they disagree, the document
  wins and the disagreement routes like any discovery.
- **`implementation-debugging.md`.** The full diagnosis method: the
  six-question root-cause gate (verbatim symptom, reproduction, expected vs
  actual, cause with file:line, why now, blast radius), four phases in order
  (investigate, compare, hypothesize with competing hypotheses, repair with a
  failing reproduction first), the three-strike architecture rule routing to
  Reconciliation/ADR, situational techniques (backward tracing, defense in
  depth with TEST-POLICY-recorded seams, polluter bisection), and the red-flag
  and rationalization tables.
- **`implementation-delegation.md`.** Subagents as engineering, not
  ceremony: the four mechanisms that justify a spawn, a trigger table keyed
  to segment moments, the eight-field packet, roles-as-enforcement (the
  reviewer never edits; runner prose is never evidence), parallel ownership
  safety inside one flow, capability-to-judgment tiering, and the status
  protocol with concerns carried verbatim — all readable as a self-checklist
  on hosts without subagents.
- **Five craft protocols.** `craft-api-and-backend` (security defaults,
  API invariants, bounded lists, idempotency, timeouts-and-backoff,
  observability budgets), `craft-data` (embed-vs-reference, 3NF-then-evidence,
  ESR indexing and its costs, plan-verified query shape, tested-rollback
  migrations), `craft-auth-and-payments` (session/token hardening, single-use
  token races, PKCE never downgraded, webhook signature-then-record
  discipline, provider-truth reconciliation with ambiguity rejected, money in
  minor units with provenance), `craft-client` (three-tier state ownership,
  cache-key contracts, waterfall elimination, layout-stable loading, one
  notification voice), `craft-testing` (distribution judgment within the
  UT/IT/ST levels, behavior-not-internals assertions, determinism
  non-negotiables, visual/accessibility viewpoints).
- **`implementation-review-checklists.md`.** The overlay library the review
  quality pass loads by boundary type — base critical/informational, API,
  client, data, and a security sweep with masked reporting and never-auto-fix
  — plus the reviewer's own edge-case scout and pre-submit sweep, wired into
  `spec-compliance-review.md`.
- **Session-start implementation debt.** The portable SessionStart hook now
  surfaces the same evidence-scored `suggested_segment` that `flow next`
  computes, so an implement author sees the owed work before asking.
  Fail-open, one line, absent when unwired or debt-free.

## 1.14.0 - 2026-08-13

A SaaS product's shippable surface is more than passing tests: screens carry
states, strings and accessibility the specifications constrain but code
reviews rarely hold to account, and microcopy is where placeholder English
ships. This release gives the implementation flow its design and content
discipline — entirely as method, deriving from artifacts that already exist,
adding no artifact type, no gate and no required tooling.

### Added

- **The design-implementation protocol.** A screen segment assembles its
  brief from the owned sources — the `SCR-*` tables, the transition graph,
  `UX-RULES` rows and design tokens, `ERROR-CATALOG` strings,
  `ACCESS-CONTROL` visibility — and treats it as the file-mediated contract
  that outranks taste. A countable self-review gate (declared states present
  and observable, catalog strings verbatim, accessible names, visible focus,
  4.5:1 contrast, 375px, zero placeholders) runs before spec-compliance
  review; no scored judgement, no numeric self-approval. Browser verification
  follows the host-capability rule: use what is installed, record what was
  and was not observed, stay legal with none.
- **The content-implementation protocol.** Every authored string binds to
  the artifact that owns its meaning: error messages render the catalog's
  user-safe rows, labels use glossary terms, empty states sell the next
  action, instructions precede requirements, and conversion claims trace to
  documented evidence or do not ship. Strings are code — same diff, same
  review, same discipline.
- **An optional `Design tokens` section in `UX-RULES`** — the semantic
  palette, spacing and typography values every screen consumes, filled by
  the flow that commits the product to a visual system. Template-only;
  content contracts unchanged; existing repositories owe nothing.
- The implementation playbook's screen branch, and the wire-a-codebase and
  per-segment guides, route through both protocols.

## 1.13.0 - 2026-08-13

The method's doctrine is that execution results are the only proof — yet its
own proof chain stopped at the exit code: which cases ran, whether the mapped
code still matched the documents, and whether a mapping's symbol even existed
were all invisible. This release completes the chain: per-case results parsed
from declared reports and joined to specification rows, per-mapping content
hashes that make docs-to-code drift a recorded fact, and execution budgets
that keep a hung suite from hanging a flow. Everything is optional-additive:
old records validate and render byte-identically, old baselines simply
observe nothing.

### Added

- **Test-report ingestion.** A verification command may declare
  `report: {path, format: junit|tap}`; the engine parses it after every run,
  records aggregate counts and per-case results, and joins each case to the
  specification whose Implementation-mapping row names its symbol — exact
  match first, longest contained symbol otherwise, ambiguity recorded as
  unmatched rather than guessed. `RESULT-*` artifacts render real case rows
  and per-case failures; an unreadable report is recorded as `report_error`
  and the outcome stays exit-code-derived. `json` is reserved until a dialect
  is defined.
- **Per-mapping drift detection.** Every baseline in a wired repository
  stores a content hash per mapped path (`implementation_hashes` in the
  manifest); `validate` reports `IMPLEMENTATION_DRIFT` when a mapped file
  leaves that reference point behind while every artifact declaring it is
  unchanged — the docs-to-code divergence signal a whole-tree snapshot cannot
  express, and the recorded trigger Reconciliation previously lacked. IDE
  edits between flows now surface at the next validate on any machine.
- **Symbol location check.** `IMPLEMENTATION_SYMBOL_MISSING` warns when a
  specification's mapping row names a test symbol the row's file does not
  contain — approximate and textual by design, closing the gap where a
  mapping table reads as coverage while locating nothing.
- **Execution budgets.** The git-ignored `.ai-saas-sdlc/verification-tools.json`
  carries machine-local `command_timeout_ms` and `output_max_bytes`; a killed
  command records `timed_out`, cut output records `output_truncated`, and a
  command that never ran records `spawn_error` — rendered as an environment
  failure, no longer indistinguishable from a failed suite.
- **Dashboard depth.** `generated/implementation-coverage.md` gains a Drift
  column and per-command passed/failed/skipped case counts; `flow next`'s
  `suggested_segment` weighs drifted mappings (5) above unmapped design (4)
  and unproven levels.

## 1.12.0 - 2026-08-13

Documentation always comes first in this method, and 1.11.0 made partial
implementation a recorded, legal state. What was still missing was the door:
no interface existed whose accepted input is "build what is already
specified" — Evolution wants a behavior change, Reconciliation wants a defect,
and implementing a specified feature is deliberately neither. This release
adds that door as a sixth skill over the same four flows: implementation is an
Evolution opened with a declared intent, invoked explicitly per feature and
per segment, never automatic.

### Added

- **The implement skill,** `/ai-saas-sdlc:implement <FTR-ID> [code|ut|it|st|all]`
  on Claude and `$ai-saas-implement` on Codex — the eleventh and twelfth thin
  adapters, both routing to the new shared implementation playbook. A segment
  is a small closing flow: read the work packet, scout the doc↔code delta,
  implement and map the invoked slice, run the exact declared commands,
  baseline with the standing warnings that honestly name what was deferred,
  and close. Parking a flow at the `implementation` checkpoint to hold
  partial state is named an anti-pattern; the warning ledger holds it.
- **`--intent implementation` on `flow start`** (evolution only, recorded on
  the active flow and validated everywhere flows are). The intent routes
  guidance — `flow next` continues an intent-marked flow through the implement
  skill — and is never a gate: flow types remain exactly four, and every
  evolution guarantee applies unchanged.
- **A `suggested_segment` hint on `flow next`.** With no open flow,
  implementation sources configured and mapping debt standing, guidance names
  the feature and segment the warning ledger scores highest (unmapped design
  4, unproven UT 3, IT/ST 2 each) with the reason. Information only; the
  next-command contract is unchanged.
- **Three implementation protocols.** `implementation-scouting.md` (five
  outputs re-aimed at the delta between documented design and actual code),
  `spec-compliance-review.md` (PASS/MISSING/EXTRA against the specification
  documents, first and blocking, findings void without file:line evidence, a
  suppression list for review noise, bounded cycles, no numeric
  self-approval), and `implementation-verification.md` (no fix without root
  cause, no completion claim without fresh engine-recorded evidence,
  claim→evidence table, pre-fix capture, red-green per segment).
- **An owned `Engineering profile` section in `ARCHITECTURE-OVERVIEW`** —
  language/runtime, framework, package manager, repository layout, test
  framework per level, migration tool — filled by the flow that wires a
  codebase, so an implementer reads the substrate instead of inferring it per
  segment. Template-only; content contracts are unchanged and existing
  repositories owe nothing.
- **Two guides and an eval.** *Wire a codebase* documents the bootstrap seam
  (scaffold outside the engine, declare sources and commands, record the
  profile); *Implement per segment* walks two segments with the warning set
  shrinking; the sixth eval case captures a red-then-repaired execution
  across two segment flows with honesty graded from the trace.

### Changed

- Evolution routes pure implementation intents to the implement skill;
  Reconciliation names the recorded-drift slice as the sanctioned catch-up
  pattern and refuses planned construction. README, flow reference, command
  reference, Codex installation and the architecture table now count six
  skills and twelve adapters over the same four flows.

## 1.11.0 - 2026-08-13

Configuring `implementation_sources` used to change the baseline contract
retroactively: every active feature suddenly owed one mapped design artifact
and one mapped UT, IT and ST specification, so a repository that validated its
documentation first — the adoption path this plugin advertises — could wire a
codebase only by implementing everything in a single flow. A documentation-only
evolution of a new feature was likewise illegal in a wired repository, because
a mapping cannot even be authored before its target file exists on disk. This
release applies the platform-evidence doctrine to implementation: partiality
is recorded, never blocking, never silent. Unwired repositories are
byte-identical to 1.10.0.

### Changed

- **Mapping presence is evidence, never a gate.** The per-feature baseline
  errors over implementation mappings are gone. In their place `validate`
  reports two standing warnings, derived per feature from the artifacts that
  declare it: `IMPLEMENTATION_MAPPING_MISSING` (an active feature none of
  whose declaring artifacts maps to a configured source — specified but not
  yet implemented) and `IMPLEMENTATION_LEVEL_UNPROVEN` (a feature whose
  active UT, IT or ST specifications include none mapped to an implemented
  test — the level is specified but unproven). Closure decides reach;
  declaration decides ownership: a shared entity pulls sibling artifacts into
  a feature's closure, so an artifact proves only the features it names in
  `depends_on`, and one feature's mappings can never silence another
  feature's warnings. A feature validated on paper before anyone builds it is
  a legitimate permanent state whose warning is its durable record — which is
  what makes docs-first wiring, per-feature catch-up and per-segment
  implementation (code now, test levels later) all legal, each baseline
  naming honestly what remains.

### Added

- **`generated/implementation-coverage.md`.** The per-feature implementation
  dashboard, emitted only when implementation sources are configured so
  existing repositories see no drift: how much of each feature's own design
  surface and each test level is mapped, the latest matching execution per
  configured command across every flow, and the complement of active design
  artifacts nothing maps. Every state derives through the same predicates as
  the warnings, so the view can never disagree with a finding.
- **`generated/implementation-plan/<FTR-ID>.md`.** One work packet per active
  feature, same gating: the feature's closure in dependency order with its
  mappings and owning contract files, the ACCESS-CONTROL, SYSTEM-INVARIANTS
  and ERROR-CATALOG rows the closure references, the covering UT/IT/ST
  specifications with their verbatim test-case tables, and the configured
  verification commands — the join an implementer previously recomputed by
  hand from six documents.

## 1.10.0 - 2026-08-12

The research doctrine has said since 1.0.0 that a source discovered but not
opened cannot support a claim — and had no way to check it. Evidence was the
one layer of the method whose provenance rested entirely on model assertion,
while verification already backed every test run with an immutable record and
a hashed log. This release closes that asymmetry: optionally configured
self-hosted instruments (SearXNG, Firecrawl, camofox-browser) move retrieval
into the engine, which witnesses every fetch the way it witnesses every
execution. Nothing is mandatory: an unconfigured machine runs every flow
byte-identically to 1.9.0.

### Added

- **Engine-owned research retrieval behind a `research` command group.**
  `probe` reaches each configured instrument for real and reports the
  effective rung; `search` runs one SearXNG discovery pass; `fetch` inspects a
  page through Firecrawl, auto-escalating to camofox-browser on failure when
  configured; `map` enumerates a site's URLs; `crawl` captures a bounded
  subtree; `diff` deterministically compares two stored bodies of the same
  URL — reassessment's answer to "has this page changed?". Configuration is
  environment-only (`AI_SDLC_SEARXNG_URL`, `AI_SDLC_FIRECRAWL_URL`,
  `AI_SDLC_CAMOFOX_URL`, optional keys attached only when set);
  `sdlc.config.yaml` is untouched and `research_mode` remains
  `public-web-only` — the instruments change how pages are reached, never
  what counts as evidence. Numeric caps live in the git-ignored
  `.ai-saas-sdlc/research-tools.json`.
- **Retrieval provenance records, mirroring execution provenance.** Every
  discovery pass writes an immutable `QRY-*` record (query, pass class,
  engines, per-engine failures — an unresponsive engine is never mistaken for
  market silence); every page retrieval writes an immutable `RET-*` record
  plus a CRLF-normalized, size-capped body whose sha256 digest the record
  carries, under the committed `.ai-saas-sdlc/retrievals/`. Failed operations
  write records too, so degradation is derivable from the repository alone.
  Identity counters (`next_retrieval`, `next_query`) burn before any network
  work, the project lock is never held across HTTP, and the body is written
  before the record so a crash leaves an orphan validation reports rather
  than a record pointing at nothing. Evidence entries name their record with
  a `- Retrieval: RET-###` line; the Genesis evidence gate additionally
  requires at least one such citation when the flow retrieved through
  instruments, and is byte-identical to 1.9.0 when it did not.
- **Four warnings and four errors extend validation without reading the
  environment.** Warnings, never blocking: `EVD_RETRIEVAL_MISSING` (an
  engine-retrieved URL whose entry cites no record), `EVD_RETRIEVAL_BROKEN`
  (a cited record absent, failed or for a different URL),
  `RESEARCH_CAPABILITY_UNDERUSED` (instrument discovery surfaced a cited URL
  nothing retrieved) and `RETRIEVAL_RUNG_DEGRADED` (a failed retrieval no
  later success covers — the durable record of a fallback to host tools).
  Errors, matching the execution split: `RETRIEVAL_INVALID`,
  `RETRIEVAL_PROVENANCE_INVALID`, `RETRIEVAL_BODY_ORPHAN` and
  `RETRIEVAL_COUNTER_REUSED`. Validation derives everything from committed
  records and the ledger, so a repository validates identically on every
  machine, configured or not.
- **The method states the rung ladder.** The research protocol gains an
  *Instrument rungs* section: rung 0 is the host's own tools exactly as
  before; configured instruments must be used to their depth — the
  counter-evidence pass is mandatory with SearXNG, competitor profiling maps
  the site before reading it with Firecrawl, and a rung-2 failure escalates
  instead of becoming a coverage-limitation write-off with camofox — while
  the stopping rules are explicitly unchanged: better instruments raise what
  one pass can learn, never how many passes are required. Rung-3 constraints
  are absolute: public pages only, text only, no page-driven actions, no
  cookie import; Firecrawl `/extract` and `/search` never touch the evidence
  path. Genesis and Reassessment playbooks open with `research probe`, the
  four research-flow host adapters map the rungs, and
  `generated/research-coverage.md` gains retrieval, query-pass and
  instrument-usage sections — emitted only when records exist, so a rung-0
  repository's projection stays byte-identical.

### Compatibility

Fully additive; no migration. State written by earlier versions loads
unchanged (`next_retrieval`/`next_query` are optional and default to 1), the
baseline manifest schema is untouched, retrieval records never enter it, and
`.ai-saas-sdlc/retrievals/` appears lazily on first use in existing
repositories. With no instrument environment configured, flows, validation
output and generated projections are byte-identical to 1.9.0 — the rung-0
probe smoke test in the package check asserts exactly that. The updated
evidence-ledger example line and the fifteen-warning `VALIDATION-RULES` table
are pinned per repository and reach newly initialized repositories only;
playbooks, protocol and adapters are read from the installed plugin and reach
every repository on update. The optional non-MCP, engine-owned HTTP
integration stays inside the roadmap's exclusion list: no custom research
agents, no mandatory integrations, no new gates, stages or review loops.

## 1.9.0 - 2026-08-12

Five feature releases moved the engine and left the documentation behind it at
uneven distances — some files current, some frozen at the release that last
happened to touch them. A full audit of every reference doc, guide, playbook,
protocol and pinned system contract against the code found the drift, and
three defects hiding inside it: contracts that state rules the engine does not
implement are not merely stale, they instruct a flow to do something that
fails.

### Fixed

- **The decision pattern shipped frontmatter the engine rejects.** Pattern
  frontmatter is copied verbatim into the artifact it creates, and
  `architectural-decision.pattern.md` carried `status: proposed` — not one of
  the five legal artifact statuses — and no `adr_status` at all. Every
  `artifact create --type architectural_decision` therefore produced an
  artifact failing `STATUS_INVALID` and `ADR_STATUS_INVALID` the instant it
  existed. It now ships `status: draft` with `adr_status: proposed`, and a new
  test instantiates *every* scalable pattern and asserts the result validates,
  so no pattern can ship this defect again. Every earlier test hand-wrote ADR
  frontmatter, which is exactly why nothing caught it.
- **The lifecycle contract taught a vocabulary the engine has no notion of.**
  `ARTIFACT-LIFECYCLE` presented `proposed`, `rejected` and `generated` as
  artifact states; `rejected` exists nowhere in the engine, results are written
  `active`, and the two states the evolution playbook depends on —
  `deprecated` and `retired` — were missing from the table entirely. The
  state set now matches what validation accepts, `adr_status` is documented as
  the separate field it is, and the filled-foundation rule from 1.8.1 is stated
  where lifecycle is defined.
- **Genesis never activated the evidence ledger it fills.** The engine requires
  every discovery and product foundation, the ledger included, to be `active`
  before a Genesis baseline; the playbook's activation step named only the six
  synthesis documents, so the first close sequence failed on a mandatory
  foundation. The ledger is now named where it is filled.

### Changed

- **The method surface states the current contract.** The Inspect State
  playbook reported six of the eleven warnings and now reports all of them;
  Reconciliation gained sibling-file ownership, the oversized-spec check,
  platform declarations and the filled-foundation rule it had never been told
  about; test derivation gained `host_os`, `PLATFORM_EVIDENCE_CONTRADICTED`,
  `generated/platform-coverage.md` and the test-seam rule; both allocating
  protocols now state that an ID's AREA segment is permanent once baselined.
- **The pinned system contracts describe what a repository actually holds.**
  `VALIDATION-RULES` now separates errors from warnings and names all eleven
  with what each means; the glossary defines sibling contract file, platform
  target, evidence host token, platform coverage, runtime topology, area and
  checkpoint, and expands the artifact prefixes; document rules state the three
  type-specific frontmatter fields; and the config template shows the two
  optional keys — `platforms` and `areas` — that a repository could previously
  only discover by reading the reference docs.
- **The reference docs and guides cover the last five releases.** The flow
  reference gained the checkpoint model it never had; `docs build` is stated
  consistently everywhere as the inspector's one sanctioned write; the README's
  engine block lists every command and option; the feature guide states the two
  rules with no undo (add the sibling file before declaring ownership, and a
  sibling filename is permanent once baselined), replaces the DBML-only entity
  framing with persistence authority, and names `UT-CORE-*`; the lifecycle
  guide states that a committed platform is `active`, not `draft`.
- The pinned catalog version moves to `4` so `patterns list` reports which
  generation a repository holds.

### Compatibility

No engine code changed and no message, schema or validation rule changed:
existing repositories validate byte-identically. The corrected decision
pattern, lifecycle contract, validation rules, glossary, document rules and
config template are pinned per repository, so they reach newly initialized
repositories only, per the no-migration doctrine — an existing repository
keeps the catalog it pinned, including the broken decision pattern, and the
practical remedy there is to write the two frontmatter fields by hand when
creating an ADR. Playbooks, protocols, reference docs and guides are read from
the installed plugin, so every repository gets the corrected method as soon as
its plugin updates.

## 1.8.1 - 2026-08-12

A certification pass drove the two flows no current-generation repository had
ever run — Evidence Reassessment and Reconciliation — plus a cold-start build
review and a source audit of a real evidence ledger. The flows worked; the
review found method gaps the machine cannot see, and this patch writes the
three lessons into the method surface. No engine code changed.

### Fixed

- **A filled foundation leaves `draft` in the flow that fills it.** The
  evolution playbook now states it for `TEST-POLICY` above all: satisfy the
  completion contract and activate, because a draft artifact is not
  implementation authority and sits outside the active-content contracts. A
  real repository baselined with its governing test policy draft and
  machine-checked nowhere, and needed a Reconciliation to repair it.
- **A test seam that weakens a stated invariant is a recorded limitation.**
  The implementation section now requires naming any environment-variable or
  fixture seam in `TEST-POLICY` beside what it exists to test. A cold-start
  review read two silent seams as contradictions between the shipped build
  and its own access rules — which is exactly how any later reviewer would
  read them.
- **The feature guide states what a stage actually costs** — observed
  25–85 minutes and ~$10–45 per genesis/evolution stage, scaling with product
  size — and advises one `--until` stage per turn beyond small features.

### Compatibility

Playbook and guide text only: no engine change, no schema change, no message
change, no catalog change. Existing repositories validate byte-identically;
the new sentences reach sessions when their installed plugin updates.

## 1.8.0 - 2026-08-12

A real Product Evolution flow driven end to end on 1.7.0 surfaced four rough
edges — none a broken structure, each a place where the method let a defensible
wrong reading happen or a record drift from the truth. This release files those
edges down and adds a read-only browsable projection of the repository. It
opens no new dimension.

### Added

- **`docs build`.** Renders the current artifacts, relations and generated
  reports as a static, dependency-free HTML site: per-artifact pages with
  resolved ID links and reverse traceability, an interactive dependency graph,
  and status-filtered indexes. It is a projection for reading, never authority
  or evidence, and it is the one write Inspect State is permitted to make. It
  writes only its output directory (default `.ai-saas-sdlc/cache/site/`),
  refuses the project root, any managed content directory (`00-05`,
  `generated/`) and any non-empty directory it did not itself produce. The
  bundled Mermaid runtime that renders the graph is a build-time dependency
  shipped as a tracked asset under `dist/assets/`, so the site stays fully
  offline with no network fetch.

### Fixed

- **A committed-but-unproven platform is `active`, not `draft`.** The platform
  pattern and the evolution playbook now state it outright: a platform the
  design commits to but the running machine cannot yet prove stays `active`,
  and its unproven-ness lives in the evidence layer — the missing declaration,
  the `TEST-POLICY` note and the standing `PLATFORM_EVIDENCE_MISSING` warning.
  Left `draft`, an artifact created by the open change blocks that change's own
  baseline, which is exactly the dead end a real flow reached. Pattern-comment
  text only, so it reaches newly initialized repositories; no catalog version
  change.
- **A continued flow no longer keeps a stale stop.** `flow checkpoint` raises
  the recorded `target_stage` when a reached checkpoint passes it without a new
  `--until`. An explicit `--until` still wins, and a run-to-baseline flow (no
  target) never has one materialized. Without this, a flow resumed past its
  first turn's stop went on reporting a checkpoint it had already left.
- **The evidence warnings say the standing warning is the record.**
  `PLATFORM_EVIDENCE_MISSING` and `PLATFORM_EVIDENCE_CONTRADICTED` now end
  "…and let this warning stand as its durable record," so the `TEST-POLICY`
  escape hatch no longer reads as a way to make the warning disappear — it does
  not, by design.
- **The evolution playbook suggests the `areas` registry** at the point IDs
  gain stable area segments, so an opt-in namespace check that nothing pointed
  at is now actually reachable from a flow.
- The feature guides print `continue FLOW-*`, matching what `flow next` emits;
  they previously showed `continue CHG-*`.

### Compatibility

The RESULT renderer is unchanged, so every digest-locked result re-renders
identically and a pre-1.5.0 repository validates byte-for-byte as before. The
two warning messages changed text: a repository upgrading to 1.8.0 sees the new
wording, which carries no code, severity, file or verdict change — the finding
set is identical bar the message string. The checkpoint fix only corrects a
stale record field; it changes no stop behavior and no baseline outcome. No
pattern migration exists: the platform-pattern doctrine text reaches newly
initialized repositories only, exactly as prior pattern-text changes did.

## 1.7.0 - 2026-08-12

The 1.4.0–1.6.0 releases each opened a dimension — platform targets, platform
evidence, the authority surface — at the depth needed to be usable, and real
runs showed where usable stops short of checkable. A platform declaration had
no machine cross-check: the engine recorded `host.os` beside every declaration
but did not know a macOS target should expect `darwin`, so a wrong declaration
validated clean forever. And the platform debt a repository owed was visible
only as scattered warnings, never as one view. This release deepens the opened
dimensions without opening a new one.

### Added

- **A machine-checkable evidence-host token on platform targets.** A `PLT-*`
  artifact may declare `host_os` — the `process.platform` value its evidence
  records are expected to be observed under (`win32`, `darwin`, `linux`; an
  iOS target exercised from macOS machines declares `darwin`). The token is a
  declaration like `platforms:` itself, and the recorded host stays a machine
  fact; the two are still never merged. Automatic inference of the token from
  the executing machine was rejected because it would blur the
  declaration/observation boundary 1.5.0 established. Optional everywhere —
  an artifact without the field validates exactly as before.
- **`PLATFORM_EVIDENCE_CONTRADICTED` (warning).** When every recorded
  execution declaring a live target observed a host os different from the
  target's token, validate reports the aggregate contradiction. One matching
  observation clears it, and a record that reports no host observes nothing
  and cannot contradict. A warning, never an error: cross-compiled evidence
  may legitimately run elsewhere, and the standing warning is the durable
  record of that judgement. The check needs no configuration — records carry
  the declaration they were executed under, so a broken config cannot hide a
  contradicted claim.
- **`generated/platform-coverage.md`.** The projection the roadmap named at
  1.5.0 ships: per target — status, token, declaring commands, observed hosts
  and an evidence state; per declaring command — the latest matching execution
  with exit code, host and finish time; plus the declarations matching no live
  target. Every state is derived through the same predicates as the warnings,
  so the table cannot disagree with a finding. Emitted only when platform
  targets exist, so a repository without them sees no new file and no drift.

### Changed

- `verify --execute` resynchronizes generated projections after a completed
  run. Projections now derive from execution records, and without this a
  mid-flow `validate` would report `GENERATED_DRIFT` between `verify` and the
  close sequence's `refresh`. This mirrors `baseline create`, which already
  refreshes internally; it adds no gate and changes no flow.
- The evidence-matching predicate — same command identity, text, working
  directory and platform declaration — is one shared function used by the
  baseline verdict and the coverage projection alike, closing the class of
  drift 1.5.0 taught between duplicated predicates. The in-flow reuse check
  keeps its deliberate difference (source snapshot instead of cwd),
  documented at the shared definition.
- The command reference and inspect guide enumerate all eleven warnings.

### Compatibility

The RESULT renderer did not change by a single byte: no execution-record
field was added, and every digest-locked `RESULT-*` in existing repositories
re-renders identically. `host_os` is optional, allow-listed in both the
engine guard and the JSON schema, and deliberately absent from baseline
manifest rows and the editorial-sync comparison: it is a live declaration,
re-evaluated from artifacts and records on every validate, not baselined
truth. No pattern migration exists, as before — the pattern text documenting
`host_os` reaches newly initialized repositories only, while an existing
repository can still adopt the field by hand, because the check is
engine-side, not catalog-side. One upgrade consequence is deliberate: a
repository that already holds platform targets sees `platform-coverage.md`
reported as drift once — `validate` says `GENERATED_DRIFT` until the first
`refresh` materializes the file, and every close sequence begins with that
refresh. A repository without platform targets sees nothing.

## 1.6.0 - 2026-08-11

An assessment of the plugin against complex products — a desktop client with a
microservice backend — found the contract semantics ready and the authority
surface not. Subsystems, events, jobs and flows already spoke the language of
distributed systems, but every service shared one `openapi.yaml`, every store
was welded to one relational `schema.dbml`, nothing owned which subsystems
share a process, and the AREA segment inside every ID was checked by nobody.
The assessment also surfaced a provenance hole: a second file under
`03-design/interfaces/` was invisible — unscanned, unhashed, absent from the
graph and the baseline manifest — and a flow whose only change was adding one
closed as a *cancellation*. The same failure shape 1.5.0 fixed for platforms:
a claim that validates clean while silently untrue.

### Added

- **Sibling contract files are first-class artifacts.** `03-design/interfaces/*.yaml|yml`,
  `03-design/data/*.dbml` and `03-design/*.mmd` are discovered as contracts of
  the existing fixed types with filename-derived identities — `billing.yaml`
  becomes `WIRE-BILLING`, `analytics.dbml` becomes `SCHEMA-ANALYTICS`,
  `desktop.mmd` becomes `TRANSITIONS-DESKTOP` — hashed, graphed, baselined and
  protected exactly like the canonical three, which stay mandatory under their
  historical IDs. A new artifact type was deliberately rejected: these files
  are wire, schema and transition truth, and reusing the existing types means
  impact convergence, test selection and flow boundaries apply unchanged.
  Discovery also closes the invisibility hole — a flow that only adds a
  sibling file now refuses to close without its baseline instead of recording
  a cancellation.
- **Declared per-file ownership.** While a family holds one file, the engine
  derives ownership itself, exactly as before. With siblings present, each
  live `API-*`/`ENT-*`/`SCR-*` names its owning file in `depends_on`, and
  impact converges per file — a change to `billing.yaml` reaches the
  operations that declare it, never the whole surface. Always-auto fan-out
  was rejected because it makes every service change every service's problem,
  which is the singleton behavior scaled up rather than fixed. Add the file
  first and declare second, inside the same flow: an early declaration forms
  a dependency cycle with the auto-derived edge and is reported as one.
- **`WIRE_AUTHORITY_UNDECLARED`, `SCHEMA_AUTHORITY_UNDECLARED` and
  `TRANSITION_AUTHORITY_UNDECLARED` (warnings).** In a multi-file family, a
  live instance that names no owning file is a standing warning, never an
  error: an IPC-only operation and a client-local entity legitimately declare
  none, and the warning is the durable record of that state — the platform-
  evidence doctrine applied to authority files.
- **A persistence authority on every entity.** The entity pattern's mapping
  table demanded a DBML table and column, which forced document, key-value,
  event-sourced and client-local entities to fabricate relational mappings.
  The column is now the store-neutral `Store target`, and a required
  `Persistence authority:` line names the owner of the entity's physical
  shape — `PHYSICAL-SCHEMA` or a `SCHEMA-*` sibling, a `PLT-*` local-data
  row, or an explicit `none — <reason>`. Enforced through the existing
  catalog local-ID machinery; no engine code changed, and the pinned catalog
  version moves to `3` so `patterns list` reports which generation a
  repository holds.
- **Runtime topology in the architecture overview.** A required section now
  groups subsystems into runtime units and names the network boundaries and
  the contracts crossing them, as descriptive design truth — build, signing
  and deployment operations stay explicitly out of scope. A new artifact type
  was rejected here too: topology is one system-wide view, and the overview
  already owns system-wide boundaries; the subsystem pattern now points at
  the owner instead of merely disclaiming delivery topology.
- **An `areas` registry and `AREA_UNREGISTERED`.** `sdlc.config.yaml` accepts
  an optional `areas` list — schema_version stays 1, the same additive shape
  as the 1.5.0 `platforms` key. Declared, every live scalable ID that parses
  as `<PREFIX>-<AREA>-<NNN>` must name a registered area, longest segment
  first (`SUB-ORDERS-EU-001` demands `ORDERS-EU`); the violation is a
  warning, because a permanent ID cannot be renamed after baselining.
  Undeclared, IDs stay unconstrained.

### Changed

- Sibling interface files must parse as a YAML mapping, and the `3.1.0`
  dialect is demanded only of documents that carry an `openapi` key — an
  AsyncAPI or schema bundle is a legitimate hash-tracked contract, while a
  syntactically broken file is a structural defect. The canonical
  `openapi.yaml` checks are byte-identical to 1.5.0.
- Document rules, glossary, playbooks, protocols, guides and references state
  per-file authority — one interface file per surface, one `.dbml` per
  database, one `.mmd` per transition graph — and the command reference now
  enumerates all ten warnings. The README's pattern-type count regression
  (23, reintroduced by 1.5.0) is fixed at 24, and the timeline's missing
  `PLT` is restored.

### Compatibility

An old engine reading a 1.6.0-shaped repository does not discover sibling
files: they are unscanned, absent from snapshots and manifests, and a flow
whose only change is such a file closes as a cancellation again; declarations
targeting `WIRE-*`/`SCHEMA-*`/`TRANSITIONS-*` identities read as
`REFERENCE_BROKEN` errors. Upgrade the engine; do not strip declarations.
In the other direction, a 1.6.0 engine reads an existing repository
byte-identically: with one file per family the auto-derived edges, findings
and baseline rows are exactly the 1.5.0 output, no `areas` key means no
`AREA_UNREGISTERED`, and pinned catalogs keep validating unchanged — the
entity and architecture-overview contracts reach newly initialized
repositories only, per the no-migration doctrine. A sibling file's name is
its permanent identity once baselined: rename or deletion afterwards is
`BASELINED_ARTIFACT_DELETED`, so name files by their bounded scope before
baselining.

## 1.5.0 - 2026-08-11

1.4.0 gave platform targets a place to state per-platform verification
consequences, and left the engine unable to check them. A repository could run
its entire suite on Windows, validate clean and baseline while macOS, iOS and
Android had never executed once — the documentation promising, at every `V-*`
row, evidence the machine had no way to demand. The same failure shape as
oracle-placement drift: a claim that validates clean while silently untrue.

### Added

- **Platform evidence declarations.** A verification command that exercises a
  shipped platform now declares it in `sdlc.config.yaml`:
  `platforms: [PLT-WIN-001]`. The declaration is a human claim, in the same
  trust class as `implementation_sources`. Each execution copies the
  declaration into its record **beside** the machine-observed host
  (OS, release, architecture, Node version), and both appear in the rendered
  `RESULT-*` provenance. They are deliberately never merged: an Android
  declaration whose records always show a `win32` host is visible to any
  reviewer, which is what makes the claim auditable rather than decorative.

- **`PLATFORM_EVIDENCE_MISSING` and `PLATFORM_DECLARATION_UNKNOWN`
  (warnings).** The first names every live platform target no configured
  command declares evidence for — it fires even in a documentation-only
  repository, because a repository whose documents claim platforms while
  running nothing is exactly the one that needs the reminder. The second names
  a declaration pointing at no live platform target. Neither blocks; a platform
  no available machine can execute legitimately stays undeclared, recorded as
  unproven in `TEST-POLICY`.

- **Declare-after-run is not evidence.** An execution recorded before a
  `platforms` declaration was added does not satisfy that declaration: both
  the in-flow reuse check and the baseline verdict now compare the declaration,
  so adding one after the run reads as `not-run` and forces a re-execution
  whose record carries what was declared. Without this, mapping a platform
  after the fact would have baselined on records that never mentioned it.

- **OS entry points have owners.** A global shortcut, file association, deep
  link or tray action is a trigger in its `UC-*`/`FLOW-*`; its registration,
  conflict and denial behavior is a `PLT-*` capability row; a tray or menu-bar
  menu with real interaction structure is an `SCR-*` like any other stable
  surface. Solution formation states the split; test derivation gains the
  trigger/conflict/denial row. No new artifact type — the set decomposes
  cleanly into the three that exist.

### Changed

- A screen covers every form factor of its surface; materially different
  phone/tablet/desktop behavior splits into per-form-factor artifacts with
  their own IDs. Single-user installed products state their boundary as the
  OS user account or device — "not applicable, single-user product" with the
  boundary named is a complete access answer, not a gap. Access-rule test
  derivation says cross-boundary (tenant, account or device) rather than
  assuming tenancy.

### Compatibility

Old configurations and old execution records validate unchanged: the new
config key and both record fields are optional, and the result renderer emits
byte-identical output for records that lack them — the digest binding on every
immutable pre-1.5.0 `RESULT-*` still holds, verified against a copy of a real
repository with 36 executed results. In the other direction, **an execution
recorded by ≥1.5.0 reads as `EXECUTION_INVALID` under older engines; upgrade
the engine, do not repair the record** — the record is immutable provenance
and the failure heals on upgrade. Adopting declarations in an existing
repository is one Product Evolution whose only direct change is
`SDLC-CONFIG`; that satisfies the semantic-change gate. The warning proves the
*mapping* exists, not that evidence does — the existing
all-commands-before-baseline gate is what forces every mapped command to run.

## 1.4.0 - 2026-08-11

The method was never web-specific, but the catalog was. An assessment of the
plugin against desktop and mobile products found the engine and the four flows
fully neutral, UT/IT/ST neutral because they are defined by boundary rather than
protocol, and the design layer bound to the web: `API-*` was welded to an
OpenAPI operation, every backend unit specification had to be called `UT-API-*`,
and nothing owned platform constraints, operating-system permissions, install
and update behavior, or local data that must survive a version change.

### Added

- **`platform_target` (`PLT-*`, `03-design/platforms/`)** — one artifact per
  shipped platform or channel, owning what shipping there costs the product:
  platform constraints with their product consequence, capabilities and
  permissions with denial and revocation behavior, user-visible distribution,
  update and rollback behavior, local data with a cross-version rule or an
  explicit loss statement, and platform-conditional verification consequences.
  It deliberately does not own build pipelines, signing or deployment
  operations; that boundary is the same charter exclusion as before, and a
  desktop product's *update prompt* is product behavior while its *release
  pipeline* is not. Verification consequences cite upstream acceptance, rule,
  quality and invariant IDs only — never a test case that does not exist yet,
  which is the defect `CASE_REFERENCE_BROKEN` was added to catch in 1.3.0.

- **`CONTENT_CONTRACT_UNPINNED` (error)** — a live artifact whose type the
  engine knows but the repository's pinned catalog predates. Until now such an
  artifact fell through every content contract silently: no headings, no
  tables, no placeholder check, and `validate` still reported success. Reporting
  nothing was worse than reporting an unknown type, because the artifact looked
  validated and was not.

### Changed

- **`unit_test_backend` accepts `UT-CORE-*` as well as `UT-API-*`**, same type
  and same directory. Core or domain logic that no platform owns had to be
  filed under a name that claimed it sat behind an API.

- **`API-*` covers any invocable operation** — an OpenAPI operation, an IPC or
  bridge command, or a CLI entry. For HTTP, OpenAPI remains the wire authority
  and nothing changes. For everything else the `API-*` document now owns the
  full invocation contract including payload shape, because no other authority
  exists. `openapi.yaml`, `schema.dbml` and `screen-transitions.mmd` remain
  required files: an empty `paths` map is now the *declared* state for a product
  with no HTTP surface rather than an oversight.

- **Platform variance is a viewpoint inside UT/IT/ST, not a fourth level.** An
  execution proves the platform it ran on; `TEST-POLICY` now records which
  platforms the recorded executions covered and which shipped platforms remain
  unproven. Test derivation gains rows for platform constraints, permission
  denial, update and local-data migration, and the IPC/bridge/CLI boundary.

- Solution formation gains offline and local-first divergence, reconvergence,
  and multi-device conflict resolution as shared-state questions; screen, job
  and behavior language no longer assumes a web route or a request.

### Compatibility

An existing repository stays on the pattern catalog it pinned at
initialization. No pattern migration exists, so `platform_target` and the
widened backend-unit contract reach newly initialized projects only; an
existing repository keeps validating and baselining exactly as before. The
pinned catalog version moved to `2` so that `patterns list --json` reports
which generation a repository actually holds. In the other direction, a 1.3.x
engine reading a 1.4.0 repository reports `ARTIFACT_TYPE_UNKNOWN` for `PLT-*`
and an invalid location for `UT-CORE-*`; that is expected version skew, and the
engine pointer records which engine initialized the repository.

## 1.3.5 - 2026-08-11

The question-repayment obligation was keyed to the wrong signal, and the first
real baseline after 1.3.0 made that obvious.

### Changed

- **A question is in a reassessment's scope when its evidence bears on the
  answer, not when the engine calls the question old.** The obligation shipped
  in 1.3.0 fired only on `QUESTION_STALE`, and staleness needs three baselines
  of history to exist. A repository adopting this release stamps every open
  question at its next baseline, so on the run that verified the mechanism all
  thirty questions read as newborn and the obligation could not fire until three
  baselines later — on a ledger that had been growing, unanswered, for six.

  Staleness is now what makes the engine *notice* a question nobody returned to.
  What creates the obligation is the evidence: a question this flow could have
  answered and did not is a debt whether it was raised six baselines ago or last
  week. Reassessment still answers one question with new sources — questions
  outside its evidence stay open and undiscussed, because a review pass over the
  whole ledger is not a flow.

- An age of `null` is now stated to mean "the ledger predates age tracking", not
  "the question is new".

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
