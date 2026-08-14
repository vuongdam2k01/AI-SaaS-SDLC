---
id: {{ID}}
artifact_type: event
title: {{TITLE}}
status: draft
created_by_change: {{CREATED_BY_CHANGE}}
depends_on: [ARCHITECTURE-OVERVIEW, SYSTEM-INVARIANTS]
decisions: []
implementation: []
supersedes:
---

# {{ID}} — {{TITLE}}

<!-- Contract: defines an immutable fact communicated across a meaningful boundary. It is not a command, database row, logging message, or implementation-only callback. Create when producer and consumers need a stable semantic, payload, delivery, ordering, evolution, or privacy contract. ID is EVT-<AREA>-<NNN>; path is 03-design/events/<ID>.md. This artifact owns event semantics and payload; entities own domain state and jobs/integrations own handling. Consumers: SUB/API/JOB/INT designs, IT/ST, and implementation. Detail rule: the consumer is a producer or consumer implementing against this fact, so state payload meaning, delivery, ordering and compatibility guarantees, and leave the handling behavior to the subsystems and jobs that own it. Lifecycle: draft -> active -> superseded; incompatible semantic changes require a new event/version. -->

## Purpose and boundary

- Fact represented: <past-tense domain fact>
- Business meaning: <why consumers may rely on it>
- Not represented: <nearby commands, state, or telemetry>
- Producer authority: <SUB/API/JOB/INT ID>

## Emission semantics

| Local ID | Concern | Rule | Observable consequence |
|---|---|---|---|
| EM-01 | emission trigger | <committed fact and exact condition> | <when a case may expect exactly one emission> |
| EM-02 | relation to state commit | <atomic/outbox/after-commit semantics> | <observable when the commit fails> |
| EM-03 | event identity | <unique ID source> | <what a consumer deduplicates on> |
| EM-04 | aggregate or tenant identity | <scope keys> | <isolation a case can assert> |
| EM-05 | duplicate possibility | <yes/no and cause> | <observable on a duplicated emission> |
<!-- Keep one row per concern that applies; state an explicit not-applicable rule rather than deleting a row. -->

## Envelope and payload

| Local ID | Field | Meaning | Type | Required | Source | Sensitivity |
|---|---|---|---|---|---|---|
| F-01 | <field> | <semantic meaning> | <type> | <yes/no> | <ENT attribute/derived rule> | <classification> |

## Ordering and delivery

| Local ID | Concern | Rule | Observable consequence |
|---|---|---|---|
| DL-01 | delivery semantic | <at-most-once / at-least-once / other explicit contract> | <what a consumer must tolerate> |
| DL-02 | ordering key and guarantee | <key and scope, or none> | <observable out-of-order outcome> |
| DL-03 | retention and replay | <bounded behavior> | <observable after the bound> |
| DL-04 | consumer deduplication key | <field set> | <what a second delivery must not repeat> |
| DL-05 | late or out-of-order handling | <consumer obligation> | <observable when the obligation is met> |
<!-- Keep one row per concern that applies; state an explicit not-applicable rule rather than deleting a row. -->

## Consumers

| Local ID | Consumer | Use | Idempotency key | Failure ownership |
|---|---|---|---|---|
| C-01 | <SUB/JOB/INT ID> | <behavior triggered> | <key> | <consumer/provider owner> |

## Evolution and privacy

| Local ID | Concern | Rule | Observable consequence |
|---|---|---|---|
| EP-01 | compatibility | <additive/optional/deprecation semantics> | <what an old consumer still sees> |
| EP-02 | versioning | <when a new version or ID is required> | <observable at the version boundary> |
| EP-03 | minimum payload | <avoid unnecessary sensitive data> | <fields a case asserts absent> |
| EP-04 | retention and redaction | <consumer and evidence constraints> | <observable after the retention bound> |
| EP-05 | subject deletion impact | <how retained events are handled> | <observable after a deletion request> |
<!-- Keep one row per concern that applies; state an explicit not-applicable rule rather than deleting a row. -->

## Traceability

| Direction | Artifact IDs or paths | Relationship |
|---|---|---|
| Source | <FTR/UC/API/JOB/ENT/INV IDs> | <fact and emission rule> |
| Consumers | <SUB/JOB/INT IDs> | <allowed reliance> |
| Verification | <IT/ST IDs and cases> | <delivery, duplicate, ordering, privacy coverage> |

## Completion contract

- [ ] The name and meaning describe a committed past-tense fact, not an instruction.
- [ ] Every envelope/payload field has meaning, type, source, requiredness, and sensitivity.
- [ ] Commit relation, identity, delivery, ordering, deduplication, replay, and failure ownership are explicit.
- [ ] Compatibility, versioning, minimization, retention, and deletion semantics are bounded.
- [ ] Producer, consumers, implementation, and verification references resolve.
