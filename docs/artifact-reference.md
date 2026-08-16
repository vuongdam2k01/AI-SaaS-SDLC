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

`ARCHITECTURE-OVERVIEW` also owns the runtime topology: the grouping of subsystems into runtime units and the contracts that cross network boundaries, as descriptive design truth with deployment operations out of scope.

The fixed non-Markdown contracts `SDLC-CONFIG`, `OPENAPI-CONTRACT`, `PHYSICAL-SCHEMA` and `SCREEN-TRANSITIONS` also have stable graph identities. Sibling files are discovered as further first-class contracts of the same types — `03-design/interfaces/*.yaml` or `.yml` as `WIRE-*`, `03-design/data/*.dbml` as `SCHEMA-*`, `03-design/*.mmd` as `TRANSITIONS-*` — with identities derived from their filenames and permanent once baselined. All their hashes participate in baselines and impact analysis, and in a multi-file family each `API-*`/`ENT-*`/`SCR-*` names its owning file in `depends_on`.

## Scalable records

The pinned catalog contains 24 scalable artifact types. Each catalog generation carries a version — `patterns list` reports the one a repository actually pinned — and a live artifact whose type its pinned catalog predates is reported as `CONTENT_CONTRACT_UNPINNED`, an error, because an artifact no content contract covers looks validated without being validated. `patterns migrate` moves an existing repository onto a newer generation and reports what changed; it re-pins contracts and never edits an instance.

Generation 5 also adds a third contract layer beside patterns and foundations: the four `00-system` documents. They are not artifacts and never become ones — no graph edge, no baseline entry, no projection row — but they state the rules every artifact is graded against, and until this layer existed nothing validated them. A shortfall there is reported as `SYSTEM_DOCUMENT_INCOMPLETE`, a warning, because a repository initialized under an older template carries a copy it did not author.

Generation 5 makes every normative section of a pattern an identified table. Behavior that used to sit in prose bullets — a screen's accessibility requirements, an operation's transaction and idempotency semantics, a job's concurrency rules, an event's emission, delivery and evolution semantics, an integration's authentication, reliability and observability rules, an entity's ownership, transitions, relationships and retention, a use case's guarantees, a flow's entry and exit, a decision's statement and follow-on constraints, a unit specification's exclusions — now carries local IDs (`AX-`, `TX-`, `CC-`, `EM-`/`DL-`/`EP-`, `AU-`/`RL-`/`OB-`, `OW-`/`T-`/`REL-`/`RT-`, `G-`, `EE-`, `DEC-`/`FC-`, `EX-`). An identified row can be cited, claimed and reported as unclaimed; a prose bullet can only be read. The same generation gives the `access_control`, `system_invariants`, `error_catalog`, `ux_rules`, `test_policy` and `question_ledger` foundations their own tables and namespaces.

Generation 6 puts the visual system under contract. The `ux_rules` foundation gains the `Design tokens` heading, its table shape (`Token`, `Value`, `Applies to`, `Accessibility note`) and the `design_token` namespace (`DT-NN`) — the first contract with a zero minimum, because the shape is structural but the commitment is the product's to make: a repository with no screens owes no palette. The absence is reported instead of enforced — `DESIGN_TOKENS_UNCOMMITTED`, a warning, once a live screen renders with no `DT-*` row and no open question citing `UX-RULES#design-tokens` defers the commitment. Screens and components consume tokens by ID and never restate a diverging value, the same never-restate rule the wire and schema layers already carry.

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
| Design | `api_processing` | `API-*` | Authorization, processing, transactions and side effects for any invocable operation — HTTP, IPC, bridge or command line; the owning interface file holds the wire contract for HTTP, and the `API-*` document owns the full invocation contract for everything else |
| Design | `entity` | `ENT-*` | Domain identity, state, invariants and declared persistence authority |
| Design | `external_integration` | `INT-*` | Provider, mapping, reliability and secret boundary |
| Design | `job` | `JOB-*` | Durable or scheduled processing and retry behavior |
| Design | `event` | `EVT-*` | Versioned event envelope, delivery and consumers |
| Design | `platform_target` | `PLT-*` | Platform constraints, permissions, distribution/update behavior, local-data migration and the optional `host_os` evidence-host token |
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
