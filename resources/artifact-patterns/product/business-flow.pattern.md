---
id: {{ID}}
artifact_type: business_flow
title: {{TITLE}}
status: draft
created_by_change: {{CREATED_BY_CHANGE}}
depends_on: [PRODUCT-REQUIREMENTS]
decisions: []
supersedes:
---

# {{ID}} — {{TITLE}}

<!-- Contract: describes an end-to-end business outcome spanning multiple actors, use cases, or system boundaries. It is not a detailed use case, implementation pipeline, operational guide, or release process. Create when sequencing, decisions, ownership handoffs, or compensation must be understood across capabilities. ID is FLOW-<AREA>-<NNN>; path is 02-product/flows/<ID>.md. This artifact owns end-to-end orchestration semantics; linked use cases own interaction detail. Consumers: subsystems, screens, API/job/event designs, integration/system tests, and implementation. Lifecycle: draft -> active -> superseded. -->

## Purpose and boundary

- Business outcome: <observable end-to-end result>
- Start boundary: <first included event>
- End boundary: <terminal outcomes>
- Excluded processes: <adjacent flows>

## Participants and boundary

| Participant | Responsibility | Entry condition | Handoff produced | Authority reference |
|---|---|---|---|---|
| <role or system> | <responsibility> | <condition> | <observable handoff> | <artifact IDs> |

## Entry and exit

- Entry event: <event and required state>
- Successful exit: <observable business state>
- Unsuccessful exits: <bounded terminal outcomes>
- Global invariants: <SYSTEM-INVARIANTS IDs>

## Flow steps

| Local ID | Owner | Activity or referenced use case | Input state | Output state | Evidence or rule |
|---|---|---|---|---|---|
| S-01 | <participant> | <activity or UC ID> | <state> | <state> | <FTR/BR/INV IDs> |

## Decision points

| Local ID | After step | Decision rule | Outcome branches | Rule authority |
|---|---|---|---|---|
| D-01 | <S ID> | <deterministic condition> | <branch to local IDs> | <artifact and local rule ID> |

## Alternate and compensation paths

| Local ID | Type | Origin | Trigger | Path or action | Final state |
|---|---|---|---|---|---|
| A-01 | alternate | <S/D ID> | <condition> | <steps or UC IDs> | <state> |
| C-01 | compensation | <S/D ID> | <partial completion condition> | <reversal or reconciliation behavior> | <guaranteed state> |

## Traceability

| Direction | Artifact IDs | Relationship |
|---|---|---|
| Upstream | <REQ, FTR, UC, access, invariant IDs> | <behavior and constraints> |
| Design | <SUB, SCR, API, JOB, ENT, EVT, INT IDs> | <realization across boundaries> |
| Verification | <IT and ST IDs> | <end-to-end and boundary coverage> |

## Completion contract

- [ ] Start, successful exit, unsuccessful exits, and exclusions are explicit.
- [ ] Steps, decisions, alternates, and compensations have stable local IDs.
- [ ] Every branch terminates or rejoins at a named local ID.
- [ ] Handoffs identify owner, input state, output state, and authority.
- [ ] Detailed interactions remain in use cases and technical mechanics in design artifacts.
