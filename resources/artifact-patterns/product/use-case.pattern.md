---
id: {{ID}}
artifact_type: use_case
title: {{TITLE}}
status: draft
created_by_change: {{CREATED_BY_CHANGE}}
depends_on: [PRODUCT-REQUIREMENTS]
decisions: []
supersedes:
---

# {{ID}} — {{TITLE}}

<!-- Contract: specifies one goal-oriented interaction between actors and the product. It is not a screen specification, implementation sequence, or broad cross-capability journey. Create when an actor goal has a distinct trigger, guarantee, or alternate/error behavior. ID is UC-<AREA>-<NNN>; path is 02-product/use-cases/<ID>.md. This artifact owns interaction flow semantics. Features own acceptance criteria; flows own cross-use-case orchestration; design owns presentation and mechanics. Consumers: business flows, screens, processing designs, UT/IT/ST specs, and implementation. Detail rule: the consumer is designing surfaces and journeys and can read the feature's acceptance rows, so reference acceptance IDs rather than paraphrasing them, and state what the actor observes at each step rather than how it is rendered. Lifecycle: draft -> active -> superseded. -->

## Purpose and boundary

- Actor goal: <goal stated without interface assumptions>
- Included interaction: <start and end>
- Excluded interaction: <handoffs or sibling use cases>
- Non-purpose: <layout, protocol, or code behavior not owned here>

## Actors and preconditions

| Actor or participant | Role in use case | Required access | Preconditions | Authority reference |
|---|---|---|---|---|
| <actor> | <responsibility> | <access-control rule ID> | <observable state> | <artifact IDs> |

## Trigger and guarantees

| Local ID | Concern | Statement | Observable evidence |
|---|---|---|---|
| G-01 | trigger | <observable event> | <what starts the interaction> |
| G-02 | success guarantee | <state true after success> | <state a case asserts on the success path> |
| G-03 | minimal guarantee | <state preserved even after failure> | <state a case asserts on every error path> |
<!-- The minimal guarantee is the row every error flow must satisfy; an X-* row contradicting G-03 is a defect in one of the two. -->

- Related feature acceptance: <FTR ID and AC IDs>

## Main flow

| Local ID | Initiator | Action or system behavior | Information used | Resulting state |
|---|---|---|---|---|
| M-01 | <actor or system> | <observable step> | <input or rule IDs> | <state> |

## Alternate flows

| Local ID | Branches from | Condition | Steps or outcome | Returns to |
|---|---|---|---|---|
| A-01 | <M ID> | <condition> | <observable alternate> | <M ID or terminal state> |

## Error flows

| Local ID | Origin | Failure condition | Observable response | State guarantee | Recovery |
|---|---|---|---|---|---|
| X-01 | <M or A ID> | <condition> | <error code/message behavior> | <unchanged or defined state> | <next valid action> |

## Traceability

| Direction | Artifact IDs | Relationship |
|---|---|---|
| Upstream | <FTR, REQ, access, invariant IDs> | <behavior and constraints> |
| Design | <SCR, API, JOB, ENT, EVT, INT IDs> | <realization points> |
| Verification | <UT, IT, ST IDs and case IDs> | <covered branches> |

## Completion contract

- [ ] One actor goal, trigger, success guarantee, and minimal guarantee are explicit.
- [ ] Main, alternate, and error rows have stable local IDs and deterministic branches.
- [ ] Every terminal path has an observable outcome and state guarantee.
- [ ] Access and invariant constraints cite their authorities.
- [ ] Screen layout, API schema, and implementation details remain in design artifacts.
