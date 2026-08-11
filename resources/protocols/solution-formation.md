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
| `SCR-*` | A real user-facing surface — web route, desktop window, mobile screen, or a non-window surface such as a tray or menu-bar menu — has distinct purpose, state or transition behavior | Regions, fields, actions, validation messages, states, transitions, accessibility | Global UX rules or backend processing |
| `CMP-*` | At least two real consumers share the same interaction contract | Inputs/outputs, variants, states, validation, accessibility, extension points | One-surface fragments or visual styling only |
| `SUB-*` | A non-trivial engine, model, pipeline or domain capability has its own quality/failure boundary | Capabilities, I/O/stores, budgets, pinning, degradation, evaluation, security | Ordinary CRUD grouping |
| `API-*` | An invocable operation — an OpenAPI operation, an IPC/bridge command or a CLI entry — has processing, authorization, transactional or side-effect behavior worth specifying | Callers, validation, sequence, consistency, side effects, idempotency, errors | HTTP wire schema, which remains in the owning interface file; a non-HTTP operation owns its full invocation contract here |
| `ENT-*` | A domain object has independent identity, lifecycle, invariants or retention | Meaning, ownership, attributes, states, constraints, sensitivity, retention | Endpoint workflow or physical-only tuning |
| `INT-*` | Product behavior depends on an external provider/service | Auth boundary, exchanged data, quota/cost, timeout/retry, callbacks, degradation, sandbox | Secrets or generic library usage |
| `JOB-*` | Work outlives a request or interaction, is scheduled, retryable or cancellable | Trigger, selection, transitions, concurrency, retry, cancellation, output/events | A synchronous method call |
| `EVT-*` | Multiple components depend on an emitted fact or asynchronous contract | Meaning, schema/version, ordering, duplication, consumers, replay/retention | In-process implementation detail |
| `PLT-*` | The product ships on a platform or channel whose constraints, permissions, update behavior or local data differ materially | Platform constraints, capability/permission denial behavior, distribution/update/rollback, local data and migration, platform-conditional verification consequences | Build pipelines, signing, deployment operations, or behavior owned by FTR/SCR/API/INT |
| `ADR-*` | Multiple viable alternatives have durable, cross-artifact or expensive-to-reverse consequences | Context, drivers, options, decision, consequences, verification and affected scope | Routine choices already owned by a design artifact |

Absence is valid when the condition is false. A complete solution is not the one with the most files.

### OS entry points and surfaces

Operating-system entry points — a global shortcut, a file association, a deep link, a share target, a tray action — have no artifact type of their own, deliberately. Allocate them by what each one is:

- the **entry itself is a trigger**: declare it in the owning `UC-*`/`FLOW-*` as the step or trigger that starts the behavior;
- its **registration cost is platform behavior**: the `PLT-*` capabilities table owns registration, the conflict when another application already holds it, and the denial or revocation behavior;
- a **tray or menu-bar menu with real interaction structure is a screen**: regions, actions, enablement rules and transitions make it an `SCR-*` like any other stable surface, window or not.

An entry point that appears in a journey but is registered nowhere, or registered in a `PLT-*` that no behavior references, is an allocation gap of the same kind as an unowned client obligation.

For each new allocation, use `ENGINE artifact create` with the catalog `artifact_type`; never copy template/pattern files manually. Complete the generated instance and preserve its assigned path/ID. Existing artifacts are edited in place only when lifecycle rules permit.

## Canonical boundaries

- The owning interface file — `openapi.yaml` by default, a sibling `03-design/interfaces/*.yaml` for a further surface — owns wire request/response/schema truth for HTTP operations; `API-*` owns processing semantics, and owns the full invocation contract when the operation is not HTTP. In a multi-file repository each HTTP `API-*` names its owning `WIRE-*`/`OPENAPI-CONTRACT` file in `depends_on`.
- `PLT-*` owns what shipping on a platform costs the product; the artifacts it constrains keep owning their own behavior.
- `ENT-*` owns domain meaning/lifecycle; DBML owns physical relational structure.
- `UX-RULES` owns global interaction conventions; `SCR-*` owns one surface; `CMP-*` owns shared behavior.
- `ERROR-CATALOG` owns stable error meaning; API, screen and tests reference its IDs.
- `SUB-*` owns non-CRUD capability quality and degradation; feature/flow documents reference capability behavior.
- `ARCHITECTURE-OVERVIEW` owns system-wide boundaries; detailed artifacts refine it.

Do not copy one canonical answer into several documents. Declare `depends_on`, `decisions`, `writes_to` and `implementation`; reverse relationships are generated.

When a contract family gains its second file — a second interface file, a second `.dbml` database, a second transition graph — add the file first and declare ownership second, inside the same flow: while the family holds a single file the engine derives ownership itself, and an early declaration forms a dependency cycle with that auto-derived edge. A sibling file's name becomes its permanent identity once baselined, so name it by its bounded scope (`billing.yaml`, `analytics.dbml`, `desktop.mmd`), never by version or date.

## Shared-state and degradation design

For each entity/store/API/event shared by old and new features, resolve:

- ownership and tenant boundary;
- writer set and allowed transitions;
- ordering/concurrency winner or merge rule;
- idempotency and duplicate behavior;
- transaction/consistency boundary;
- retry, compensation and user-visible loser state;
- offline or local-first divergence and the rule by which state reconverges;
- multi-device or multi-install conflict winner and the user-visible state of the loser;
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
