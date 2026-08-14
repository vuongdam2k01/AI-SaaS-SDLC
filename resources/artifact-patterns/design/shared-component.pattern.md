---
id: {{ID}}
artifact_type: component
title: {{TITLE}}
status: draft
created_by_change: {{CREATED_BY_CHANGE}}
depends_on: [UX-RULES]
decisions: []
implementation: []
supersedes:
---

# {{ID}} — {{TITLE}}

<!-- Contract: specifies reusable presentation behavior shared by two or more consumers, not a page, product feature, generic style note, or framework component without domain semantics. Create when consumers share inputs, states, actions, and accessibility behavior that must stay consistent. ID is CMP-<AREA>-<NNN>; path is 03-design/components/<ID>.md. This artifact owns the reuse contract; screens own placement and API/JOB artifacts own processing. Consumers: SCR artifacts, frontend UT, ST, and implementation. Detail rule: the consumer is a screen embedding this contract, so state what every consumer may rely on and what none may override, and leave one-surface placement and styling to the screen. Lifecycle: draft -> active -> superseded. -->

## Purpose and reuse boundary

- Reusable responsibility: <single responsibility>
- Reuse threshold: <why a shared contract is warranted>
- Included behavior: <behavior>
- Excluded behavior: <screen-specific or processing behavior>

## Consumers and variants

| Consumer SCR or CMP ID | Placement or context | Variant | Allowed override | Prohibited divergence |
|---|---|---|---|---|
| <artifact ID> | <context> | <variant name> | <bounded override> | <behavior that must remain shared> |

## Inputs and outputs

| Local ID | Direction | Name | Type | Required | Constraints | Default |
|---|---|---|---|---|---|---|
| I-01 | input | <name> | <semantic type> | <yes/no> | <constraint> | <default or none> |
| O-01 | output | <name> | <semantic type> | <condition> | <guarantee> | <not applicable> |

## States and behavior

| Local ID | State | Entry condition | Rendering or behavior | Exit |
|---|---|---|---|---|
| ST-01 | <state> | <condition> | <observable behavior> | <event or condition> |

## Actions and events

| Local ID | Trigger | Preconditions | Emitted event or result | Failure behavior |
|---|---|---|---|---|
| E-01 | <interaction> | <state/access condition> | <O ID or named result> | <visible safe behavior> |

## Accessibility

| Local ID | Requirement | Applies to | Observable evidence | UX rule |
|---|---|---|---|---|
| AX-01 | <semantic role and name, keyboard interaction, focus movement and restoration, status announcement, or contrast/motion/target-size constraint> | <I/O/ST/E ID or the whole component> | <what a test can observe: role, name, state, focus position, announcement> | <UX ID or none> |
<!-- One row per requirement a verification case can observe. Consumers inherit these rows; a screen may not weaken one. -->

## Traceability

| Direction | Artifact IDs or paths | Relationship |
|---|---|---|
| Upstream | <UX, FTR, SCR, ADR IDs> | <rules and consumer need> |
| Verification | <UT-UI and ST IDs> | <state, event, and accessibility coverage> |
| Implementation | <source paths and symbols> | <contract realization> |

## Completion contract

- [ ] At least two real consumers or one explicit cross-product reuse requirement exists.
- [ ] Inputs, outputs, states, and actions have stable local IDs and types.
- [ ] Variants and allowed overrides cannot silently change shared semantics.
- [ ] Empty, loading, disabled, error, and success states are covered when applicable.
- [ ] Accessibility behavior and implementation/test mappings are concrete.
