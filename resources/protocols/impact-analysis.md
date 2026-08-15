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
- `affected`: reverse dependency closure, including convergence through shared contracts — what to read;
- `stale`: artifacts whose stored assumptions/coverage may no longer match their upstream source;
- `ripple`: the subset this change put at risk rather than merely reached — consumers of what it revised, and co-owners of a shared target it began writing. Prerequisites cited by something the change created are excluded, because nothing they say has moved. This is the set that owes a decision.

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

Every member of `ripple` takes exactly one decision, recorded through the engine:

```text
ENGINE impact classify --id <ID> --as <label> [--reason "<why>"] --json
```

- `modify`: contract must change to implement/repair the intent. Editing the artifact in this flow *is* this decision; a direct change needs no classification and the engine refuses one.
- `verify-only`: contract should remain but regression must prove it;
- `deprecate`: behavior is intentionally leaving the product, whole-artifact or rule-level;
- `stale-question`: structurally reached, but the semantic consequence needs a material decision — record the decision itself in `QUESTIONS`;
- `not-affected`: inspected and ruled out. `--reason` is required, because ruling a reached artifact out is only a decision when the ground for it is written down.

The label is a machine-readable record of *that a decision was made*; the substance of the decision still belongs in the canonical artifacts, the issue, or `QUESTIONS`. Never in generated impact projections — `generated/change-impact/<CHG-ID>.md` renders the ledger and is not where it lives.

`ENGINE validate` reports `IMPACT_UNCLASSIFIED` for every ripple member with no decision, and keeps reporting it after the flow closes for as long as the artifact stays untouched. That standing warning is the durable record of an unserviced ripple; a later change may answer it with the same verb.

## Test selection

Run `tests select --json` after the closure stabilizes. Preserve existing regression tests for reached artifacts and add tests for new acceptance/error/invariant obligations. Do not delete an old test merely because the changed feature has a new test.

Selection is an obligation, not evidence that anything ran. After executing, `ENGINE validate` reports `SPEC_EXECUTION_UNATTRIBUTED` for every selected specification no ingested report attributes a case to — which includes a command that declares no report at all. Close it by declaring the report and repairing the mapping rows, or let it stand as the recorded distance between what was selected and what was proven.

## Limits and stop condition

The graph proves declared relationships and coverage, not semantic correctness. Missing relationships discovered during analysis must be repaired, which may expand the closure once.

Stop when:

- all direct seeds and reverse consumers are classified — `IMPACT_UNCLASSIFIED` lists whatever remains, so this is observable rather than asserted;
- convergence-node questions have explicit answers or one consolidated material question;
- required existing regression tests are selected;
- no unresolved broken reference or undeclared shared write remains.

Re-enter only after a new canonical relationship, code diff, execution result, user decision or concrete contradiction. Do not repeatedly recalculate an unchanged graph to seek a different answer.
