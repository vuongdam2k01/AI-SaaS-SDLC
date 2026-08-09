---
id: {{ID}}
artifact_type: persona
title: {{TITLE}}
status: draft
created_by_change: {{CREATED_BY_CHANGE}}
depends_on: [EVIDENCE-LEDGER]
decisions: []
supersedes:
---

# {{ID}} — {{TITLE}}

<!-- Contract: describes one evidence-backed role in a product context, not a fictional biography, marketing character, or permission definition. Create when a role has distinct goals, decisions, responsibilities, or constraints. ID is PERSONA-<ROLE>; path is 01-discovery/customer-segments/<ID>.md. This artifact owns role context; ACCESS-CONTROL owns permissions and ICP artifacts own segment boundaries. Upstream: evidence and applicable ICPs. Consumers: problems, use cases, flows, screens, and accessibility decisions. Lifecycle: draft -> active -> superseded. -->

## Purpose and boundary

- Role represented: <role, not a named individual>
- Included contexts: <where this role description applies>
- Excluded contexts: <similar roles outside scope>
- Non-purpose: <permissions, demographics, or invented preferences not owned here>

## Role context

| Dimension | Description | Evidence IDs |
|---|---|---|
| Applicable ICPs | <ICP IDs and conditions> | <evidence IDs> |
| Working environment | <tools, time, collaboration context> | <evidence IDs> |
| Knowledge level | <relevant knowledge only> | <evidence IDs> |

## Goals and decisions

| Goal or decision | Trigger | Success signal | Relative importance | Evidence IDs |
|---|---|---|---|---|
| <goal> | <context> | <observable signal> | <basis> | <evidence IDs> |

## Responsibilities and constraints

| Responsibility | Constraint or risk | Current workaround | Product implication |
|---|---|---|---|
| <responsibility> | <constraint> | <observed workaround> | <implication, not a design prescription> |

## Evidence and uncertainty

### Evidence register

| Local ID | Claim supported | Evidence-ledger IDs | Strength | Counter-evidence | Last observed |
|---|---|---|---|---|---|
| EV-01 | <claim> | <evidence IDs> | <strong / moderate / weak> | <signal> | <date> |

- Inferences: <deductions separated from observations>
- Unknowns: <material unanswered questions>
- Falsifiers: <what would make this persona invalid or require a split>

## Applicability

- Applies to: <use cases and situations>
- Does not apply to: <nearby roles or situations>
- Revisit when: <evidence or operating condition>

## Completion contract

- [ ] The role is behaviorally distinct and linked to applicable ICP IDs.
- [ ] Every material claim cites evidence-ledger IDs.
- [ ] Goals use observable success signals.
- [ ] Uncertainty and counter-evidence are recorded.
- [ ] Permissions remain in ACCESS-CONTROL and feature behavior remains in product artifacts.
