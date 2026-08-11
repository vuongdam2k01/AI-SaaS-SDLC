# Impact Analysis Protocol

Use this protocol in Product Evolution and Reconciliation. Impact is computed from the active baseline and current artifact relationships, never from conversation memory or a flat list of recently edited files.

## Inputs

- active baseline manifest;
- active flow/change record;
- current artifact graph and generated indexes;
- configured implementation-source snapshots;
- direct documentation/contract/code changes observed so far.

## Engine observations

Run `impact --json` after the first canonical change creates a meaningful diff. Treat its fields as structural facts:

- `direct`: artifacts whose identity, content or declared relationships differ from the active baseline;
- `affected`: reverse dependency closure, including convergence through shared contracts;
- `stale`: artifacts whose stored assumptions/coverage may no longer match their upstream source.

Run it again after adding or removing design/test relationships. Removed dependencies, shared writes and supersession edges still matter because the engine compares current and prior baseline graphs.

## Closure method

1. Seed the closure with direct artifact changes and implementation files implicated by the intent/failure.
2. Follow reverse `depends_on`, `decision`, `writes_to` and `supersedes` relationships.
3. Add consumers of changed fixed contracts: interface files, DBML files and transition graphs. A family with sibling files converges per owning file through declared `depends_on` edges rather than across the whole surface.
4. Include old features reached through a shared entity, component, subsystem, API, integration, job, event, access rule, invariant or accepted ADR.
5. Include existing UT/IT/ST that verify any reached contract.
6. Mark only genuinely affected artifacts for modification; reading/verification does not imply rewriting.

## Convergence-node questions

| Changed node | Questions that close degradation risk |
|---|---|
| Entity/store | Do old fields/states/migrations/retention still hold? Which features write it? |
| API/interface file | Are old callers, errors, authorization, idempotency and compatibility preserved? Which operations declare the changed file as their wire authority? |
| Component/screen | Are old consumers, states, accessibility and transitions preserved? |
| Subsystem | Are quality, cost, latency, pinning and degradation budgets still met? |
| Runtime topology | Did a unit gain or lose a subsystem? Did a contract start or stop crossing a network boundary? Which integration tests exercise the moved boundary? |
| Integration | Do quota, timeout, retry, webhook and fallback changes affect old flows? |
| Job/event | Do ordering, duplication, cancellation, replay and consumer compatibility hold? |
| Platform target | Do constraints, permission denials, update/rollback and local-data rules still hold on every shipped platform? Which behavior now degrades on one platform only? |
| Access/invariant | Can any old actor now read/write/transition something previously prohibited? |
| ADR | Which artifacts depended on the old decision and require migration or re-verification? |

For every multi-writer target, explicitly resolve concurrency, ordering, idempotency, conflict visibility, undo/compensation and invariant consequences. “No code in this feature changed” is not proof that an old feature cannot degrade.

## Classify affected items

- `modify`: contract must change to implement/repair the intent;
- `verify-only`: contract should remain but regression must prove it;
- `deprecate/retire`: behavior is intentionally leaving the product;
- `stale-question`: dependency is structurally reached but semantic consequence needs a material decision;
- `not-affected`: inspected and ruled out with a concrete reason.

Store semantic decisions in canonical artifacts/issues, not in generated impact projections.

## Test selection

Run `tests select --json` after the closure stabilizes. Preserve existing regression tests for reached artifacts and add tests for new acceptance/error/invariant obligations. Do not delete an old test merely because the changed feature has a new test.

## Limits and stop condition

The graph proves declared relationships and coverage, not semantic correctness. Missing relationships discovered during analysis must be repaired, which may expand the closure once.

Stop when:

- all direct seeds and reverse consumers are classified;
- convergence-node questions have explicit answers or one consolidated material question;
- required existing regression tests are selected;
- no unresolved broken reference or undeclared shared write remains.

Re-enter only after a new canonical relationship, code diff, execution result, user decision or concrete contradiction. Do not repeatedly recalculate an unchanged graph to seek a different answer.
