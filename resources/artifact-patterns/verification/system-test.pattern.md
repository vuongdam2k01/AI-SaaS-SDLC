---
id: {{ID}}
artifact_type: system_test
title: {{TITLE}}
status: draft
created_by_change: {{CREATED_BY_CHANGE}}
depends_on: [TEST-POLICY, PRODUCT-REQUIREMENTS]
decisions: []
implementation: []
supersedes:
---

# {{ID}} — {{TITLE}}

<!-- Contract: specifies verification of an externally observable product scenario across its required surfaces and boundaries. It is not isolated component proof, implementation inspection, or operational acceptance. Create when an actor outcome, cross-screen flow, or end-to-end business state must be demonstrated as a whole. ID is ST-<AREA>-<NNN>; path is 04-verification/system-tests/<ID>.md. This artifact owns scenario-test intent and case IDs. Upstream: TEST-POLICY, FTR/UC/FLOW, SCR, access, quality, errors, and relevant design contracts. Consumers: test implementation, results, issues, and closure. Detail rule: the consumer is writing a journey through real surfaces, so state actor-visible outcomes and the final business state, and leave internal permutations to the levels that already prove them. Lifecycle: draft -> active -> superseded. -->

## Purpose and boundary

- Actor or system outcome proven: <observable outcome>
- Scenario start and terminal states: <boundary>
- Included surfaces: <user and system surfaces>
- Excluded technical proof: <better-owned UT/IT claims>

## Scenario boundary

| Participant or surface | Role | Contract references | Observable evidence |
|---|---|---|---|
| <actor/UI/API/event/external surface> | <role> | <artifact IDs> | <visible/queryable evidence> |

## References and environment

| Reference | Local IDs | Scenario claim |
|---|---|---|
| <FTR/UC/FLOW/SCR/ACCESS/Q/ERROR/INV/design ID> | <AC/step/action/rule IDs> | <behavior> |

- Starting configuration class: <minimum non-secret conditions>
- Identity and access setup: <roles/ownership>
- External-boundary treatment: <real or controlled, with claim limitation>
- Evidence capture: <result fields, screenshots only when semantically useful, state queries>

## Data setup and cleanup

- Starting state: <business-visible records and ownership>
- Setup path: <supported interface where the scenario depends on it>
- Isolation key: <tenant/test/correlation key>
- Cleanup or expiry: <deterministic behavior>
- Sensitive data rule: <safe synthetic data>

## Test cases

| Local ID | Reference IDs | Starting state | Actor actions or event | Observable outcome | Final state |
|---|---|---|---|---|---|
| TC-01 | <AC/UC/FLOW/SCR/ACCESS/ERROR IDs> | <state> | <ordered actions/events> | <visible response> | <authoritative business state> |
<!-- Denial, validation, partial failure, retry, duplicate and alternate paths are cases here, not a separate list: each is a TC row whose Final state column carries the state guarantee. Only a TC ID can be named by an execution record, so a check written outside this table can never be proven to have run. -->

## Implementation mapping

| Case IDs | Test path | Scenario name | Surfaces exercised |
|---|---|---|---|
| <TC IDs> | <repository-relative test path> | <test/scenario name> | <surfaces> |

## Completion contract

- [ ] Cases cover the actor goal, main path, applicable alternates, denials, and failures.
- [ ] Every case traces to FTR acceptance and UC/FLOW/SCR local IDs.
- [ ] Assertions include externally observable outcome and authoritative final state.
- [ ] At least one case follows a denial, failure or alternate path to its terminal state, where the journey admits one.
- [ ] UT/IT exclusions handed here are covered without claiming unexercised boundaries.
- [ ] Every case maps to executable tests and engine-produced result evidence.
