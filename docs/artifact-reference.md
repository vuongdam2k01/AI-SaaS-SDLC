# Artifact Reference

Canonical product records live under layers `01` through `05`. Every Markdown artifact has a permanent ID, canonical type/path, lifecycle status and forward relationships. Reverse dependencies and coverage views are generated.

## Foundation records

These singleton documents are initialized at fixed paths and have catalog-backed active-content contracts.

| Layer | Fixed records |
|---|---|
| Discovery | `IDEA-ORIGINAL`, `IDEA-DEFINITION`, `EVIDENCE-LEDGER`, `CUSTOMER-AND-PROBLEM`, `MARKET-LANDSCAPE`, `COMPETITIVE-AND-COMMERCIAL`, `FEASIBILITY-AND-RISK`, `OPPORTUNITY-DEFINITION` |
| Product | `PRODUCT-REQUIREMENTS`, `QUALITY-REQUIREMENTS`, `ACCESS-CONTROL`, `SYSTEM-INVARIANTS` |
| Design | `ARCHITECTURE-OVERVIEW`, `UX-RULES`, `ERROR-CATALOG` |
| Verification | `TEST-POLICY` |
| Control | `QUESTIONS` |

The fixed non-Markdown contracts `SDLC-CONFIG`, `OPENAPI-CONTRACT`, `PHYSICAL-SCHEMA` and `SCREEN-TRANSITIONS` also have stable graph identities. Their hashes participate in baselines and impact analysis.

## Scalable records

The pinned catalog contains 24 scalable artifact types.

| Layer | Catalog type | Permanent ID | Responsibility |
|---|---|---|---|
| Discovery | `ideal_customer_profile` | `ICP-*` | Selected segment boundary and evidence |
| Discovery | `persona` | `PERSONA-*` | Distinct role, goals, constraints and evidence |
| Discovery | `problem` | `PROBLEM-*` | Independently traceable selected problem |
| Discovery | `competitor` | `COMPETITOR-*` | Significant alternative and attributable comparison |
| Product | `feature` | `FTR-*` | Outcome, behavior, rules and `AC-*` criteria |
| Product | `use_case` | `UC-*` | Actor-system main, alternate and error paths |
| Product | `business_flow` | `FLOW-*` | Cross-feature/state sequence, decisions and compensation |
| Design | `screen` | `SCR-*` | Screen regions, controls, actions, validation and transitions |
| Design | `component` | `CMP-*` | Reused interaction contract for real consumers |
| Design | `subsystem` | `SUB-*` | Non-trivial capability boundary and implementation mapping |
| Design | `api_processing` | `API-*` | Authorization, processing, transactions and side effects |
| Design | `entity` | `ENT-*` | Domain identity, state, invariants and schema mapping |
| Design | `external_integration` | `INT-*` | Provider, mapping, reliability and secret boundary |
| Design | `job` | `JOB-*` | Durable or scheduled processing and retry behavior |
| Design | `event` | `EVT-*` | Versioned event envelope, delivery and consumers |
| Design | `platform_target` | `PLT-*` | Platform constraints, permissions, distribution/update behavior and local-data migration |
| Verification | `unit_test_backend` | `UT-API-*` or `UT-CORE-*` | Backend and platform-neutral core unit-test specification |
| Verification | `unit_test_frontend` | `UT-UI-*` | Frontend unit-test specification |
| Verification | `unit_test_job` | `UT-JOB-*` | Job unit-test specification |
| Verification | `integration_test` | `IT-*` | Real cross-component, persistence or provider boundary |
| Verification | `system_test` | `ST-*` | Actor journey and cross-surface behavior |
| Verification | `test_result` | `RESULT-EXEC-*` | Engine-rendered execution evidence; never model-authored |
| Control | `issue` | `ISS-*` | Concrete mismatch, authority, repair and regression evidence |
| Control | `architectural_decision` | `ADR-*` | Durable choice among viable alternatives |

Security, privacy, performance, accessibility and AI behavior are viewpoints within UT, IT and ST, not additional test levels.

## Creation and completion

Create new scalable drafts through `artifact create`, which resolves the consuming repository's pinned catalog and canonical target. Creation requires an active flow, enforces that flow's allowed artifact types, refuses collisions and cannot create result artifacts.

Before a draft becomes `active` and before a baseline is accepted, the engine checks its pinned content contract: required sections, non-empty content, required tables and rows, unresolved placeholders, unchanged template content and required local-ID namespaces. Metadata, canonical locations, references, lifecycle, immutable history and execution provenance are validated separately. See [Pattern to Instance](pattern-to-instance.md).

## Relationships and implementation mapping

Artifacts declare only forward relationships:

- `depends_on`: canonical upstream contracts;
- `decisions`: applicable `ADR-*` records;
- `writes_to`: shared state or contracts changed by the artifact;
- `supersedes`: the permanent predecessor retained in history;
- `implementation`: `<implementation-source-id>:<relative-path>` links.

The engine builds reverse edges and historical impact closure. Implementation mappings must stay inside a configured source and resolve to an existing path. Generated indexes, evidence coverage, acceptance traceability, test selection and impact views are projections, not canonical edits.

## Lifecycle and immutability

IDs and canonical locations are permanent. Deprecated, retired and superseded records remain present and become immutable after baselining. The original idea is immutable after capture. An accepted ADR body is immutable; change it with a successor ADR. A result is bound to its exact `EXEC-*` record, command, source snapshot and output digest.

Status is the wrong instrument for a partial retirement. Set `deprecated` or `retired` only when the whole artifact has stopped being the authority for anything; a retired artifact is immutable and no live artifact may depend on it, so retire it only after its dependents have moved. When part of the artifact survives, leave it `active` and deprecate the specific business rule inside it, naming the change that deprecated it, its replacement and the condition for removal.
