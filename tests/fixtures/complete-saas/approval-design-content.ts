export const APPROVAL_DESIGN_BODIES: Record<string, string> = {
  screen: `# SCR-APPROVAL-001 — Approval decision view

## Purpose and boundary

- User outcome: inspect an assigned request and make one informed decision.
- Included view states: loading, pending, validation error, approved, rejected, and conflict.
- Excluded responsibilities: API authorization, transaction behavior, and reusable visual styling.
- Applicable feature/use case: FTR-APPROVAL-001#AC-01–AC-03 and UC-APPROVAL-001.

## Access and context

| Actor or role | Access rule ID | Entry condition | Data scope | Denied behavior |
|---|---|---|---|---|
| assigned approver | ACCESS-002 | authenticated route to assigned request | current tenant and request only | show ERR-FORBIDDEN state without request details |

## Regions

| Local ID | Region | Purpose | Visible when | Empty or loading behavior |
|---|---|---|---|---|
| A-01 | request summary | show title, submitter, and current state | authorized request loaded | labeled loading state; safe not-found/denied state |
| A-02 | decision controls | capture approve or reject intent | request is pending and assigned | hidden for terminal states |

## Fields and controls

| Local ID | Region | Type | Label | Source | Required | Format or constraints | Default |
|---|---|---|---|---|---|---|---|
| O-01 | A-01 | output | Status | ENT-APPROVAL-001#A-04 | yes | pending, approved, or rejected | pending |
| I-01 | A-02 | input | Rejection reason | user input | conditional | 1–500 trimmed characters when rejecting | empty |
| B-01 | A-02 | button | Approve | local intent | no | enabled while pending and not submitting | enabled |
| B-02 | A-02 | button | Reject | local intent | no | requires valid I-01 | disabled until reason is valid |

## Actions

| Local ID | Trigger | Preconditions | Processing reference | Success | Failure |
|---|---|---|---|---|---|
| E-01 | Activate B-01. | ACCESS-002; pending; current version. | API-APPROVAL-001 | announce approved and disable controls | show safe API error; retain inputs and authoritative state |
| E-02 | Activate B-02. | ACCESS-002; pending; V-01 passes. | API-APPROVAL-001 | announce rejected with reason and disable controls | focus I-01 for validation, or show safe conflict |

## Validation

| Local ID | Applies to | Rule | Exact response | Timing |
|---|---|---|---|---|
| V-01 | I-01 and E-02 | FTR-APPROVAL-001#BR-02 | “Enter a rejection reason between 1 and 500 characters.” | on reject and after touched input change |

## Transitions

| Local ID | From | Trigger | To | Guard or state passed |
|---|---|---|---|---|
| T-01 | pending view | E-01 success | approved terminal view | returned request ID, version, actor, and decided_at |
| T-02 | pending view | E-02 success | rejected terminal view | returned request ID, reason, version, actor, and decided_at |

## Accessibility and rationale

- Focus order and restoration: summary, reason, approve, reject; errors restore focus to the first invalid control.
- Keyboard and non-pointer operation: all controls use native buttons/input and work with Enter/Space.
- Labels, instructions, and error association: I-01 has a persistent label and V-01 is programmatically associated.
- Announced state changes: terminal state and API errors use a polite live region; validation uses an assertive error summary.
- Design rationale and rejected alternatives: separate buttons expose the consequence more clearly than a hidden menu.

## Completion contract

Regions, fields, actions, validation, transitions, access, failures, and deterministic UI states are fully mapped.
`,
  api_processing: `# API-APPROVAL-001 — Commit an approval decision

## Purpose and boundary

- Processing responsibility: authorize and atomically commit approve or reject for one request.
- Included operation IDs: decideApprovalRequest.
- Excluded responsibilities: request submission, notification delivery, and wire schema ownership.
- Invoked by: SCR-APPROVAL-001#E-01 and SCR-APPROVAL-001#E-02.

## Interface reference

| OpenAPI operationId | Method and path for orientation | Request schema | Success schema | Error codes |
|---|---|---|---|---|
| decideApprovalRequest | POST /approval-requests/{requestId}/decision | ApprovalDecisionInput | ApprovalRequest | ERR-FORBIDDEN, ERR-VALIDATION, ERR-DECISION-CONFLICT |

- Wire authority: 03-design/interfaces/openapi.yaml.
- Conflict rule: OpenAPI owns fields; this document owns authorization and processing.

## Authorization

| Access rule ID | Subject | Resource scope | Decision point | Denied behavior |
|---|---|---|---|---|
| ACCESS-002 | authenticated assigned approver | request ID inside subject tenant | before returning request data and before mutation | ERR-FORBIDDEN and no read disclosure or state change |

## Validation and errors

| Local ID | Condition | Validation or rule | Error-catalog code | State guarantee |
|---|---|---|---|---|
| V-01 | decision is reject and trimmed reason length is outside 1–500 | FTR-APPROVAL-001#BR-02 | ERR-VALIDATION | request version, state, and history unchanged |
| V-02 | request is terminal or expected version differs | INV-002 | ERR-DECISION-CONFLICT | first terminal decision remains authoritative |

## Processing

| Local ID | Step | Input | Rule or dependency | Output |
|---|---|---|---|---|
| P-01 | Load tenant-scoped request and authorize assignment. | subject, requestId | ACCESS-002 and INV-001 | authorized pending request or safe denial |
| P-02 | Validate decision, reason, state, and expected version. | decision input and request | BR-02 and INV-002 | normalized decision or stable error |
| P-03 | Commit terminal state and one decision record. | normalized decision | ENT-APPROVAL-001 transitions | updated request and decision audit row |

## Transactions and idempotency

- Transaction boundary: P-02 through S-02; commit only if request version and pending state still match.
- Rollback guarantee: no terminal state or decision row survives a failed commit.
- Idempotency key: request ID plus expected version and actor ID.
- Duplicate behavior: same committed decision returns the current representation; a competing decision returns ERR-DECISION-CONFLICT.
- Concurrency behavior: optimistic version check ensures exactly one pending-to-terminal transition.

## Side effects and data access

| Local ID | Type | Target | Operation | Timing | Failure behavior |
|---|---|---|---|---|---|
| S-01 | read | ENT-APPROVAL-001 | tenant-scoped load by request ID | before mutation transaction | safe denial without detail |
| S-02 | write | ENT-APPROVAL-001 | update terminal state and insert decision audit row | inside one transaction | rollback and return stable conflict/error |

## Implementation mapping

| Processing or side-effect IDs | Source path | Symbol | Verification IDs |
|---|---|---|---|
| P-01–P-03, S-01–S-02 | implementation-unconfigured | decideApprovalRequest | UT-API-APPROVAL-001, IT-APPROVAL-001, ST-APPROVAL-001 |

## Completion contract

OpenAPI authority, authorization order, validation, errors, transaction, idempotency, concurrency, writes, and verification handoffs are explicit.
`,
  entity: `# ENT-APPROVAL-001 — Approval request

## Purpose and boundary

- Domain meaning: a tenant-owned request for one client decision on a named deliverable.
- Identity: immutable request UUID inside a tenant.
- Included concepts: assignment, lifecycle state, version, rejection reason, and decision audit metadata.
- Excluded or separate entities: deliverable content, user identity, billing, and notification delivery.

## Ownership and tenancy

- Owning subsystem: approval workflow boundary described by ARCHITECTURE-OVERVIEW.
- Tenant/organization scope: every row carries tenant_id and may be read or changed only inside that tenant.
- Creation authority: ACCESS-001 through request submission processing.
- Mutation authority: API-APPROVAL-001 under ACCESS-002.
- Read authority: ACCESS-001 and ACCESS-002.

## Attributes

| Local ID | Name | Meaning | Type | Required | Constraints | Sensitivity |
|---|---|---|---|---|---|---|
| A-01 | request_id | immutable request identity | UUID | yes | unique with tenant_id | internal identifier |
| A-02 | tenant_id | isolation owner | UUID | yes | INV-001; immutable | confidential |
| A-03 | assigned_approver_id | actor allowed to decide | UUID | yes | tenant member | confidential |
| A-04 | status | lifecycle state | enum | yes | pending, approved, rejected | internal |
| A-05 | version | optimistic concurrency value | positive integer | yes | increments once on terminal decision | internal |
| A-06 | rejection_reason | approver-provided reason | string | conditional | required only for rejected; 1–500 trimmed chars | confidential |

## States and invariants

| Local ID | Type | Rule | Applies when | Enforcement owner |
|---|---|---|---|---|
| ST-01 | state | pending accepts exactly one authorized decision. | after valid submission | API-APPROVAL-001 |
| ST-02 | state | approved is terminal and has approver and decided_at. | after approve | API-APPROVAL-001 and database constraint |
| ST-03 | state | rejected is terminal and also has a valid reason. | after reject | API-APPROVAL-001 and database constraint |
| INV-01 | invariant | tenant_id never changes and scopes every access. | all lifecycle states | API-APPROVAL-001 and schema |
| INV-02 | invariant | one request has at most one terminal decision audit row. | terminal transition | transaction and unique constraint |

### Allowed transitions

| From state | Trigger | To state | Guard | Side effects |
|---|---|---|---|---|
| ST-01 | authorized approve | ST-02 | ACCESS-002 and expected version match | insert one decision audit row |
| ST-01 | authorized reject | ST-03 | ACCESS-002, BR-02, expected version match | insert one decision audit row with reason |

## Relationships

| Related entity | Cardinality | Ownership | Constraint | Deletion consequence |
|---|---|---|---|---|
| tenant identity authority | many requests to one tenant | identity subsystem | tenant_id must resolve within workspace | tenant deletion follows product retention policy |

## Retention and deletion

- Retention basis and duration: fixture policy retains request and decision history while the workspace exists.
- Deletion trigger and authority: workspace owner deletion under a future explicit policy.
- Deletion semantics: no implicit hard delete in this feature.
- Export or portability: request state, actor, reason, and timestamps are exportable to an authorized tenant owner.
- Sensitive-data handling: minimize reason text and restrict it to authorized tenant participants.

## Schema mapping

| Attribute or relationship ID | DBML table and column | Application symbol | Migration note |
|---|---|---|---|
| A-01 | approval_requests.request_id | ApprovalRequest.id | immutable primary identity |
| A-02 | approval_requests.tenant_id | ApprovalRequest.tenantId | backfill prohibited without tenant authority |
| A-04, A-05 | approval_requests.status, approval_requests.version | ApprovalRequest.status, ApprovalRequest.version | add version before enabling concurrent decisions |

## Completion contract

Identity, tenancy, attributes, states, invariants, transitions, retention, schema mapping, and decision ownership are explicit.
`
};
