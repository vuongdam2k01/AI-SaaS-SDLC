---
id: {{ID}}
artifact_type: feature
title: {{TITLE}}
status: draft
created_by_change: {{CREATED_BY_CHANGE}}
depends_on: [PRODUCT-REQUIREMENTS]
decisions: []
supersedes:
---

# {{ID}} — {{TITLE}}

<!-- Contract: specifies one independently understandable product capability through observable behavior and acceptance, not UI layout, API mechanics, code tasks, or release sequencing. Create when behavior has a cohesive user or business outcome and can be accepted as a unit. ID is FTR-<AREA>-<NNN>; path is 02-product/features/<ID>.md. This artifact owns behavior, business rules, and AC IDs. Upstream: product requirements, problems, quality requirements, access control, and invariants as applicable. Consumers: use cases, flows, design artifacts, UT/IT/ST specs, and issues. Detail rule: the consumer is writing use cases, design and verification, and holds this document open while doing it, so state observable conditions with stable IDs and leave every mechanism — routes, payloads, tables — to the artifacts that own them. Lifecycle: draft -> active -> superseded. -->

## Purpose and boundary

- Capability outcome: <observable outcome>
- Included behavior: <scope>
- Excluded behavior: <scope and owner if known>
- Non-purpose: <design or implementation decisions not owned here>

## Outcome and applicability

| Actor or system | Preconditions | Trigger | Success outcome | Related requirement or problem |
|---|---|---|---|---|
| <actor> | <state> | <event> | <observable result> | <REQ or PROBLEM IDs> |

## Observable behavior

| Local ID | Given | When | Then | Applicability |
|---|---|---|---|---|
| BH-01 | <observable starting condition> | <actor action or event> | <observable result> | <role, state, or condition> |

## Business rules

| Local ID | Rule | Applies when | Does not apply when | Authority reference |
|---|---|---|---|---|
| BR-01 | <deterministic rule> | <condition> | <boundary> | <source artifact or local decision> |

## State and failure model

| Local ID | Type | Trigger or condition | Observable state or response | Recovery or next action |
|---|---|---|---|---|
| ST-01 | state | <condition> | <visible or queryable state> | <allowed transition> |
| FL-01 | failure | <condition> | <error behavior and unchanged-state guarantee> | <recovery> |

## Acceptance criteria

| Local ID | Verifiable criterion | Covers behavior or rule IDs | Required test level | Evidence produced |
|---|---|---|---|---|
| AC-01 | <precise pass/fail condition> | <BH/BR/ST/FL IDs> | <UT / IT / ST> | <assertion or observable result> |

## Traceability

| Direction | Artifact IDs | Relationship |
|---|---|---|
| Upstream | <requirements, problems, decisions> | <why this feature exists or is constrained> |
| Design | <SCR, CMP, API, JOB, ENT, EVT, INT, SUB IDs> | <where behavior is designed> |
| Verification | <UT, IT, ST IDs> | <which acceptance criteria are covered> |

## Completion contract

- [ ] Scope and exclusions prevent overlap with sibling features.
- [ ] Every behavior, rule, state, failure, and acceptance criterion has a stable local ID.
- [ ] Acceptance criteria state observable pass/fail conditions and test level.
- [ ] Authorization, invariant, and quality references resolve where applicable.
- [ ] Design mechanics and source-code paths are absent; consumers own them.
