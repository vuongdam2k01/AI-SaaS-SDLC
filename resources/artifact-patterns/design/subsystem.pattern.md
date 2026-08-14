---
id: {{ID}}
artifact_type: subsystem
title: {{TITLE}}
status: draft
created_by_change: {{CREATED_BY_CHANGE}}
depends_on: [ARCHITECTURE-OVERVIEW, SYSTEM-INVARIANTS]
decisions: []
writes_to: []
implementation: []
supersedes:
---

# {{ID}} — {{TITLE}}

<!-- Contract: defines one architectural boundary with cohesive responsibilities, interfaces, and data ownership. It is not a code folder inventory, product feature, environment description, or delivery topology; runtime grouping and network boundaries are owned by the Runtime topology section of ARCHITECTURE-OVERVIEW. Create when a boundary needs explicit ownership and failure isolation. ID is SUB-<AREA>-<NNN>; path is 03-design/subsystems/<ID>.md. This artifact owns subsystem boundaries and collaboration rules; API/EVT/JOB/INT artifacts own detailed contracts and DBML owns physical schema. Consumers: design artifacts, integration tests, architecture decisions, and implementation. Detail rule: the consumer is designing artifacts inside or across this boundary, so state responsibility, dependency and failure containment at the boundary and leave the detailed contracts to the artifacts that own them. Lifecycle: draft -> active -> superseded. -->

## Purpose and boundary

- Architectural purpose: <why this boundary exists>
- Inside boundary: <responsibilities and owned concepts>
- Outside boundary: <explicit non-responsibilities>
- Boundary rationale: <ADR or constraint>

## Responsibilities

| Local ID | Responsibility | Trigger | Outcome | Invariant or quality constraint |
|---|---|---|---|---|
| R-01 | <responsibility> | <event or call> | <observable result> | <INV/Q IDs> |

## Interfaces and dependencies

| Local ID | Direction | Interface or dependency | Contract owner | Failure boundary |
|---|---|---|---|---|
| IF-01 | <inbound/outbound> | <API/EVT/JOB/INT/SUB ID> | <authoritative artifact> | <what failure cannot cross or corrupt> |

## Data ownership

| Local ID | Entity or store | Ownership | Allowed access | Consistency rule |
|---|---|---|---|---|
| D-01 | <ENT ID or DBML table> | <owns / reads / derives> | <bounded operations> | <INV ID or rule> |

## Behavior and collaboration

1. <Numbered behavior using R/IF/D references and observable state changes.>
2. <Describe ordering and delegation without duplicating detailed child contracts.>

| Local ID | Concern | Rule | Observable consequence |
|---|---|---|---|
| B-01 | consistency model | <transactional, eventual, or other bounded semantics> | <state a case may assert and when> |
| B-02 | concurrency boundary | <conflict and serialization rule> | <loser's observable outcome> |
| B-03 | trust boundary | <validated inputs and protected outputs> | <observable when an untrusted input crosses it> |
<!-- Keep one row per concern that applies; state an explicit not-applicable rule rather than deleting a row. -->

## Failure and observability

| Local ID | Failure condition | Containment or state guarantee | Error code | Observable signal | Recovery owner |
|---|---|---|---|---|---|
| F-01 | <condition> | <guarantee> | <ERROR code> | <structured signal> | <subsystem or actor> |

## Implementation mapping

| Responsibility or local ID | Source path | Symbol or module | Verification IDs |
|---|---|---|---|
| <R/IF/D/F IDs> | <repository-relative path> | <symbol> | <UT/IT/ST IDs> |

## Completion contract

- [ ] Responsibilities and non-responsibilities form a clear, non-overlapping boundary.
- [ ] Interfaces name authoritative contracts and failure boundaries.
- [ ] Data ownership and allowed access agree with ENT and DBML authorities.
- [ ] Concurrency, consistency, trust, and failure semantics are explicit.
- [ ] Every responsibility maps to implementation and verification.
