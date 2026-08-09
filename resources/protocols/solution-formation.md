# Solution Formation Protocol

Use this protocol in Product Evolution or Reconciliation after observable behavior and the affected closure are known. Allocate only artifacts required by the actual solution boundary.

## Inputs

- changed `FTR-*`, `UC-*`, `FLOW-*` and acceptance IDs;
- active architecture, UX, access, quality and invariant contracts;
- impact closure and shared `writes_to` targets;
- accepted ADRs and configured implementation sources;
- applicable pinned pattern contracts in `00-system/patterns/`.

## Allocation matrix

| Artifact | Create or update when | Canonical content | Do not use for |
|---|---|---|---|
| `SCR-*` | A real UI route/surface has distinct purpose, state or transition behavior | Regions, fields, actions, validation messages, states, transitions, accessibility | Global UX rules or backend processing |
| `CMP-*` | At least two real consumers share the same interaction contract | Inputs/outputs, variants, states, validation, accessibility, extension points | One-screen fragments or visual styling only |
| `SUB-*` | A non-trivial engine, model, pipeline or domain capability has its own quality/failure boundary | Capabilities, I/O/stores, budgets, pinning, degradation, evaluation, security | Ordinary CRUD grouping |
| `API-*` | An operation has processing, authorization, transactional or side-effect behavior worth specifying | Callers, validation, sequence, consistency, side effects, idempotency, errors | Wire schema, which remains in OpenAPI |
| `ENT-*` | A domain object has independent identity, lifecycle, invariants or retention | Meaning, ownership, attributes, states, constraints, sensitivity, retention | Endpoint workflow or physical-only tuning |
| `INT-*` | Product behavior depends on an external provider/service | Auth boundary, exchanged data, quota/cost, timeout/retry, callbacks, degradation, sandbox | Secrets or generic library usage |
| `JOB-*` | Work outlives a request/screen, is scheduled, retryable or cancellable | Trigger, selection, transitions, concurrency, retry, cancellation, output/events | A synchronous method call |
| `EVT-*` | Multiple components depend on an emitted fact or asynchronous contract | Meaning, schema/version, ordering, duplication, consumers, replay/retention | In-process implementation detail |
| `ADR-*` | Multiple viable alternatives have durable, cross-artifact or expensive-to-reverse consequences | Context, drivers, options, decision, consequences, verification and affected scope | Routine choices already owned by a design artifact |

Absence is valid when the condition is false. A complete solution is not the one with the most files.

For each new allocation, use `ENGINE artifact create` with the catalog `artifact_type`; never copy template/pattern files manually. Complete the generated instance and preserve its assigned path/ID. Existing artifacts are edited in place only when lifecycle rules permit.

## Canonical boundaries

- OpenAPI owns wire request/response/schema truth; `API-*` owns processing semantics.
- `ENT-*` owns domain meaning/lifecycle; DBML owns physical relational structure.
- `UX-RULES` owns global interaction conventions; `SCR-*` owns one surface; `CMP-*` owns shared behavior.
- `ERROR-CATALOG` owns stable error meaning; API, screen and tests reference its IDs.
- `SUB-*` owns non-CRUD capability quality and degradation; feature/flow documents reference capability behavior.
- `ARCHITECTURE-OVERVIEW` owns system-wide boundaries; detailed artifacts refine it.

Do not copy one canonical answer into several documents. Declare `depends_on`, `decisions`, `writes_to` and `implementation`; reverse relationships are generated.

## Shared-state and degradation design

For each entity/store/API/event shared by old and new features, resolve:

- ownership and tenant boundary;
- writer set and allowed transitions;
- ordering/concurrency winner or merge rule;
- idempotency and duplicate behavior;
- transaction/consistency boundary;
- retry, compensation and user-visible loser state;
- backward/forward compatibility;
- retention/export/deletion consequences;
- invariant enforcement and failure recovery.

Do not hide these answers inside a single feature if several features depend on them.

## ADR threshold

Create an ADR only when all are true:

1. at least two viable alternatives exist;
2. the selection changes durable behavior, multiple artifacts or a costly migration/reversal;
3. future maintainers need the rejected alternatives and consequences to understand the system.

Otherwise place the decision in its owning artifact. Accepted ADR bodies are immutable; change creates a successor with `supersedes` and affected artifacts reference the successor.

## Implementation mapping

When implementation sources are configured and access is explicitly permitted:

- inspect existing code before selecting new structure;
- map artifacts to `<source-id>:<relative-path>` only inside configured roots;
- preserve existing conventions unless a material constraint requires change;
- never create/manage repositories or execute undeclared commands;
- leave mapping absent and verification `not-configured` when no source exists.

## Completion

Solution formation is complete when every allocated artifact:

- answers its template's required fields and applicable failure paths;
- references upstream behavior/decisions with permanent IDs;
- declares shared writes and implementation mapping where configured;
- has no competing canonical answer elsewhere;
- gives test derivation an observable contract.

Re-run impact after design relationships change. Re-enter solution formation only on changed behavior, a newly observed implementation constraint, accepted/superseded ADR, test failure or contract contradiction. Do not allocate an artifact merely because another project had one.
