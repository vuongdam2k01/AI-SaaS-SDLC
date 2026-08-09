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

<!-- Contract: isolates one evidence-backed problem and its impact, not a proposed feature, implementation, or broad aspiration. Create when the problem has a distinct affected context, cause, impact, or falsifier. ID is PROBLEM-<AREA>; path is 01-discovery/customer-segments/<ID>.md. This artifact owns the problem boundary; evidence details remain in EVIDENCE-LEDGER and solution behavior belongs to product artifacts. Consumers: opportunity definition, features, use cases, and prioritization. Lifecycle: draft -> active -> superseded. -->

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

## Boundaries and falsifiers

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
