---
id: {{ID}}
artifact_type: unit_test_backend
title: {{TITLE}}
status: draft
created_by_change: {{CREATED_BY_CHANGE}}
depends_on: [TEST-POLICY]
decisions: []
implementation: []
supersedes:
---

# {{ID}} — {{TITLE}}

<!-- Contract: specifies deterministic unit verification for backend business/processing code in isolation. It is not an API wire, database, provider, multi-module, or end-to-end check. Create when an API-processing rule, domain rule, validation branch, authorization decision, or error mapping needs isolated evidence. ID is UT-API-<AREA>-<NNN> for a unit sitting behind an invocable operation, or UT-CORE-<AREA>-<NNN> for platform-neutral core or domain logic; path is 04-verification/unit-tests/backend/<ID>.md either way. This artifact owns test intent and case IDs; production design owns behavior and test files own executable evidence. Upstream: TEST-POLICY and referenced FTR/API/ENT/ACCESS/ERROR/INV artifacts. Consumers: test implementation, test results, issues, and change closure. Detail rule: the consumer is writing test code with the interface and schema files open, so state the data requirement rather than literal values, name the operation and the number of calls, and omit anything those files already answer. Lifecycle: draft -> active -> superseded. -->

## Purpose and boundary

- Unit under test: <symbol and responsibility>
- Isolation boundary: <direct collaborators replaced or controlled>
- Behavior proven: <local rules and branches>
- Non-purpose: <cross-boundary claims not supportable here>

## Target and references

| Reference type | Artifact and local IDs | Why authoritative |
|---|---|---|
| Behavior | <FTR/API/ENT/ACCESS/ERROR/INV IDs> | <rule or acceptance criterion tested> |
| Source | <repository-relative path and symbol> | <unit under test> |

## Included behavior

- Happy-path rules: <IDs>
- Boundary and validation rules: <IDs>
- Authorization branches: <IDs, if local to the unit>
- Failure and unchanged-state rules: <IDs>

## Explicit exclusions

| Local ID | Excluded claim | Reason unit evidence is insufficient | Required handoff |
|---|---|---|---|
| EX-01 | <database, protocol, provider, or cross-module behavior> | <boundary not exercised> | <IT or ST ID, or required new spec> |
<!-- An exclusion is a handoff, not a deletion: the receiving specification cites this row back as `<this ID>#EX-NN`. A claim this unit cannot prove and no row names is a silent gap. -->

## Test data and isolation

- Input construction: <minimal meaningful values and boundary classes>
- Controlled collaborators: <what is replaced and contract preserved>
- State reset: <how cases remain independent>
- Time/randomness/concurrency control: <deterministic strategy>
- Prohibited evidence: <generated values or stubs that bypass the rule being tested>

State the data *requirement* a case needs, not the literal values an implementer will choose — "an input at the maximum allowed length", not one specific string. A constraint stays true when the fixture changes; a copied value silently rots into a second, competing authority.

## Test cases

| Local ID | Reference IDs | Setup | Stimulus | Expected result | Unchanged-state assertion |
|---|---|---|---|---|---|
| TC-01 | <AC/BH/BR/V/P/INV/ERROR IDs> | <state and inputs> | <call/action> | <exact return/error/effect> | <state or collaborator calls that must not change> |

## Implementation mapping

| Case IDs | Test path | Test name or symbol | Production symbol |
|---|---|---|---|
| <TC IDs> | <repository-relative test path> | <test name> | <source symbol> |

## Completion contract

- [ ] Every case traces to authoritative behavior and has exact setup, stimulus, and assertion.
- [ ] Success, boundary, denial, validation, failure, and unchanged-state cases are covered when applicable.
- [ ] Isolation does not replace the behavior being proven.
- [ ] Every cross-boundary exclusion has a stable local ID and an explicit IT/ST handoff.
- [ ] Every case maps to an executable test symbol and later engine-produced result evidence.
