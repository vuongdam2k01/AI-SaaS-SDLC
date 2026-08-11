---
id: {{ID}}
artifact_type: screen
title: {{TITLE}}
status: draft
created_by_change: {{CREATED_BY_CHANGE}}
depends_on: [PRODUCT-REQUIREMENTS, UX-RULES, ACCESS-CONTROL]
decisions: []
implementation: []
supersedes:
---

# {{ID}} — {{TITLE}}

<!-- Contract: specifies one user-visible screen or stable view state on any client surface — a web route, a desktop window or a mobile screen — not a reusable component, API algorithm, implementation task, or visual mockup. Create when access, information hierarchy, fields, actions, validation, or transitions differ materially. ID is SCR-<AREA>-<NNN>; path is 03-design/screens/<ID>.md. This artifact owns screen composition and interaction semantics; CMP owns reusable parts, OpenAPI owns wire contracts, API/JOB own processing, UX-RULES owns shared interaction policy. Upstream: FTR/UC/FLOW, access, UX, errors, and decisions. Consumers: components, API processing, frontend UT, IT, ST, and implementation. Lifecycle: draft -> active -> superseded. -->

## Purpose and boundary

- User outcome: <outcome supported by this view>
- Included view states: <states>
- Excluded responsibilities: <reusable or processing behavior owned elsewhere>
- Applicable feature/use case: <artifact IDs and local criteria or steps>

## Access and context

| Actor or role | Access rule ID | Entry condition | Data scope | Denied behavior |
|---|---|---|---|---|
| <role> | <ACCESS ID> | <condition> | <tenant or ownership scope> | <ERROR code and safe behavior> |

## Regions

| Local ID | Region | Purpose | Visible when | Empty or loading behavior |
|---|---|---|---|---|
| A-01 | <region name> | <purpose> | <deterministic condition> | <observable state> |

## Fields and controls

| Local ID | Region | Type | Label | Source | Required | Format or constraints | Default |
|---|---|---|---|---|---|---|---|
| I-01 | <A ID> | input | <label> | <entity attribute or derived source> | <yes/no/conditional> | <rules> | <value or none> |
<!-- Use O-* for output, B-* for button/control, and L-* for link/navigation. -->

## Actions

| Local ID | Trigger | Preconditions | Processing reference | Success | Failure |
|---|---|---|---|---|---|
| E-01 | <actor action> | <access, state, validation> | <API/JOB/UC reference> | <observable result> | <error code, message behavior, state guarantee> |

## Validation

| Local ID | Applies to | Rule | Exact response | Timing |
|---|---|---|---|---|
| V-01 | <field/action ID> | <deterministic rule> | <user-safe message or ERROR code> | <when evaluated> |

## Transitions

| Local ID | From | Trigger | To | Guard or state passed |
|---|---|---|---|---|
| T-01 | <this screen/state> | <E/V/event ID> | <SCR ID or named local state> | <condition and retained context> |

## Accessibility and rationale

- Focus order and restoration: <behavior>
- Keyboard and non-pointer operation: <behavior>
- Labels, instructions, and error association: <behavior>
- Announced state changes: <behavior>
- Design rationale and rejected alternatives: <decision IDs or concise rationale>

## Completion contract

- [ ] Every region, field/control, action, validation, and transition has a stable local ID.
- [ ] Sources, defaults, formats, visibility, and requiredness are deterministic.
- [ ] Every action maps success, failure, and unchanged-state behavior.
- [ ] Access, UX, error, feature/use-case, processing, and verification references resolve.
- [ ] Shared behavior is factored to CMP and wire/processing mechanics remain authoritative elsewhere.
