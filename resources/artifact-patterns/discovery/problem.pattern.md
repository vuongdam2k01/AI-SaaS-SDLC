---
id: {{ID}}
artifact_type: problem
title: {{TITLE}}
status: draft
created_by_change: {{CREATED_BY_CHANGE}}
depends_on: [CUSTOMER-AND-PROBLEM, EVIDENCE-LEDGER]
decisions: []
supersedes:
---

# {{ID}} — {{TITLE}}

<!-- Contract: isolates one evidence-backed problem and its impact, not a proposed feature, implementation, or broad aspiration. Create when the problem has a distinct affected context, cause, impact, or falsifier. ID is PROBLEM-<AREA>; path is 01-discovery/customer-segments/<ID>.md. This artifact owns the problem boundary; evidence details remain in EVIDENCE-LEDGER and solution behavior belongs to product artifacts. Consumers: opportunity definition, features, use cases, and prioritization. Detail rule: the consumer is deciding whether the problem justifies building, and reads the evidence ledger for sources, so state impact with its unit and confidence and never state a solution. Lifecycle: draft -> active -> superseded. -->

## Purpose and boundary

- Problem area: <concise domain>
- Included: <conditions and outcomes in scope>
- Excluded: <adjacent symptoms or root causes>
- Non-purpose: <solution claims this artifact must not make>

## Problem statement

When <actor or segment> is in <context>, <observed condition> causes <observable consequence>, resulting in <measurable impact>.

## Affected context

| Affected ICP or persona | Trigger context | Frequency | Severity | Evidence IDs |
|---|---|---|---|---|
| <artifact IDs> | <context> | <observed cadence or unknown> | <basis> | <evidence IDs> |

## Current behavior and impact

| Current step or workaround | Friction or failure | Impact dimension | Measured or estimated value | Confidence |
|---|---|---|---|---|
| <current behavior> | <problem> | <time / quality / risk / cost> | <value and unit> | <level and rationale> |

## Evidence and uncertainty

### Evidence register

| Local ID | Claim supported | Evidence-ledger IDs | Strength | Counter-evidence | Last observed |
|---|---|---|---|---|---|
| EV-01 | <claim> | <evidence IDs> | <strong / moderate / weak> | <signal> | <date> |

- Root-cause hypothesis: <hypothesis explicitly labeled>
- Unknowns: <uncertainties that affect severity or scope>
- Alternative explanations: <credible alternatives>
<!-- These stay prose deliberately. An unknown is consumed by a human deciding where to look next, not by a downstream artifact citing an ID; giving it one would imply a closure obligation no later artifact can discharge. The evidence register above carries every claim that must be traceable. -->

## Boundaries and falsifiers

<!-- Prose by design: a falsifier is an instruction to a future observer, discharged by new evidence in the ledger rather than by a downstream artifact naming its ID. -->

- Applies when: <conditions>
- Does not apply when: <conditions>
- Falsified if: <observable evidence>
- Must be split if: <distinct contexts require separate solution behavior>

## Completion contract

- [ ] Problem, symptom, cause hypothesis, and proposed solution are separated.
- [ ] Affected context, frequency, severity, and impact are evidence-backed or marked unknown.
- [ ] Counter-evidence and falsifiers are explicit.
- [ ] Related ICP, persona, and evidence IDs resolve.
- [ ] No interface, architecture, or commercial promise is specified here.
