---
id: {{ID}}
artifact_type: job
title: {{TITLE}}
status: draft
created_by_change: {{CREATED_BY_CHANGE}}
depends_on: [ARCHITECTURE-OVERVIEW, SYSTEM-INVARIANTS, ERROR-CATALOG]
decisions: []
writes_to: []
implementation: []
supersedes:
---

# {{ID}} — {{TITLE}}

<!-- Contract: specifies deferred or message-driven processing with explicit trigger, state, retry, and idempotency semantics. It is not a platform scheduling guide, operational runbook, synchronous API contract, or delivery configuration. Create when work outlives a caller interaction or must be retried/serialized independently. ID is JOB-<AREA>-<NNN>; path is 03-design/jobs/<ID>.md. This artifact owns job processing semantics; EVT owns event shape, INT owns external boundaries, and DBML/ENT own data. Consumers: API/SUB/EVT designs, UT-JOB, IT/ST, and implementation. Detail rule: the consumer is implementing and verifying deferred work, so state trigger eligibility, commit boundaries, retry and idempotency semantics, and leave scheduler configuration and deployment topology out entirely. Lifecycle: draft -> active -> superseded. -->

## Purpose and boundary

- Processing outcome: <observable state change or emitted result>
- Included responsibility: <scope>
- Excluded responsibility: <scope>
- Enqueuers and consumers: <artifact IDs>

## Trigger and messages

| Trigger | Source | Message/event contract | Eligibility condition | Duplicate identity |
|---|---|---|---|---|
| <condition> | <API/EVT/SUB ID> | <EVT or named internal contract> | <state/rule> | <stable key> |

## Inputs and outputs

| Direction | Data or state | Authority | Required | Validation or guarantee |
|---|---|---|---|---|
| Input | <data/state> | <ENT/EVT/INT ID> | <yes/no> | <rule> |
| Output | <data/state/event> | <ENT/EVT ID> | <condition> | <guarantee> |

## Processing

| Local ID | Step | Input state | Rule or dependency | Output state | Commit boundary |
|---|---|---|---|---|---|
| P-01 | <step> | <state> | <BR/INV/ENT/INT reference> | <state> | <before/inside/after commit> |

## Concurrency and idempotency

| Local ID | Concern | Rule | Applies to | Observable consequence |
|---|---|---|---|---|
| CC-01 | concurrency scope | <key or partition> | <P IDs> | <what a second concurrent run observes> |
| CC-02 | conflict behavior | <serialize, reject, merge, or safe no-op> | <P IDs> | <loser's observable outcome> |
| CC-03 | idempotency key and retention | <source, scope, lifetime> | <trigger> | <observable on replay after retention> |
| CC-04 | duplicate delivery behavior | <observable result and side-effect guarantee> | <trigger> | <side effects a case can count> |
| CC-05 | ordering guarantee | <required ordering or explicit absence> | <trigger> | <observable out-of-order outcome> |
<!-- Keep one row per concern that applies; state an explicit not-applicable rule rather than deleting a row, because a silent omission and a deliberate exemption are indistinguishable to a later reader. -->

## Retry and failure

| Local ID | Failure condition | Retry policy | Exhausted behavior | State guarantee | Error code |
|---|---|---|---|---|---|
| F-01 | <condition> | <attempt/backoff eligibility> | <terminal/reconciliation behavior> | <state> | <ERROR code> |

## Transactions and side effects

| Processing IDs | Transaction scope | Write or emitted event | Timing | Partial-failure behavior |
|---|---|---|---|---|
| <P IDs> | <boundary> | <ENT/EVT/INT ID> | <commit relation> | <rollback/retry/reconcile> |

## Implementation mapping

| Processing or failure IDs | Source path | Symbol | Verification IDs |
|---|---|---|---|
| <P/F IDs> | <repository-relative path> | <handler/worker symbol> | <UT-JOB/IT/ST IDs and cases> |

## Completion contract

- [ ] Trigger, eligibility, message authority, and duplicate identity are explicit.
- [ ] Processing states and commit boundaries are deterministic.
- [ ] Concurrency, ordering, idempotency, retry, and exhausted behavior are defined.
- [ ] Every partial failure has a state guarantee and bounded recovery behavior.
- [ ] Writes/events match `writes_to`, entity/event authorities, implementation, and verification.
