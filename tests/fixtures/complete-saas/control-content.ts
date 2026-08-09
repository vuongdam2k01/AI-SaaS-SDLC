export const CONTROL_BODIES: Record<string, string> = {
  architectural_decision: `# ADR-APPROVAL-001 — Approval consistency model

## Purpose and boundary

- Decision scope: concurrency control for a single request decision.
- Included consequences: request version, transaction, conflict response, and regression coverage.
- Excluded decisions: database vendor, deployment topology, and notification delivery.
- Decision authority: the choice constrains multiple design and verification artifacts over time.

## Decision question

How should concurrent approval decisions preserve INV-002 while returning a deterministic response?

## Context and drivers

| Driver | Source artifact or evidence | Importance | Constraint or desired property |
|---|---|---|---|
| one binding decision | SYSTEM-INVARIANTS#INV-002 | critical | exactly one pending-to-terminal transition |
| safe retry | FTR-APPROVAL-001#FL-02 | high | stale clients observe conflict without mutation |

## Options considered

| Local ID | Option | Benefits | Costs or risks | Fit to drivers | Rejection reason |
|---|---|---|---|---|---|
| OPT-01 | optimistic request version checked inside the decision transaction | simple retry and visible conflict | clients must reload on contention | satisfies both drivers | selected |
| OPT-02 | last-write-wins terminal update | fewer client conflicts | can overwrite binding authority and audit history | violates INV-002 | rejected because it permits two apparent decisions |

## Decision

- Selected option: OPT-01.
- Decision statement: every decision supplies the observed version; the transaction commits only while the request is pending at that version.
- Applicability: API-APPROVAL-001 and any future writer of ENT-APPROVAL-001 terminal state.
- Exceptions: none for binding decisions.

## Consequences

### Positive

- A single atomic predicate protects state and audit history while exposing a stable conflict.

### Negative and accepted risks

- A stale approver must reload before understanding the winning decision.

### Follow-on constraints

- API processing and integration tests must preserve and assert version/conflict behavior.

## Affected scope and verification

| Artifact or path | Required consequence | Verification obligation |
|---|---|---|
| API-APPROVAL-001 | check pending state and expected version inside transaction | IT-APPROVAL-001#TC-03 |
| ENT-APPROVAL-001 | retain version and one-decision constraint | IT-APPROVAL-001#TC-01 and TC-03 |

## Supersession contract

This accepted record is immutable. A changed consistency choice requires a successor ADR with an explicit supersedes edge and impact closure.
`,
  issue: `# ISS-APPROVAL-001 — Decision transaction mismatch

## Purpose and boundary

- Discrepancy class: verification and data consistency.
- First observed in: RESULT-EXEC-001 for IT-APPROVAL-001#TC-03.
- Included correction scope: decision transaction predicate and its integration regression.
- Excluded follow-up: queue prioritization and notification delivery.

## Observation

- Reproduction or inspection context: configured local integration command exited non-zero during Reconciliation.
- Actual: the integration execution failed before a successor baseline could be created.
- Expected: IT-APPROVAL-001#TC-03 permits one decision and returns one conflict.
- Evidence: RESULT-EXEC-001 and its engine-bound execution log.

## Expected authority

| Authority artifact and local ID | Contract statement | Why authoritative | Ambiguity found |
|---|---|---|---|
| ADR-APPROVAL-002, API-APPROVAL-001#V-02 | stale or competing decision preserves the first terminal state | successor decision and API processing own consistency | none |

## Impact and affected closure

- Severity basis: a second binding decision would violate audit authority.
- Security/data impact: integrity risk only in this synthetic failure; no confidential data is used.
- Workaround: serialize fixture decisions until the predicate is repaired.

### Affected artifacts

| Artifact or path | Impact | Required change | Closure evidence |
|---|---|---|---|
| API-APPROVAL-001 | transaction predicate may admit stale version | enforce pending state and expected version together | IT-APPROVAL-001#TC-03 and RESULT-EXEC-002 |

## Resolution

- Root cause: the inspected fixture implementation command represented a missing atomic version predicate.
- Corrected authority or implementation: decision commit now checks pending state and expected version in one operation.
- Compatibility consequence: stale clients receive the already-specified conflict response.
- Remaining limitation: none inside the documented boundary.

## Regression evidence

| Verification ID and case | Before | After | Result artifact |
|---|---|---|---|
| IT-APPROVAL-001#TC-03 | configured execution failed | configured execution passes after repair | RESULT-EXEC-002 |

## Lifecycle and closure contract

The observed failure, authority, minimal repair, integrity impact, and failed-then-passing engine evidence are retained; recurrence requires reopening or a successor issue.
`
};
