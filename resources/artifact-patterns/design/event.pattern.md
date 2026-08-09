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

<!-- Contract: defines an immutable fact communicated across a meaningful boundary. It is not a command, database row, logging message, or implementation-only callback. Create when producer and consumers need a stable semantic, payload, delivery, ordering, evolution, or privacy contract. ID is EVT-<AREA>-<NNN>; path is 03-design/events/<ID>.md. This artifact owns event semantics and payload; entities own domain state and jobs/integrations own handling. Consumers: SUB/API/JOB/INT designs, IT/ST, and implementation. Lifecycle: draft -> active -> superseded; incompatible semantic changes require a new event/version. -->

## Purpose and boundary

- Fact represented: <past-tense domain fact>
- Business meaning: <why consumers may rely on it>
- Not represented: <nearby commands, state, or telemetry>
- Producer authority: <SUB/API/JOB/INT ID>

## Emission semantics

- Emission trigger: <committed fact and exact condition>
- Emission relation to state commit: <atomic/outbox/after-commit semantics>
- Event identity: <unique ID source>
- Aggregate/tenant identity: <scope keys>
- Duplicate possibility: <yes/no and cause>

## Envelope and payload

| Local ID | Field | Meaning | Type | Required | Source | Sensitivity |
|---|---|---|---|---|---|---|
| F-01 | <field> | <semantic meaning> | <type> | <yes/no> | <ENT attribute/derived rule> | <classification> |

## Ordering and delivery

- Delivery semantic: <at-most-once / at-least-once / other explicit contract>
- Ordering key and guarantee: <key and scope, or none>
- Retention/replay semantics: <bounded behavior>
- Consumer deduplication key: <field set>
- Late or out-of-order handling: <consumer obligation>

## Consumers

| Local ID | Consumer | Use | Idempotency key | Failure ownership |
|---|---|---|---|---|
| C-01 | <SUB/JOB/INT ID> | <behavior triggered> | <key> | <consumer/provider owner> |

## Evolution and privacy

- Compatibility rule: <additive/optional/deprecation semantics>
- Versioning rule: <when a new version or ID is required>
- Minimum payload rule: <avoid unnecessary sensitive data>
- Retention/redaction rule: <consumer and evidence constraints>
- Subject deletion impact: <how retained events are handled>

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
