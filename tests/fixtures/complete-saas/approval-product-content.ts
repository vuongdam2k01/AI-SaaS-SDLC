export const APPROVAL_PRODUCT_BODIES: Record<string, string> = {
  feature: `# FTR-APPROVAL-001 — Decide an approval request

## Purpose and boundary

- Capability outcome: an assigned client approver makes one binding decision on a submitted request.
- Included behavior: submit, approve, reject, conflict, denial, and preserved history.
- Excluded behavior: multi-stage routing, billing, and editing the deliverable.
- Non-purpose: this artifact does not own screen layout, wire schema, or transaction mechanics.

## Outcome and applicability

| Actor or system | Preconditions | Trigger | Success outcome | Related requirement or problem |
|---|---|---|---|---|
| assigned client approver | Tenant membership; request is pending and assigned to actor | approve or reject | Request reaches one terminal state with actor, reason, and timestamp | REQ-002 |

## Observable behavior

| Local ID | Given | When | Then | Applicability |
|---|---|---|---|---|
| BH-01 | A tenant-scoped request is pending for the assigned approver. | The approver submits approve with the current version. | The request becomes approved and one decision record is visible. | ACCESS-002 and pending state. |
| BH-02 | A tenant-scoped request is pending for the assigned approver. | The approver submits reject with a non-empty reason. | The request becomes rejected and the exact reason is visible. | ACCESS-002 and pending state. |

## Business rules

| Local ID | Rule | Applies when | Does not apply when | Authority reference |
|---|---|---|---|---|
| BR-01 | Only the assigned tenant approver may decide the request. | approve or reject | contributor submission | ACCESS-002 |
| BR-02 | Reject requires a reason of 1–500 characters after trimming. | reject | approve | REQ-002 |

## State and failure model

| Local ID | Type | Trigger or condition | Observable state or response | Recovery or next action |
|---|---|---|---|---|
| ST-01 | state | Contributor submits a valid draft. | pending with version 1 | Assigned approver may decide. |
| ST-02 | state | Assigned approver commits approve or reject. | approved or rejected with immutable decision metadata | No further decision is allowed. |
| FL-01 | failure | Actor lacks ACCESS-002. | ERR-FORBIDDEN and no request detail or mutation | Use the assigned tenant identity. |
| FL-02 | failure | Version is stale or request is terminal. | ERR-DECISION-CONFLICT and unchanged state | Reload the authoritative request. |

## Acceptance criteria

| Local ID | Verifiable criterion | Covers behavior or rule IDs | Required test level | Evidence produced |
|---|---|---|---|---|
| AC-01 | Assigned approver approval returns approved and persists exactly one matching decision. | BH-01, BR-01, ST-01, ST-02 | UT / IT / ST | response, request row, decision row |
| AC-02 | Rejection without a trimmed reason is rejected and request remains pending. | BH-02, BR-02, FL-02 | UT / IT | validation error and unchanged version |
| AC-03 | Cross-tenant or second decisions are denied or conflict and preserve the first terminal state. | BR-01, FL-01, FL-02 | UT / IT / ST | safe error and unchanged history |

## Traceability

| Direction | Artifact IDs | Relationship |
|---|---|---|
| Upstream | PRODUCT-REQUIREMENTS, ACCESS-CONTROL, SYSTEM-INVARIANTS | requirements, authority, and consistency constraints |
| Design | SCR-APPROVAL-001, API-APPROVAL-001, ENT-APPROVAL-001 | decision interaction, processing, and state |
| Verification | UT-API-APPROVAL-001, IT-APPROVAL-001, ST-APPROVAL-001 | AC-01 through AC-03 coverage |

## Completion contract

Scope, local IDs, failures, observable criteria, and downstream handoffs are complete; design and implementation mechanics remain downstream.
`,
  use_case: `# UC-APPROVAL-001 — Decide a submitted request

## Purpose and boundary

- Actor goal: make and confirm one binding decision.
- Included interaction: open a pending assigned request through seeing the terminal state.
- Excluded interaction: request submission and reassignment.
- Non-purpose: no layout, protocol, or source-code sequence is defined here.

## Actors and preconditions

| Actor or participant | Role in use case | Required access | Preconditions | Authority reference |
|---|---|---|---|---|
| assigned client approver | decision authority | ACCESS-002 | authenticated in request tenant; request pending | FTR-APPROVAL-001#BR-01 |

## Trigger and guarantees

| Local ID | Concern | Statement | Observable evidence |
|---|---|---|---|
| G-01 | trigger | An assigned approver opens a pending request and chooses approve or reject. | The decision controls are reachable. |
| G-02 | success guarantee | One terminal decision and its audit metadata are observable. | Terminal status plus exactly one audit row. |
| G-03 | minimal guarantee | Failure preserves request state, version, and history. | Status, version, and audit rows unchanged after any error path. |

- Related feature acceptance: FTR-APPROVAL-001#AC-01, FTR-APPROVAL-001#AC-02, FTR-APPROVAL-001#AC-03.

## Main flow

| Local ID | Initiator | Action or system behavior | Information used | Resulting state |
|---|---|---|---|---|
| M-01 | approver | Opens the assigned request. | tenant identity and request ID | Pending request is visible without cross-tenant data. |
| M-02 | approver | Chooses approve and confirms. | current version and FTR-APPROVAL-001#BR-01 | Request is approved with one decision record. |

## Alternate flows

| Local ID | Branches from | Condition | Steps or outcome | Returns to |
|---|---|---|---|---|
| A-01 | M-02 | Approver chooses reject. | Provide reason, validate BR-02, commit rejected decision. | terminal rejected state |

## Error flows

| Local ID | Origin | Failure condition | Observable response | State guarantee | Recovery |
|---|---|---|---|---|---|
| X-01 | M-01 | Actor is outside tenant or not assigned. | ERR-FORBIDDEN without request detail | Request and history unchanged. | Authenticate as assigned approver. |
| X-02 | M-02 | Submitted version is stale. | ERR-DECISION-CONFLICT | First terminal decision remains authoritative. | Reload terminal state. |

## Traceability

| Direction | Artifact IDs | Relationship |
|---|---|---|
| Upstream | FTR-APPROVAL-001, ACCESS-CONTROL, SYSTEM-INVARIANTS | AC-01–AC-03, decision authority, one-decision invariant |
| Design | SCR-APPROVAL-001, API-APPROVAL-001, ENT-APPROVAL-001 | visible interaction and authoritative mutation |
| Verification | UT-API-APPROVAL-001#TC-01, IT-APPROVAL-001#TC-01, ST-APPROVAL-001#TC-01 | branch and guarantee coverage |

## Completion contract

Goal, trigger, guarantees, deterministic main, alternate, and error outcomes are complete; mechanics remain in design.
`,
  business_flow: `# FLOW-APPROVAL-001 — Request-to-decision flow

## Purpose and boundary

- Business outcome: a submitted deliverable receives one attributable client decision.
- Start boundary: contributor submits a valid draft request.
- End boundary: request is approved or rejected, or remains pending after a safe failure.
- Excluded processes: content creation, billing, and multi-stage routing.

## Participants and boundary

| Participant | Responsibility | Entry condition | Handoff produced | Authority reference |
|---|---|---|---|---|
| contributor | submit request for decision | tenant member with valid draft | pending request assigned to approver | ACCESS-001 |
| assigned approver | make binding decision | pending assigned request | approved or rejected request | ACCESS-002 |

## Entry and exit

| Local ID | Concern | Statement | Observable evidence |
|---|---|---|---|
| EE-01 | entry event | A valid contributor submission creates a tenant-scoped pending request. | A pending request exists with version 1. |
| EE-02 | successful exit | The assigned approver sees a terminal state and audit record. | Terminal status plus one audit row. |
| EE-03 | unsuccessful exits | A denied or invalid decision leaves the request pending; a conflict preserves the first terminal decision. | Status after each failure branch. |
| EE-04 | global invariants | INV-001 and INV-002 hold at every step, including after a failed decision. | Tenant scope and single-decision uniqueness. |

## Flow steps

| Local ID | Owner | Activity or referenced use case | Input state | Output state | Evidence or rule |
|---|---|---|---|---|---|
| S-01 | contributor | submit valid request | draft data | pending request version 1 | REQ-001, ACCESS-001 |
| S-02 | assigned approver | UC-APPROVAL-001 | pending request | approved or rejected request | FTR-APPROVAL-001#BR-01 |

## Decision points

| Local ID | After step | Decision rule | Outcome branches | Rule authority |
|---|---|---|---|---|
| D-01 | S-02 | Reject requires a trimmed reason; approve does not. | approve to terminal approved; reject to A-01 | FTR-APPROVAL-001#BR-02 |

## Alternate and compensation paths

| Local ID | Type | Origin | Trigger | Path or action | Final state |
|---|---|---|---|---|---|
| A-01 | alternate | D-01 | valid rejection reason | Commit rejected state and reason. | rejected |
| C-01 | compensation | S-02 | failure before transaction commit | Roll back decision insertion and version change. | unchanged pending or first terminal state |

## Traceability

| Direction | Artifact IDs | Relationship |
|---|---|---|
| Upstream | REQ-001, REQ-002, FTR-APPROVAL-001, UC-APPROVAL-001 | request and decision behavior |
| Design | SCR-APPROVAL-001, API-APPROVAL-001, ENT-APPROVAL-001 | interaction, transaction, and state model |
| Verification | IT-APPROVAL-001, ST-APPROVAL-001 | boundary and end-to-end coverage |

## Completion contract

Entry, exits, handoffs, decisions, alternates, compensation, and ownership are explicit and terminate at named states.
`
};
