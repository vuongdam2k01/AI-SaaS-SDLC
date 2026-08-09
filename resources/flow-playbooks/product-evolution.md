# Product Evolution Playbook

Product Evolution is the single flow for every later feature addition, compatible change, consolidation, breaking change, deprecation and retirement. Repeating this flow over time is horizontal scale; no separate scale flow exists.

The host adapter supplies `ENGINE = node "<plugin-root>/bin/ai-saas-sdlc"`.

## 1. Accepted input

Required:

- one semantic product intent stating what outcome or behavior should change.

Useful explicit context:

- actor/trigger/outcome;
- affected feature or contract IDs;
- compatibility/retirement expectations;
- user-granted access to configured implementation sources.

Reject spelling/tone/formatting-only work; use `refresh --editorial`. Route a concrete defect/mismatch to Reconciliation. Route new market evidence to Evidence Reassessment before choosing product change.

## 2. Mandatory reads

1. Run `ENGINE state --json`; require an active baseline and no active incompatible flow.
2. Read the baseline manifest, `PRODUCT-REQUIREMENTS`, `ACCESS-CONTROL`, `QUALITY-REQUIREMENTS`, `SYSTEM-INVARIANTS` and relevant accepted ADRs.
3. Read existing FTR/UC/FLOW and generated feature/artifact/interaction/implementation maps in the input's scope.
4. Read downstream design and UT/IT/ST for existing affected behavior.
5. If configured implementation sources exist and access is explicitly permitted, inspect mapped code/tests inside those roots. Do not create/manage repositories or inspect unrelated paths.

## 3. Open the temporal flow

If the same semantic intent already has an active Evolution flow, resume that flow/change ID and skip `flow start`. If another flow is active, stop and report it; never run two semantic changes concurrently.

Run:

```text
ENGINE flow start --type evolution --input "<semantic intent>" --json
```

Use the returned `CHG-*` as `created_by_change` for every new artifact.

## 4. Form observable behavior

Follow `resources/protocols/behavior-formation.md`.

Transform the input into:

- current versus desired behavior;
- actor, trigger, outcome, scope and explicit non-scope;
- compatibility/deprecation/retirement consequences;
- one or more `FTR-*` with stable `AC-*` IDs;
- necessary actor-system `UC-*`;
- cross-feature/state `FLOW-*` including alternate/error/compensation behavior.

For every new scalable artifact, instantiate the pinned pattern first:

```text
ENGINE artifact create --type <feature|use_case|business_flow|...> --id <ID> --title "<title>" --json
```

Use `ENGINE patterns list --json` to resolve the exact catalog type when necessary. Never copy a pattern into an arbitrary path.

For a new feature allocate new permanent IDs. For a compatible refinement update current artifacts. For replacement use successor/supersession where required. For retirement preserve IDs/history and deprecate/retire dependents/tests rather than deleting them.

## 5. First impact closure

After the behavior diff is real, run:

```text
ENGINE impact --json
```

Follow `resources/protocols/impact-analysis.md`. Include old features reached through changed access/invariants or shared component, subsystem, entity, API, integration, job and event contracts. Classify affected items as modify, verify-only, deprecate/retire, material question or not affected with reason.

## 6. One consolidated material interaction

Resolve behavior from explicit intent/current contracts first. After the initial behavior and impact picture, ask once for unresolved choices that materially alter scope, acceptance, compatibility, actor access, conflict behavior, external promise or expensive-to-reverse design.

Present options, consequences and recommendation. Do not ask separately per artifact or ask about routine implementation choices. Put unresolved non-blocking items in `QUESTIONS`.

## 7. Allocate solution artifacts conditionally

Follow `resources/protocols/solution-formation.md` and each selected template contract.

Create/update only when the boundary exists:

- `SCR-*` for real UI surfaces;
- `CMP-*` after a second real consumer;
- `SUB-*` for non-trivial engine/model/pipeline/domain capability;
- `API-*` for processing semantics and OpenAPI for wire contracts;
- `ENT-*` for domain identity/lifecycle and DBML for physical schema;
- `INT-*` for external provider boundaries;
- `JOB-*` for durable/scheduled/retryable work;
- `EVT-*` for versioned facts with producers/consumers;
- `ADR-*` only for multiple viable, durable, cross-artifact or expensive-to-reverse choices.

Instantiate every newly allocated design/ADR artifact with `ENGINE artifact create` and then complete the produced content contract. Editing an existing active artifact does not create a second instance.

Resolve all affected shared writes, ordering, concurrency, idempotency, compensation, compatibility, retention and invariant effects. Declare `depends_on`, `decisions`, `writes_to` and implementation mappings; never maintain reverse links manually.

## 8. Recompute impact

Run `ENGINE impact --json` again after design relationships stabilize. If the closure expands, inspect/classify only the newly reached items and update shared contracts/regression obligations. Do not regenerate unaffected documents.

## 9. Derive verification

Follow `resources/protocols/test-derivation.md`.

- create/update backend/frontend/job `UT-*` as applicable;
- create/update `IT-*` for real component/persistence/provider/event/job boundaries;
- create/update `ST-*` for the actor journey and cross-feature behavior;
- preserve existing regression tests reached through the closure;
- cover ACs, UC/FLOW errors, access, invariants, error codes, concurrency and degradation by reference.

Instantiate every new UT/IT/ST specification with `ENGINE artifact create`; `RESULT-*` remains engine-owned and is never instantiated or edited by the model.

Every active feature must reach active UC, FLOW, UT, IT and ST under the baseline contract. Keep coverage minimal but real.

Run:

```text
ENGINE tests select --json
```

## 10. Implement and execute, when configured

When implementation sources are configured and the user permits changes:

1. edit only affected mapped paths inside configured roots;
2. preserve project conventions;
3. update implementation mappings for canonical and test artifacts;
4. execute only exact commands declared in `sdlc.config.yaml` through the engine.

If any verification commands are configured, run:

```text
ENGINE verify --all --execute --json
```

If none are configured, preserve honest `not-configured` state. Never write `RESULT-*` manually or simulate a pass.

## 11. Deterministic close sequence

Run:

```text
ENGINE refresh
ENGINE validate --active --json
ENGINE baseline create --json
ENGINE flow close --json
```

Fix structural/reference/coverage failures and failed configured tests. Do not open a prose-review gate. A clean no-change flow may close as a recorded cancellation; it must not fabricate a successor baseline.

## 12. Output contract

Report:

- normalized intent/change class;
- direct changed and full affected IDs;
- created/updated/deprecated/retired artifacts;
- old features pulled into regression through shared contracts;
- ADRs created/superseded and why they met the threshold;
- configured implementation files changed;
- UT/IT/ST execution/result IDs or `not-configured`;
- successor `BL-*`, unchanged/current `EVR-*` and unresolved questions.

## 13. Stop and re-entry

Stop when behavior, conditional design, impact closure, UT/IT/ST and implementation verification agree in a successor baseline.

Legal re-entry requires a new semantic intent, newly discovered dependency/constraint, inspected code diff, execution result, explicit product decision or concrete contradiction. A reviewer rereading unchanged artifacts, wording-only concern or desire to “make it more complete” is not a trigger.
