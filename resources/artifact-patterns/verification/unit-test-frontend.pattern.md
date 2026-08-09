---
id: {{ID}}
artifact_type: unit_test_frontend
title: {{TITLE}}
status: draft
created_by_change: {{CREATED_BY_CHANGE}}
depends_on: [TEST-POLICY, UX-RULES]
decisions: []
implementation: []
supersedes:
---

# {{ID}} — {{TITLE}}

<!-- Contract: specifies deterministic unit verification for a screen/component's rendering and interaction semantics in isolation. It is not visual styling approval, real server integration, browser-wide navigation, or end-to-end proof. Create when SCR/CMP states, actions, validation, accessibility, or client rule branches need isolated evidence. ID is UT-UI-<AREA>-<NNN>; path is 04-verification/unit-tests/frontend/<ID>.md. This artifact owns test intent and case IDs; SCR/CMP/UX artifacts own expected behavior. Consumers: test implementation, results, issues, and closure. Lifecycle: draft -> active -> superseded. -->

## Purpose and boundary

- Unit under test: <screen/component symbol and responsibility>
- Rendering/interaction boundary: <what is real and controlled>
- Behavior proven: <local IDs and states>
- Non-purpose: <network, full navigation, or style claims not proven here>

## Target and references

| Reference type | Artifact and local IDs | Why authoritative |
|---|---|---|
| Behavior | <FTR/SCR/CMP/UX/ERROR IDs> | <state/action/validation/accessibility rule> |
| Source | <repository-relative path and symbol> | <unit under test> |

## Included behavior

- Rendering, visibility, and states: <SCR/CMP local IDs>
- Input, validation, and actions: <local IDs>
- Error and unchanged-state behavior: <local IDs>
- Keyboard, focus, name, role, and announcement behavior: <UX/local IDs>

## Explicit exclusions

| Excluded claim | Reason unit evidence is insufficient | Required handoff |
|---|---|---|
| <real protocol, persistence, cross-screen, or full scenario behavior> | <boundary not exercised> | <IT or ST ID, or required new spec> |

## Test data and isolation

- Props/state construction: <meaningful values and boundary states>
- Controlled collaborators: <network/navigation/time dependencies>
- Query strategy: <user-visible role/name/state rather than implementation detail>
- State reset: <case independence>
- Prohibited evidence: <snapshots or selectors that do not prove behavior>

## Test cases

| Local ID | Reference IDs | Setup | Stimulus | Expected result | Unchanged-state assertion |
|---|---|---|---|---|---|
| TC-01 | <AC/SCR/CMP/UX/ERROR IDs> | <rendered state> | <user-like interaction or state change> | <visible/semantic result> | <what must remain unchanged> |

## Implementation mapping

| Case IDs | Test path | Test name or symbol | Production symbol |
|---|---|---|---|
| <TC IDs> | <repository-relative test path> | <test name> | <component/screen symbol> |

## Completion contract

- [ ] Cases trace to stable SCR/CMP/UX/FTR local IDs.
- [ ] Observable semantics are asserted through user-visible roles, names, states, and outcomes.
- [ ] Loading, empty, error, disabled, validation, success, and accessibility branches are covered when applicable.
- [ ] Real boundary and cross-screen exclusions have explicit IT/ST handoffs.
- [ ] Every case maps to executable tests and later engine-produced result evidence.
