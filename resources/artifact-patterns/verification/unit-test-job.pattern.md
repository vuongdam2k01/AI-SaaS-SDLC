---
id: {{ID}}
artifact_type: unit_test_job
title: {{TITLE}}
status: draft
created_by_change: {{CREATED_BY_CHANGE}}
depends_on: [TEST-POLICY]
decisions: []
implementation: []
supersedes:
---

# {{ID}} — {{TITLE}}

<!-- Contract: specifies deterministic unit verification for one job handler's processing, retry classification, idempotency, and state transitions in isolation. It is not queue-provider, real database, external-provider, or multi-consumer proof. Create when JOB rules or failure branches need isolated evidence. ID is UT-JOB-<AREA>-<NNN>; path is 04-verification/unit-tests/jobs/<ID>.md. This artifact owns test intent and case IDs; JOB/ENT/EVT/INT artifacts own behavior. Consumers: test implementation, results, issues, and closure. Detail rule: the consumer is writing test code with the job and event contracts open, so state message shape as a requirement rather than a payload, and name the side effects that must not repeat. Lifecycle: draft -> active -> superseded. -->

## Purpose and boundary

- Unit under test: <job handler symbol>
- Isolation boundary: <queue, persistence, provider, clock controls>
- Behavior proven: <JOB local IDs>
- Non-purpose: <actual delivery, transaction, or external interoperability claims>

## Target and references

| Reference type | Artifact and local IDs | Why authoritative |
|---|---|---|
| Behavior | <FTR/JOB/ENT/EVT/INT/ERROR/INV IDs> | <processing/failure/idempotency rule> |
| Source | <repository-relative path and symbol> | <unit under test> |

## Included behavior

- Eligibility and processing states: <JOB P IDs>
- Duplicate and concurrency classification: <rules>
- Retryable and terminal failures: <JOB F IDs>
- Emitted results and unchanged-state guarantees: <EVT/ENT/JOB IDs>

## Explicit exclusions

| Local ID | Excluded claim | Reason unit evidence is insufficient | Required handoff |
|---|---|---|---|
| EX-01 | <queue delivery, database atomicity, provider contract, or cross-consumer effect> | <boundary not exercised> | <IT or ST ID, or required new spec> |
<!-- An exclusion is a handoff, not a deletion: the receiving specification cites this row back as `<this ID>#EX-NN`. A claim this unit cannot prove and no row names is a silent gap. -->

## Test data and isolation

- Message construction: <valid, boundary, duplicate, stale cases>
- Controlled collaborators: <stores, producers, providers, time/randomness>
- Attempt and retry simulation: <deterministic strategy>
- State reset: <case independence>
- Prohibited evidence: <stubs that bypass idempotency or state logic>

State the data *requirement* a case needs, not the literal values an implementer will choose — "a message whose deduplication key repeats an already-processed one", not one specific payload. A constraint stays true when the fixture changes; a copied value silently rots into a second, competing authority.

## Test cases

| Local ID | Reference IDs | Setup | Stimulus | Expected result | Unchanged-state assertion |
|---|---|---|---|---|---|
| TC-01 | <AC/JOB P/F/ENT/EVT/ERROR IDs> | <message and state> | <handler invocation> | <state/event/retry outcome> | <writes/events that must not occur> |

## Implementation mapping

| Case IDs | Test path | Test name or symbol | Production symbol |
|---|---|---|---|
| <TC IDs> | <repository-relative test path> | <test name> | <job symbol> |

## Completion contract

- [ ] Cases cover eligible, ineligible, duplicate, retryable, exhausted, and malformed paths when applicable.
- [ ] State transitions, emitted events, attempt classification, and unchanged-state guarantees are exact.
- [ ] Isolation does not replace processing or idempotency logic under test.
- [ ] Every queue, transaction, provider, and cross-consumer exclusion has a stable local ID and an IT/ST handoff.
- [ ] Every case maps to executable tests and later engine-produced result evidence.
