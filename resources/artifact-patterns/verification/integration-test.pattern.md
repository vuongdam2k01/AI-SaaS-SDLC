---
id: {{ID}}
artifact_type: integration_test
title: {{TITLE}}
status: draft
created_by_change: {{CREATED_BY_CHANGE}}
depends_on: [TEST-POLICY, ARCHITECTURE-OVERVIEW]
decisions: []
implementation: []
supersedes:
---

# {{ID}} — {{TITLE}}

<!-- Contract: specifies verification across one meaningful technical boundary using real participating implementations where that boundary is the claim. It is not isolated unit proof or an end-to-end actor journey. Create when correctness depends on collaboration among modules, database schema, OpenAPI handling, event/job delivery contract, or an external boundary. ID is IT-<AREA>-<NNN>; path is 04-verification/integration-tests/<ID>.md. This artifact owns boundary-test intent and case IDs. Upstream: TEST-POLICY plus referenced design/product contracts. Consumers: test implementation, results, issues, and closure. Detail rule: the consumer is writing test code against a real boundary, so state which participant is real and why, and assert both the outward response and the authoritative state the boundary left behind. Lifecycle: draft -> active -> superseded. -->

## Purpose and boundary

- Boundary proven: <specific collaboration>
- Included participants: <modules/stores/contracts>
- Excluded scenario scope: <actor journey or unrelated boundaries>
- Required evidence: <state, protocol, event, or side-effect observations>

## Integration boundary

| Participant | Real or controlled | Contract exercised | State observed |
|---|---|---|---|
| <participant A> | <real/controlled with reason> | <API/ENT/EVT/INT/JOB/SUB/DBML authority> | <observable state> |
| <participant B> | <real/controlled with reason> | <contract> | <observable state> |

## References and environment

| Reference | Local IDs or operation/schema names | Claim covered |
|---|---|---|
| <FTR/API/JOB/ENT/EVT/INT/SUB/ERROR/INV/OpenAPI/DBML> | <IDs> | <boundary behavior> |

- Required configuration class: <minimum non-secret conditions>
- External dependency strategy: <real service, local compatible service, or controlled boundary and why>
- Prohibited substitution: <component whose replacement would invalidate the claim>

## Data setup and cleanup

- Initial state: <records, ownership, versions, external state>
- Setup method: <public contract or direct fixture with justification>
- Isolation key: <tenant/test/correlation key>
- Cleanup: <deterministic cleanup and failure-safe behavior>
- Sensitive data rule: <safe synthetic data constraints>

## Test cases

| Local ID | Reference IDs | Setup | Stimulus | Expected cross-boundary result | State guarantee | Cleanup |
|---|---|---|---|---|---|---|
| TC-01 | <AC/API/JOB/ENT/EVT/INT/ERROR/INV IDs> | <initial state> | <request/event/action> | <exact response and persisted/emitted state> | <atomic, partial, or unchanged state after this case> | <cleanup> |
<!-- Failure, duplicate and concurrency behavior are cases here, not a separate list: a failure injected at the real boundary is a TC row whose State guarantee column carries the atomicity claim. Only a TC ID can be named by an execution record, so a check written outside this table can never be proven to have run. -->

## Implementation mapping

| Case IDs | Test path | Test name or symbol | Exercised boundary |
|---|---|---|---|
| <TC IDs> | <repository-relative test path> | <test name> | <participants/contracts> |

## Completion contract

- [ ] At least two meaningful participants are exercised and the claimed boundary is not replaced.
- [ ] Cases trace to contract IDs and verify both outward response and authoritative state/side effects.
- [ ] Setup, isolation, cleanup, duplicate, concurrency, and failure behavior are deterministic.
- [ ] At least one case exercises a failure or race at the real boundary and states the surviving state guarantee, where the boundary can fail.
- [ ] Unit-test exclusions handed here are explicitly covered or reassigned to ST.
- [ ] Every case maps to executable tests and engine-produced result evidence.
