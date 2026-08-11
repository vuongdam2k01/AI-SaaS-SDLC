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

## 3. Open or continue the temporal flow

If the same semantic intent already has an active Evolution flow, resume that flow/change ID and skip `flow start`. If another flow is active, stop and report it; never run two semantic changes concurrently.

Run:

```text
ENGINE flow start --type evolution --input "<semantic intent>" [--until <stage>] --json
```

Use the returned `CHG-*` as `created_by_change` for every new artifact.

### Where this turn stops

The author decides how much of the flow runs in one turn. Read the invocation for `--until <stage>`, where the stage is one of `behavior`, `design`, `tests`, `implementation`, `baseline`. Plain language means the same thing: "stop after the design", "only write the tests this time", "just the specs for now".

Absent an explicit stage, the target is `baseline` and the flow runs to completion, which is the historical behaviour.

These are checkpoints, not lifecycle stages. They add no gate, no review round and no approval step. They exist because one turn that runs for forty minutes and rewrites thirty artifacts is not something an author can steer, and because reviewing behaviour before tests are derived from it is cheaper than discovering the mismatch afterwards.

### At every checkpoint

After finishing each checkpoint's work, record it and say so:

```text
ENGINE flow checkpoint --stage <reached> --json
```

Then, in the visible reply, state in one or two lines: the checkpoint just reached, what it produced by ID, and what remains. An author watching a terminal has no other way to see progress; silence for tens of minutes is the failure this is fixing.

When the reached checkpoint equals the target, **stop**. Do not continue into the next checkpoint, do not create a baseline and do not close the flow. Leave the flow open and end the turn with the closing report described in section 12.

A flow stopped at a checkpoint is a normal, valid state. It is not an error, not an interruption and not something to apologise for or immediately resume.

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

### Deprecation granularity

Deprecation has two instruments, and using the wrong one states something false about the product.

- **Artifact status** — set `deprecated`, then `retired`, only when the whole artifact has stopped being the authority for anything. A retired artifact is immutable and no live artifact may depend on it, so retire it only after its dependents have moved.
- **Business-rule granularity** — when part of the artifact survives, leave the artifact `active` and deprecate the rule inside it: mark the specific `BR-*` with the change that deprecated it, the named replacement and the condition under which it is removed. Marking the whole feature deprecated because one of its rules was replaced claims the rest of it is going away too.

Apply the same test to `UC-*` and `FLOW-*`: a behavior fully replaced by a successor moves to `superseded`; a behavior partly replaced is edited, not retired.

Whichever instrument you use, state in the closing report which artifacts changed **status** and which carry a rule-level deprecation, with the removal condition for each. A deprecation with no stated removal condition is an annotation, not a decision.

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

- `SCR-*` for real user-facing surfaces, whether a web route, a desktop window or a mobile screen;
- `CMP-*` after a second real consumer;
- `SUB-*` for non-trivial engine/model/pipeline/domain capability;
- `API-*` for the processing semantics of an invocable operation, with the owning interface file — `openapi.yaml` or a sibling under `03-design/interfaces/` — owning the wire contract when that operation is HTTP; in a multi-file repository the `API-*` names that file in `depends_on`;
- `ENT-*` for domain identity/lifecycle and DBML for physical schema;
- `INT-*` for external provider boundaries;
- `JOB-*` for durable/scheduled/retryable work;
- `EVT-*` for versioned facts with producers/consumers;
- `PLT-*` for each shipped platform or channel whose constraints, permissions, update behavior or local data differ materially;
- `ADR-*` only for multiple viable, durable, cross-artifact or expensive-to-reverse choices.

Instantiate every newly allocated design/ADR artifact with `ENGINE artifact create` and then complete the produced content contract. Editing an existing active artifact does not create a second instance.

An ADR marked `accepted` is immutable once baselined, so do not cite verification case IDs it cannot yet see. Name the specification, the acceptance criterion or the rule; name individual `TC-*` only after the cases exist. `ENGINE validate` reports `CASE_REFERENCE_BROKEN` for a qualified case reference that no specification declares, and inside an accepted ADR that finding can never be repaired.

When the semantic intent names a boundary of one of these kinds and you do not allocate an artifact for it, say so explicitly in the closing report: name the boundary, name the artifact type you did not create, and state why the boundary does not exist yet. Silently omitting a named boundary is not an allocation decision, it is an unrecorded one.

A client obligation that no artifact owns is an allocation gap, not a detail. If a contract you write or change requires the caller to supply something it cannot derive — an idempotency key, a correlation identifier, the identity of a record it is superseding, a chosen version — then either allocate the artifact that owns the surface producing it, or record the gap in `QUESTIONS` with the exact obligation, the artifacts that impose it, and the claim it blocks until it is closed. Leaving the obligation unowned and unrecorded is not permitted.

Resolve all affected shared writes, ordering, concurrency, idempotency, compensation, compatibility, retention and invariant effects. Declare `depends_on`, `decisions`, `writes_to` and implementation mappings; never maintain reverse links manually.

## 8. Recompute impact

Run `ENGINE impact --json` again after design relationships stabilize. If the closure expands, inspect/classify only the newly reached items and update shared contracts/regression obligations. Do not regenerate unaffected documents.

## 9. Derive verification

Follow `resources/protocols/test-derivation.md`.

- create/update backend/core, frontend and job `UT-*` as applicable;
- create/update `IT-*` for real component/persistence/provider/event/job boundaries;
- create/update `ST-*` for the actor journey and cross-feature behavior;
- preserve existing regression tests reached through the closure;
- cover ACs, UC/FLOW errors, access, invariants, error codes, concurrency and degradation by reference.

Before adding cases to an existing `IT-*` or `ST-*`, check whether it is already carrying more than one boundary or journey. `ENGINE validate --active --json` reports `SPEC_OVERSIZED` for every live specification past the threshold. When the specification you are about to extend is named there, split it first and add the new cases to the correct document; appending to a file the engine has already called oversized is how one specification becomes the only specification.

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

When live `PLT-*` targets exist, declare which of them each command produces evidence for with `platforms: [PLT-...]` on the command definition before executing. `ENGINE validate` reports `PLATFORM_EVIDENCE_MISSING` for a live platform target no command declares; a platform this machine genuinely cannot execute stays undeclared and is recorded as unproven in `TEST-POLICY` instead of being declared optimistically.

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

Every report, whether the flow completed or stopped at a checkpoint, ends with two things:

1. **State of the flow** — open at checkpoint `<reached>` with `<remaining>` left, or closed at `BL-*`.
2. **The exact next command**, written so the author can type it without deriving anything:

```text
/ai-saas-sdlc:evolve-product --until tests continue FLOW-004
```

Take it from `ENGINE flow next --json`, which reports the open flow's progress and the command that follows. Never end a turn with "let me know how you would like to proceed" — the author asked what to do next by running the flow at all.

When the flow stopped short of `baseline`, also name what the author can usefully review before continuing: the specific artifact IDs this checkpoint produced.

## 13. Stop and re-entry

Stop when the requested checkpoint is reached. When the target is `baseline`, stop when behavior, conditional design, impact closure, UT/IT/ST and implementation verification agree in a successor baseline.

Legal re-entry requires a new semantic intent, newly discovered dependency/constraint, inspected code diff, execution result, explicit product decision or concrete contradiction. A reviewer rereading unchanged artifacts, wording-only concern or desire to “make it more complete” is not a trigger.
