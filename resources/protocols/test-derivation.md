# Test Derivation Protocol

Testing has exactly three levels: UT, IT and ST. Security, privacy, performance, reliability, accessibility and AI behavior are viewpoints applied inside these levels, not additional test document families.

## Inputs

- changed/affected feature acceptance IDs;
- UC alternate/error paths and FLOW compensation paths;
- access rules, invariants and error codes;
- screen/component states;
- API/entity/subsystem/integration/job/event contracts;
- impact closure and existing test specifications;
- configured implementation paths and verification commands.

## Level allocation

| Level | Proves | Use for | Do not use for |
|---|---|---|---|
| UT | One backend processing unit, frontend screen/component or job with controlled collaborators | Pure decisions, validation, state reducers, formatting, error mapping, retry policy under controlled dependencies | Real provider, persistence or complete journey claims |
| IT | A real boundary between components, persistence, provider adapter, event or job processing | API-database, component integration, schema mapping, webhook/event/job behavior, sandbox/provider adapter | Whole product journey or isolated pure function |
| ST | Complete user-visible journey and cross-feature behavior | Actor goal, permissions, feature interaction, recovery/compensation, end-to-end acceptance and non-regression | Exhaustive internal permutations already covered below |

Every active feature requires at least one downstream UT, IT and ST specification under the current baseline contract. Keep each minimal and meaningful; do not duplicate the same case at all levels.

Instantiate new specifications with `ENGINE artifact create` using `unit_test_backend`, `unit_test_frontend`, `unit_test_job`, `integration_test` or `system_test`. Never instantiate `test_result`; only verified execution may generate it.

## Derivation map

| Source | Required test consequence |
|---|---|
| `AC-*` | At least one case proves the Given/When/Then oracle by reference |
| UC alternate/error path | Case proves path selection and observable result |
| FLOW compensation/cross-feature path | ST or IT proves state restoration/continuation |
| Access-control rule | Denial and cross-tenant boundary at the lowest real enforcing level plus ST where user-visible |
| System invariant | Boundary/property cases and at least one integration/system proof when it spans components |
| Error-catalog code | Trigger, stable mapping, user-visible recovery and non-leakage |
| Shared write/concurrency rule | Interleaving/duplicate/idempotency case at IT; ST if the loser/user behavior matters |
| Integration degradation | Timeout/retry/quota/signature/fallback case, normally IT, plus ST for visible degraded behavior |
| Job/event contract | Duplicate, ordering, retry, cancellation/replay and terminal-failure cases |
| Subsystem quality budget | Deterministic fixture/metric or declared evaluation case at the appropriate level |

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
- AI behavior: schema/grounding/quality/refusal/cost/latency/pinning/human-control based on `SUB-*` contracts.

Do not invent an SLA or evaluation threshold while writing a test. Route missing product/design criteria to `QUESTIONS` or the active issue.

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
