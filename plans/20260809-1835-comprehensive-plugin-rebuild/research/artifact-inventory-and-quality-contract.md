# Artifact Inventory and Quality Contract

## Common contract

Every live artifact has permanent metadata, explicit authority, upstream references, downstream use, lifecycle, completion criteria and meaningful content. Every scalable pattern includes instructions, allowed/excluded content, field semantics, stable sub-ID rules, at least one valid example, one failure/boundary example and a completion checklist. Placeholder tokens, empty mandatory tables and generic filler cannot become `active`.

## Discovery

| Artifact | Required content and role |
|---|---|
| `original-idea.md` | Immutable verbatim input, capture timestamp and declared constraints; never refined in place. |
| `idea-definition.md` | Normalized problem/solution hypothesis, constraint interpretation, assumptions vs known facts and unresolved material questions. |
| `evidence-ledger.md` | `EVD-*` per attributable observation: URL, source type/date/access, exact supported/contradicted claim, excerpt/paraphrase, scope, limitations and confidence. |
| `market-landscape.md` | Category boundaries, demand proxies, trend/regulatory/technology factors, market-size ranges with calculation/source limits and unknowns. |
| `customer-and-problem.md` | Segment comparison, jobs/workflow, pains/consequences, buyer/user distinction, public evidence and counter-evidence. |
| `competitive-and-commercial.md` | Direct/adjacent/manual/do-nothing alternatives, capability/pricing/position comparison, switching constraints, commercial hypotheses. |
| `feasibility-and-risk.md` | Product, technical, data/AI, security/privacy/regulatory, adoption and commercial risks with observable mitigation or invalidation signals. |
| `opportunity-definition.md` | Selected segment/problem, outcome promise, initial wedge, differentiator hypothesis, explicit exclusions and decision basis. |
| `ICP-*` | One evidence-grounded organization/customer class: qualifiers, trigger, current workflow, intensity, buying/adoption path and exclusions. |
| `PERSONA-*` | One role within an ICP: responsibilities, goals, decisions/permissions, information/trust needs and failure consequence; explicitly inferred from public evidence. |
| `PROBLEM-*` | One atomic problem: situation, job, workaround, frequency/severity evidence, root cause vs symptom and falsifiers. |
| `COMPETITOR-*` | One alternative profile: target, workflow/capabilities, pricing, strengths/boundaries, public complaints, source limits and implication. |

## Product

| Artifact | Required content and role |
|---|---|
| `product-requirements.md` | Product goal, target outcomes, scope/non-goals, measurable success, constraints, release boundary and feature index. |
| `access-control.md` | Tenant boundary, actor/role definitions, resource-action matrix, ownership transitions, privileged operations and denial behavior. |
| `quality-requirements.md` | Checkable security, privacy, performance/capacity, reliability/degradation, accessibility/compatibility and conditional AI behavior requirements with IDs. |
| `system-invariants.md` | Permanent `INV-*` statements, scope, rationale, enforcement point and verification references. |
| `FTR-*` | Problem/outcome, actors/access, scope/non-scope, observable behavior, state model, shared writes, acceptance criteria `AC-*`, compatibility and retirement behavior. |
| `UC-*` | Actor/trigger, preconditions, numbered main path, permanent alternate/error paths, postconditions and mapped feature/AC rules. |
| `FLOW-*` | Cross-use-case business flow, participants, entry/exit states, numbered steps, invariants, compensation/recovery and feature interactions. |

## Design

| Artifact | Required content and role |
|---|---|
| `architecture-overview.md` | Context, trust/tenant boundaries, components, responsibilities, control/data paths, shared state, consistency model and conditional technology areas. |
| `ux-rules.md` | Canonical navigation, interaction, form, feedback state, language, accessibility and responsive rules; SCR/CMP reference rather than copy. |
| `screen-transitions.mmd` | Machine-readable transition graph keyed by `SCR-*` and transition IDs. |
| `SCR-*` | Overview/route/access; region map; field table with local IDs; action/event table; validations/messages; loading/empty/error/degraded states; transitions; accessibility and rationale. |
| `CMP-*` | Reuse boundary and callers; slots/variants; elements; actions; validation; accessibility; caller-owned vs component-owned behavior. |
| `SUB-*` | Capability boundary, inputs/outputs/stores, algorithms or AI context/output contract, quality/cost budgets, pinning/versioning, degradation, evaluation and security exposure. |
| `openapi.yaml` | Canonical HTTP payload/status/security contract with operation IDs mapped to `API-*`; no processing duplication. |
| `API-*` | Metadata/callers; shared-rule references; auth/tenant and validation mappings; numbered processing sequence; transaction/concurrency/idempotency; writes/events; errors/degradation; OpenAPI and user-action reverse mapping. |
| `schema.dbml` | Canonical physical relational model; entities map logical fields to physical structures. |
| `ENT-*` | Domain meaning/ownership, identity/tenant, field definitions and constraints, state transitions/invariants, retention/deletion/export and physical mapping. |
| `INT-*` | Provider purpose, auth/secrets, contract/data classification, quotas/cost, timeout/retry/idempotency, callbacks, degradation/recovery and sandbox verification. |
| `JOB-*` | Trigger/input selection, state machine, processing, concurrency/idempotency, retry/terminal failure, cancellation/recovery, outputs/events and observability. |
| `EVT-*` | Semantic meaning, producer/transaction boundary, schema/version, ordering/deduplication, consumers, replay/failure and sensitive-data classification. |
| `error-catalog.md` | Permanent error IDs, owning boundary, trigger, user-safe message, API mapping, retryability and support/telemetry behavior. |

## Verification

| Artifact | Required content and role |
|---|---|
| `test-policy.md` | Exact UT/IT/ST boundaries, branch/tool mapping, case-ID conventions, test-data/evidence rules and handoff policy. |
| `UT-API-*` | Unit target and exclusions; upstream trace; controlled collaborators; test data; positive/boundary/negative cases; assertions; implementation mapping; IT/ST handoff. |
| `UT-UI-*` | Screen/component target and exclusions; route/API mocks; behavior/accessibility cases; unchanged-state assertions; implementation mapping; IT/ST handoff. |
| `UT-JOB-*` | Job unit boundary, clock/queue/store controls, state/concurrency/retry cases, deterministic numeric/AI comparison rules and IT/ST handoff. |
| `IT-*` | Real connected boundary, environment/dependency controls, data setup/cleanup, contract/state/side-effect cases, failure/recovery/degradation and unresolved items. |
| `ST-*` | User/business journey, actor/environment, prerequisites/data, stepwise observations, AC/INV/access checks, cross-feature regression and quality viewpoints. |
| `RESULT-*` | Engine-only 1:1 execution result: command identity, source revision, environment/cwd, timestamps, exit code, output digest, case summary, failure/issue links and cleanup/evidence state. |

## Control

| Artifact | Required content and role |
|---|---|
| `questions.md` | `Q-*`, exact missing decision, why it matters, affected IDs, owner/source able to resolve it, status and resolution link. |
| `ISS-*` | Concrete observation, expected/observed, authority analysis, affected closure, minimal repair, regression evidence and closure criteria. |
| `ADR-*` | Status, context, exact question, drivers, comparable viable options, decision, rationale, consequences, affected artifacts, verification obligations and supersession. |

## Generated and internal records

Generated projections must cover artifact/relationship indexes, baseline manifest, evidence-to-claim coverage, AC-to-design/test traceability, feature coverage, shared-writer conflict map, implementation map/order, stale artifacts, issues, decisions and per-change/per-decision impact. Internal records retain current state, active flow, immutable change intent and execution provenance; they are never user-authored.

## Activation quality bar

An artifact may be `active` only when mandatory sections are non-placeholder, stable local IDs are unique, every cited ID resolves, required upstream authority exists, required downstream coverage is present for the current flow, contradictions/unknowns are explicit and its completion predicate passes. This is structural validation, not a prose-style gate.

## Unresolved questions

None.

