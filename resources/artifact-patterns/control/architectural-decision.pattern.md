---
id: {{ID}}
artifact_type: architectural_decision
title: {{TITLE}}
status: proposed
created_by_change: {{CREATED_BY_CHANGE}}
depends_on: [ARCHITECTURE-OVERVIEW]
decisions: []
implementation: []
supersedes:
---

# {{ID}} — {{TITLE}}

<!-- Contract: records one durable architectural choice, its drivers, credible alternatives, consequences, and verification obligations. It is not a status update, implementation plan, product requirement, or repository convention already owned elsewhere. Create when a materially consequential technical choice must remain explainable across future changes. ID is ADR-<AREA>-<NNN>; path is 05-control/decisions/<ID>.md. This artifact owns the decision rationale; affected design contracts own resulting detailed behavior. Upstream: architecture, quality, invariants, affected design, and evidence. Consumers: architecture/design artifacts, implementation, tests, and later ADRs. Lifecycle: proposed -> accepted -> superseded or rejected; accepted content is immutable except clarifications that do not change the decision. -->

## Purpose and boundary

- Decision scope: <bounded architectural concern>
- Included consequences: <systems/data/interfaces affected>
- Excluded decisions: <nearby choices>
- Decision authority: <why an ADR is the right owner>

## Decision question

How should <specific architectural subject> satisfy <named constraints> within <scope>?

## Context and drivers

| Driver | Source artifact or evidence | Importance | Constraint or desired property |
|---|---|---|---|
| <driver> | <Q/INV/FTR/SUB/evidence ID> | <critical/high/normal> | <measurable or bounded condition> |

## Options considered

| Local ID | Option | Benefits | Costs or risks | Fit to drivers | Rejection reason |
|---|---|---|---|---|---|
| OPT-01 | <credible option> | <benefits> | <costs/risks> | <driver-by-driver fit> | <reason, or selected> |
| OPT-02 | <credible alternative> | <benefits> | <costs/risks> | <fit> | <reason> |

## Decision

- Selected option: <OPT ID>
- Decision statement: <precise required architecture behavior>
- Applicability: <where and when it applies>
- Exceptions: <bounded exceptions or none>

## Consequences

### Positive

- <benefit tied to a driver>

### Negative and accepted risks

- <cost/risk, owner, and constraint>

### Follow-on constraints

- <constraint downstream artifacts and implementation must obey>

## Affected scope and verification

| Artifact or path | Required consequence | Verification obligation |
|---|---|---|
| <ID/path> | <change or invariant> | <UT/IT/ST ID or required observable proof> |

## Supersession contract

- Proposed: alternatives and consequences remain open to correction.
- Accepted: decision and rationale are stable; downstream artifacts reference this ID.
- Rejected: no downstream authority; record rejection reason without deleting history.
- Superseded: `supersedes`/replacement references form an explicit chain; old consequences remain historical.

### Completion contract

- [ ] Question, drivers, at least two credible options, selection, tradeoffs, affected scope, and verification are complete before acceptance.
