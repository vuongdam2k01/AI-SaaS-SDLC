# Test Derivation Protocol

Testing has exactly three levels: UT, IT and ST. Security, privacy, performance, reliability, accessibility and AI behavior are viewpoints applied inside these levels, not additional test document families.

## Inputs

- changed/affected feature acceptance IDs;
- UC alternate/error paths and FLOW compensation paths;
- access rules, invariants and error codes;
- screen/component states;
- API/entity/subsystem/integration/job/event contracts and their owning interface/schema files;
- platform-target constraints, permissions, update behavior and local-data rules;
- runtime units and the contracts crossing their network boundaries;
- impact closure and existing test specifications;
- configured implementation paths and verification commands.

## Level allocation

| Level | Proves | Use for | Do not use for |
|---|---|---|---|
| UT | One backend or platform-neutral core processing unit, frontend screen/component or job with controlled collaborators | Pure decisions, validation, state reducers, formatting, error mapping, retry policy under controlled dependencies | Real provider, persistence or complete journey claims |
| IT | A real boundary between components, persistence, provider adapter, event or job processing | API-database, component integration, schema mapping, webhook/event/job behavior, sandbox/provider adapter | Whole product journey or isolated pure function |
| ST | Complete user-visible journey and cross-feature behavior | Actor goal, permissions, feature interaction, recovery/compensation, end-to-end acceptance and non-regression | Exhaustive internal permutations already covered below |

Every active feature requires at least one downstream UT, IT and ST specification under the current baseline contract. Keep each minimal and meaningful; do not duplicate the same case at all levels.

**Every business rule a live feature declares must be claimed by at least one specification.** Choosing which level holds a rule is a derivation judgement made from the table below; having a level at all is a contract, not a judgement. Claim a rule by writing its qualified reference `FTR-<AREA>-<NNN>#BR-<NN>` in the specification, or its bare `BR-<NN>` in a specification that already declares the owning feature in `depends_on`. `ENGINE refresh` derives `generated/rule-coverage.md` from those references and `ENGINE validate` reports `RULE_UNVERIFIED` for every rule nothing claims. Treat that warning as work to do, not noise: an unclaimed rule is a commitment no execution can ever fail on.

Instantiate new specifications with `ENGINE artifact create` using `unit_test_backend`, `unit_test_frontend`, `unit_test_job`, `integration_test` or `system_test`. Backend and platform-neutral core units share `unit_test_backend`: use `UT-API-*` for a unit that sits behind an invocable operation and `UT-CORE-*` for domain or core logic that no platform owns. Never instantiate `test_result`; only verified execution may generate it.

### Level ownership

Which level holds a rule is a judgement, but it is not a free one. Derive it in this order and stop at the first answer:

1. **The owning level is the lowest level whose boundary can observe the rule being violated.** If a controlled unit can produce the wrong answer, the rule belongs to UT. If the violation only appears once a real boundary is crossed — persistence, provider, event, job — it belongs to IT. If it only appears as a wrong outcome for an actor completing a journey, it belongs to ST.
2. **Add a second claimant only for a reason you can name**: the rule crosses a real boundary that the lower level controls away (IT), or its violation is directly visible to a user in a journey (ST). Claiming a rule at every level for reassurance is duplication, and duplication is what section *Level allocation* forbids.
3. **An existing claim does not move.** Once a rule is claimed, re-derivation keeps that claim unless a contract changed, the boundary changed, or an execution failed. Relocating unclaimed-but-unchanged rules produces a different coverage map for the same product on every run; that is drift, not improvement. When a claim does move, say which of the three triggers moved it.

`generated/rule-coverage.md` shows the current placement. Read it before deriving, not after.

## Specification size and splitting

One specification describes one boundary. It stops being a specification when it becomes the place every new case is appended to.

- one `IT-*` per integration boundary — the participant pair and contract named in its *Integration boundary* table, not per feature and never one per product;
- one `ST-*` per user-visible journey — one actor goal from start to observable outcome;
- `UT-*` follows its unit and splits with it.

`ENGINE validate` reports `SPEC_OVERSIZED` when a live `IT-*` or `ST-*` exceeds the case threshold. Treat it as work to do at the next `tests` checkpoint that touches the file:

1. split along the axis the warning names — integration boundary for `IT-*`, journey for `ST-*`;
2. instantiate the new specification with `ENGINE artifact create`, never by copying the file;
3. **keep case IDs stable**: a case that moves keeps its `TC-NN` inside its new document, and rule and AC references move with it;
4. declare `depends_on` for the new specification and leave the original's remaining references intact;
5. update implementation mappings for both documents when sources are configured.

Splitting is not a rewrite. A split that changes what the cases assert is a change of verification, and belongs to the derivation step that changed the behavior. If the warning fires on a file the current change does not touch, record it in `QUESTIONS` rather than opening unrelated work.

An existing specification whose cases are already bound to executed results is not renumbered. `RESULT-*` records name case IDs that were actually run, so moving those IDs would orphan real evidence. Split forward — new boundaries get new specifications — and record the deferral and its reason in `TEST-POLICY`.

### Referring to a case that does not exist yet

Never write a qualified case reference — `IT-X#TC-NN` — for a case you have not yet created. Refer to the specification, the acceptance criterion or the rule until the case exists, then name it. `ENGINE validate` reports `CASE_REFERENCE_BROKEN` for every qualified reference naming a case its specification does not declare.

This matters most for anything that becomes immutable. An accepted ADR baselined with a reference to a case that was later written into a different specification cannot be corrected in place, and a successor ADR for a stale cross-reference is disproportionate. Order the work so the cases exist first, or cite the specification and not the case.

## Derivation map

| Source | Required test consequence |
|---|---|
| `AC-*` | At least one case proves the Given/When/Then oracle by reference |
| `BR-*` | At least one case at one level claims the rule by reference; a rule with no claimant is a coverage defect |
| UC alternate/error path | Case proves path selection and observable result |
| FLOW compensation/cross-feature path | ST or IT proves state restoration/continuation |
| Access-control rule | Denial and cross-boundary case — tenant, account or device — at the lowest real enforcing level plus ST where user-visible |
| System invariant | Boundary/property cases and at least one integration/system proof when it spans components |
| Error-catalog code | Trigger, stable mapping, user-visible recovery and non-leakage |
| Shared write/concurrency rule | Interleaving/duplicate/idempotency case at IT; ST if the loser/user behavior matters |
| Integration degradation | Timeout/retry/quota/signature/fallback case, normally IT, plus ST for visible degraded behavior |
| Job/event contract | Duplicate, ordering, retry, cancellation/replay and terminal-failure cases |
| Subsystem quality budget | Deterministic fixture/metric or declared evaluation case at the appropriate level |
| Platform constraint (`PLT-*` C-*) | Case proves the constrained behavior at the boundary the constraint acts on, normally IT, or ST when the constraint is visible to the actor |
| Platform permission (`PLT-*` P-*) | Denial and revocation case at the lowest level that can observe the refusal, plus ST where the degraded behavior is user-visible |
| Platform update or local-data rule (`PLT-*` D-*/M-*) | Cross-version data survival or declared-loss case at IT; ST when the upgrade behavior itself is user-visible |
| IPC, bridge or CLI boundary | Contract case at IT exercising the real invocation boundary, with the same participant discipline as any other real boundary |
| OS entry point (global shortcut, file association, deep link, tray action) | Trigger, conflict and denial cases at the level that observes the refusal; ST where the entry starts an actor journey |

## Test artifact content

Each `UT-*`, `IT-*` or `ST-*` declares:

- permanent case IDs and upstream artifact/AC/error/invariant IDs;
- boundary and what is controlled versus real;
- setup/data/environment and cleanup;
- action/sequence and exact observable assertions;
- applicable failure/degradation/recovery behavior;
- quality viewpoints that materially change the oracle;
- implementation mapping when sources are configured.

Avoid expected results such as “works”, “valid” or “correct”. State returned/persisted/emitted/visible state precisely enough to implement an automated check.

## Viewpoints

Apply only where relevant:

- security/privacy: authorization, tenant isolation, secret/PII exposure, retention/deletion;
- performance/reliability: explicit budget, timeout, retry, load/concurrency and graceful degradation;
- accessibility: keyboard/focus/labels/contrast for UI, stable machine-readable errors/lifecycle for headless interfaces;
- AI behavior: schema/grounding/quality/refusal/cost/latency/pinning/human-control based on `SUB-*` contracts;
- platform variance: apply the platform-conditional claims a `PLT-*` records inside the existing UT/IT/ST levels. Execution evidence is produced on one machine, so one execution proves one platform. Declare which platform targets a verification command produces evidence for with `platforms: [PLT-...]` on the command in `sdlc.config.yaml`; the engine copies the declaration into each execution record beside the observed host, and `ENGINE validate` reports `PLATFORM_EVIDENCE_MISSING` for a live platform target no command declares and `PLATFORM_DECLARATION_UNKNOWN` for a declaration naming no live target. The declaration is a human claim and the host is a machine fact, kept separate on purpose: a command declaring Android whose records forever show a win32 host is visible to any reviewer. A shipped platform that genuinely cannot be executed stays undeclared, with the limitation recorded in `TEST-POLICY`. A target may additionally declare the host its evidence is expected under — the optional `host_os` frontmatter token on the `PLT-*` artifact (`win32`, `darwin`, `linux`; an iOS target exercised from macOS machines declares `darwin`) — and `ENGINE validate` reports `PLATFORM_EVIDENCE_CONTRADICTED` when every recorded execution declaring that target observed a different host. Once any platform target exists, `generated/platform-coverage.md` joins targets, declaring commands, latest matching executions and observed hosts into the one view to read before claiming a platform is proven. Platform coverage is a limitation to state, never a fourth test level.

Do not invent an SLA or evaluation threshold while writing a test. Route missing product/design criteria to `QUESTIONS` or the active issue.

A controlled test seam — an environment variable, a fixture hook, an injectable provider — that weakens a stated invariant or access rule is a limitation to record in `TEST-POLICY` beside what it exists to test, never a silent property of the shipped build. A seam nothing records reads as a contradiction between the build and its own contracts to any later reviewer.

## Regression selection and execution

1. Use impact closure to retain every existing test whose upstream contract is affected or verify-only.
2. Run `tests select --json` after test relationships are current.
3. When configured commands exist, execute only through `verify --unit|--integration|--system|--all --execute`; never improvise shell commands.
4. The current baseline implementation requires every configured verification command to have an execution in Evolution/Reconciliation, so use `verify --all --execute` before baseline creation when any commands are configured.
5. A specification is not a result. Only an `EXEC-*` record can produce `RESULT-*`; never author results manually.
6. If no implementation source/command exists, state `not-configured`. Do not simulate a pass.

## Completion

Test derivation is complete when every active affected feature has traceable UT/IT/ST, every selected old regression remains covered, all material error/access/invariant/degradation behavior has an oracle, and implementation mappings exist where configured.

Re-enter only after a changed acceptance/design contract, newly affected dependency, inspected implementation change or execution failure. A prose review of unchanged cases is not a legal trigger.
