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

<!-- Contract: specifies deterministic unit verification for one job handler's processing, retry classification, idempotency, and state transitions in isolation. It is not queue-provider, real database, external-provider, or multi-consumer proof. Create when JOB rules or failure branches need isolated evidence. ID is UT-JOB-<AREA>-<NNN>; path is 04-verification/unit-tests/jobs/<ID>.md. This artifact owns test intent and case IDs; JOB/ENT/EVT/INT artifacts own behavior. Consumers: test implementation, results, issues, and closure. Lifecycle: draft -> active -> superseded. -->

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

| Excluded claim | Reason unit evidence is insufficient | Required handoff |
|---|---|---|
| <queue delivery, database atomicity, provider contract, or cross-consumer effect> | <boundary not exercised> | <IT or ST ID, or required new spec> |

## Test data and isolation

- Message construction: <valid, boundary, duplicate, stale cases>
- Controlled collaborators: <stores, producers, providers, time/randomness>
- Attempt and retry simulation: <deterministic strategy>
- State reset: <case independence>
- Prohibited evidence: <stubs that bypass idempotency or state logic>

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
- [ ] Queue, transaction, provider, and cross-consumer exclusions have IT/ST handoffs.
- [ ] Every case maps to executable tests and later engine-produced result evidence.
