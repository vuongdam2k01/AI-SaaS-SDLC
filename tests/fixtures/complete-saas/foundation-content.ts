const complete = "Complete for this fixture; later changes require a named semantic flow and attributable input.";

export const GENESIS_FOUNDATION_BODIES: Record<string, string> = {
  "01-discovery/idea-definition.md": `# Idea Definition

## Defined opportunity

Small agencies need one auditable place to submit, review, approve, and reject client deliverables without losing decision history in chat.

## Actors and context

An agency contributor submits a deliverable; a client approver makes the binding decision inside one tenant-scoped workspace.

## Intended outcome

Every request reaches a visible pending, approved, or rejected state with an attributable actor and timestamp.

## Assumptions and unknowns

The fixture assumes one approver is sufficient. Pricing willingness remains an explicit unknown and is not represented as researched fact.

## Boundaries

No billing, file editing, deployment, outreach, or regulated electronic-signature workflow is included.

## Completion contract

${complete}
`,
  "01-discovery/evidence-ledger.md": `# Evidence Ledger

## Evidence records

| Evidence ID | Claim or observation | Source | Source type | Observed or published date | Retrieved date | Strength | Applicability |
|---|---|---|---|---|---|---|---|
| EVD-FIXTURE-001 | Approval tools commonly expose request state and decision history. | https://approval.example.invalid/fixture-product-guide | synthetic fixture URL | 2026-08-01 | 2026-08-09 | fixture-only | Test input only; not public research. |

## EVD-FIXTURE-001

- URL: https://approval.example.invalid/fixture-product-guide
- Fixture status: Synthetic reserved-domain input, not inspected public research.

## Source quality rules

The reserved .invalid URL and every statement in this ledger are synthetic deterministic inputs. Model-backed evals must use real search and inspected pages before making public claims.

## Claim mapping

EVD-FIXTURE-001 informs the workflow-state hypothesis in CUSTOMER-AND-PROBLEM and PRODUCT-REQUIREMENTS; it does not establish market size or willingness to pay.

## Contradictions and aging

No contradiction is encoded. Any changed external claim requires Evidence Reassessment and a new evidence revision.

## Completion contract

${complete}
`,
  "01-discovery/market-landscape.md": `# Market Landscape

## Market definition

The fixture concerns client-facing approval coordination for small service agencies, not general project management.

## Category structure

Adjacent categories include proofing, project management, and document-signing products; this fixture asserts no market ranking.

## Demand and adoption signals

EVD-FIXTURE-001 is only a fixture observation that state and decision history are plausible category capabilities.

## Constraints and change drivers

Tenant isolation, clear decision authority, and preserved history constrain the product shape.

## Evidence and uncertainty

Demand, category size, and pricing remain unverified; no deterministic assertion is presented as live research.

## Completion contract

${complete}
`,
  "01-discovery/customer-and-problem.md": `# Customer and Problem

## Customer synthesis

The target fixture customer is a small agency coordinating deliverable decisions with client approvers across tenant boundaries.

## Problem synthesis

When requests and decisions live in chat, contributors cannot reliably determine the current authority, state, or rejection reason.

## Evidence and confidence

EVD-FIXTURE-001 weakly supports the workflow-state hypothesis. Persona detail and willingness to pay are unknown.

## Scope boundaries

The fixture covers submission and a single binding decision, not collaboration, invoicing, or content authoring.

## Completion contract

${complete}
`,
  "01-discovery/competitive-and-commercial.md": `# Competitive and Commercial

## Alternative landscape

Teams may use chat, project-management comments, or proofing tools. No comparative superiority claim is made.

## Comparative position

The product hypothesis emphasizes a small, explicit approval state machine and immutable decision history.

## Commercial model hypotheses

Per-workspace subscription is an untested hypothesis; price and packaging require real attributable reassessment evidence.

## Constraints and uncertainty

Competitor capabilities, prices, and customer willingness are intentionally unresolved in this synthetic fixture.

## Completion contract

${complete}
`,
  "01-discovery/feasibility-and-risk.md": `# Feasibility and Risk

## Feasibility dimensions

The core workflow is technically conventional, while authorization and concurrent decisions require explicit contracts and tests.

## Risk register

| Risk ID | Risk | Cause | Impact | Likelihood | Evidence | Mitigation or constraint | Residual uncertainty |
|---|---|---|---|---|---|---|---|
| RISK-001 | Cross-tenant decision exposure | Incorrect resource scoping | Confidential decision data disclosed | medium | Product invariant, not public evidence | Enforce tenant scope before reads or writes; cover denial in UT/IT/ST | Implementation quality remains unknown. |

## Assumptions and unknowns

One approver per request and moderate request volume are fixture assumptions.

## Mitigations and constraints

Atomic state transition, optimistic concurrency, and tenant-scoped authorization are mandatory downstream constraints.

## Completion contract

${complete}
`,
  "01-discovery/opportunity-definition.md": `# Opportunity Definition

## Opportunity statement

Give small agencies and their clients one tenant-scoped record for requesting and making a binding deliverable decision.

## Evidence synthesis

EVD-FIXTURE-001 supports only the plausibility of visible request state and history; commercial demand is unproven.

## Target boundaries

Initial scope is contributor submission and client approval or rejection for one workspace.

## Value and differentiation

The intended value is reduced ambiguity through explicit authority, transitions, reasons, and preserved history.

## Risks and assumptions

Adoption and price are assumptions; authorization leakage and concurrent decisions are product risks.

## Completion contract

${complete}
`,
  "02-product/product-requirements.md": `# Product Requirements

## Product scope

The product records tenant-scoped approval requests and binding approve or reject decisions with an audit trail.

## Functional requirements

| Requirement ID | Requirement | Rationale | Applicability | Source | Downstream artifacts |
|---|---|---|---|---|---|
| REQ-001 | An authorized contributor can submit a draft request for client decision. | Establish a single review object. | Tenant workspace with contributor and approver. | OPPORTUNITY-DEFINITION | FTR-APPROVAL-001 |
| REQ-002 | Only the assigned approver can approve or reject a pending request. | Preserve decision authority. | Pending request. | ACCESS-CONTROL | FTR-APPROVAL-001 |

## Requirement traceability

REQ-001 and REQ-002 are realized only after Product Evolution creates the referenced feature, behavior, design, and verification artifacts.

## Exclusions

Billing, outreach, production deployment, multi-step approvals, and content editing are excluded.

## Completion contract

${complete}
`,
  "02-product/access-control.md": `# Access Control

## Authority boundary

This artifact owns tenant and role authorization; screens and APIs must cite these rules rather than restating policy.

## Roles and subjects

Contributors create requests in their workspace. Assigned client approvers make the binding decision.

## Resources and actions

ApprovalRequest supports submit, read, approve, and reject actions within its tenant.

## Access rules

| Access ID | Subject or role | Resource | Action | Condition | Decision | Denial behavior |
|---|---|---|---|---|---|---|
| ACCESS-001 | contributor | ApprovalRequest | submit | Subject belongs to request tenant. | allow | Return ERR-FORBIDDEN; create nothing. |
| ACCESS-002 | assigned approver | ApprovalRequest | approve or reject | Subject matches approver and tenant; request is pending. | allow | Return ERR-FORBIDDEN; preserve state. |

## Denial behavior

Denials disclose no cross-tenant resource details and never mutate the request or its audit history.

## Completion contract

${complete}
`,
  "02-product/quality-requirements.md": `# Quality Requirements

## Quality scope

Authorization integrity, decision consistency, and observable audit history apply to the approval workflow.

## Quality requirements

| Quality ID | Attribute | Requirement | Measure | Applicability | Verification |
|---|---|---|---|---|---|
| Q-001 | security | No actor can observe or decide a request outside its tenant scope. | All cross-tenant attempts are denied without state change. | Every request read and decision. | UT-API-APPROVAL-001, IT-APPROVAL-001, ST-APPROVAL-001 |
| Q-002 | consistency | At most one binding decision is committed. | Concurrent second decision receives a conflict and history contains one decision. | Pending-to-terminal transition. | IT-APPROVAL-001 |

## Measurement and evidence

Only engine-bound RESULT artifacts from configured UT, IT, or ST commands count as execution evidence.

## Tradeoffs and boundaries

Strong per-request consistency is preferred over accepting two concurrent decisions; availability targets are not asserted.

## Completion contract

${complete}
`,
  "02-product/system-invariants.md": `# System Invariants

## Authority boundary

These invariants are mandatory across product, API, entity, and verification contracts.

## Invariants

| Invariant ID | Statement | Applicability | Enforcement owner | Observable violation | Verification |
|---|---|---|---|---|---|
| INV-001 | A request and every decision record remain in exactly one tenant. | All reads and writes. | API-APPROVAL-001 | Cross-tenant data is returned or changed. | UT-API-APPROVAL-001, IT-APPROVAL-001 |
| INV-002 | A request has at most one terminal decision. | Pending-to-approved or pending-to-rejected transition. | ENT-APPROVAL-001 and API-APPROVAL-001 | More than one decision is committed. | IT-APPROVAL-001 |

## Enforcement and observation

Authorization precedes access; the API uses a version check and the data constraint rejects a second terminal transition.

## Failure semantics

Denied, invalid, and conflicting requests preserve the prior state and return a stable safe error.

## Completion contract

${complete}
`
};

// Deliberately not part of GENESIS_FOUNDATION_BODIES: the architecture overview
// legitimately stays draft through Genesis, so adding it there would change the
// genesis bytes every existing test depends on. Tests that need an active
// architecture overview apply this body explicitly.
export const ARCHITECTURE_OVERVIEW_ACTIVE_BODY = `# Architecture overview

## System context

| Actor/external system | Need or exchanged capability | Trust/data boundary | Entry interface | Evidence/requirement IDs |
|---|---|---|---|---|
| Agency contributor | Submit deliverables for decision | Tenant-scoped session | Approval web client | REQ-001 |
| Client approver | Decide submitted requests | Tenant-scoped session | Approval web client | REQ-002 |

## Architectural boundaries

| Boundary/SUB ID | Inside | Outside | Owned data | Public contracts | Rationale/ADR |
|---|---|---|---|---|---|
| Approval domain | Request lifecycle and decision audit | Tenant identity issuance | approval_requests | API-APPROVAL-001 | fixture boundary, no ADR yet |

## Component responsibilities

| Component/subsystem | Responsibilities | Non-responsibilities | Dependencies | Quality/invariant constraints |
|---|---|---|---|---|
| Approval service | Validate scope, decide, audit | Identity provisioning | tenant identity authority | INV-001 tenant isolation |

## Data and control flow

1. A contributor submits a request through the approval client; the approval service validates tenant scope and the request reaches pending state.
2. An approver decides through API-APPROVAL-001; the decision commits exactly one audit row and the client observes the terminal state.

## Cross-cutting constraints

| Concern | Governing IDs | Architectural constraint | Enforcement owner | Verification |
|---|---|---|---|---|
| Tenant isolation | INV-001 | Every read and write scopes by tenant_id | Approval service | IT-APPROVAL-001 |

## Runtime topology

| Runtime unit | Grouped subsystems | Network boundary | Crossing contracts | Failure and scaling boundary |
|---|---|---|---|---|
| approval-web | Approval client surface | HTTPS to approval-service | API-APPROVAL-001 | Client restarts alone and holds no durable state |
| approval-service | Approval domain and audit | Database connection stays inside the unit | PHYSICAL-SCHEMA | Service and its database fail and scale together |

## Decision references

| ADR ID | Decision summary | Affected boundaries | Required consequences | Verification obligation |
|---|---|---|---|---|
| none yet | No accepted ADR constrains this fixture | Approval domain | none | none |

## Completion contract

${complete}
`;
