# Behavior Formation Protocol

Use this protocol in Product Evolution after a semantic intent is accepted and before choosing surfaces, operations, entities, platform targets or implementation structure.

## Inputs

- semantic intent and change class: add, change, consolidate, break, deprecate or retire;
- active baseline and current `PRODUCT-REQUIREMENTS`;
- relevant `FTR-*`, `UC-*`, `FLOW-*`, access rules, invariants and questions;
- constraints explicitly stated by the user;
- existing behavior that must remain compatible.

## Normalize the intent

Write a compact behavior delta before editing artifacts:

| Concern | Required statement |
|---|---|
| Actor | Who initiates or receives the behavior and under which role/tenant boundary |
| Trigger | Event, user action or state that starts it |
| Current behavior | What the active baseline does now, including absence of behavior |
| Desired outcome | Observable result, not implementation technique |
| Scope | Included outcomes and explicit non-scope |
| Compatibility | Existing behavior that must not degrade |
| Retirement | For removal, replacement path and residual support obligations |

If the requested change mixes independent outcomes, split them into traceable features only when they can be implemented, accepted or retired independently. Do not split by technical layer.

## Allocate product artifacts

Instantiate every new scalable artifact with `ENGINE artifact create --type <type> --id <ID> --title "<title>"`; the active flow supplies change attribution and the pinned catalog supplies the only valid pattern/path. Then complete the generated instance. Updates to existing artifacts retain their IDs/files.

### Feature

Create a new `FTR-*` for a new independently traceable outcome. Update the existing feature for a compatible refinement. Deprecate/retire or supersede it for removal/replacement; never reuse its ID.

The feature owns:

- problem/outcome and actors/access;
- in-scope and out-of-scope behavior;
- observable success and applicable empty, validation, permission, failure, concurrency and degraded states;
- stable binary `AC-*` acceptance criteria;
- shared writes/interactions and compatibility obligations.

Do not put route layout, HTTP mechanics, table definitions or class design in the feature.

### Use case

Create or update `UC-*` for an actor-to-system goal. Each use case states actor, trigger, preconditions, numbered main path, alternate paths, error paths and postconditions. Reference feature acceptance IDs instead of paraphrasing them.

One use case may serve more than one feature only when the actor goal is genuinely shared. Do not create a use case for internal processing with no actor goal.

### Business flow

Create or update `FLOW-*` for behavior spanning multiple use cases, features, actors, system states or compensation paths. State entry/exit states, ordered flow, business rules, alternate/compensation behavior and cross-feature interactions.

Every active feature must have downstream UC and FLOW coverage because the baseline contract requires both. A small feature may use one concise UC and one concise FLOW; it does not need invented complexity.

## Derive observable cases

For each acceptance criterion, check applicability rather than filling a universal checklist:

- normal success;
- validation/boundary input;
- empty or no-result behavior;
- alternate actor choice;
- authorization and cross-tenant denial;
- duplicate/retry/idempotency;
- concurrent or stale-state action;
- dependency unavailable/slow;
- cancellation, partial completion or compensation;
- retirement/migration compatibility.

Write `N/A — <reason>` only when a pattern requires an explicit disposition. Omit inapplicable optional artifacts.

## Material interaction

Resolve from explicit input, active product contracts and accepted ADRs first. Collect unresolved questions and ask the user once, after the initial behavior/impact picture is available. Ask only choices whose answers alter actor, outcome, scope, acceptance, access, compatibility or irreversible behavior. Present consequences and a recommendation; do not ask about technical preferences that solution formation can decide safely.

Record unresolved non-blocking questions in `QUESTIONS`; do not start a review loop.

## Completion

Behavior formation is complete when:

- feature scope and permanent AC IDs are explicit;
- UC main/alternate/error paths cover the actor goal;
- FLOW covers cross-feature/state movement and compensation where applicable;
- access and invariants are referenced;
- old behavior that may degrade is named;
- every downstream design question is either derivable or recorded as a material question.

Proceed to impact and solution formation. Re-enter only on new user intent, a newly discovered dependency/constraint, inspected implementation fact, failing test or concrete contradiction. Rewording unchanged behavior is not a trigger.
