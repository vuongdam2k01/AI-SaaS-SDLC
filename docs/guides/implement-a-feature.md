# Implement a feature

This is the flow you run most. You have a baseline (`BL-000` or later) and you want a user to be able to do something new. Product Evolution takes one semantic intent all the way from *what should the user be able to do* through requirements, design, tests, and — when your code is wired up — the implementation itself, ending in a verified successor baseline.

It is the same skill whether you add, refine, consolidate, break, deprecate or retire behavior. This guide covers **adding** a feature end to end. For the other shapes see [Evolve existing behavior](evolve-existing-behavior.md).

## Use this when

- A baseline exists and you want new product behavior.
- You can state the change as one outcome: *"an agency reviewer can request changes on a post before it publishes."*

## The mental model: one flow, five checkpoints

A feature is not written in one blast. The flow moves through five checkpoints, and **you decide how far one turn goes** with `--until <stage>`. This maps directly onto how you would build the feature by hand:

| Checkpoint | Plain meaning | What it produces |
|---|---|---|
| `behavior` | Make the requirement observable | `FTR-*` with stable `AC-*` acceptance IDs, `UC-*`, `FLOW-*` |
| `design` | Write the implementation-detail docs | Only the boundaries that exist: `SCR/CMP/SUB/API/ENT/INT/JOB/EVT`, plus the owning interface/schema files (OpenAPI / DBML by default, siblings per surface or database), the architecture overview's Runtime topology section when units or network boundaries change, and `ADR-*` when a real decision is made |
| `tests` | Write the test specifications | `UT-*`, `IT-*`, `ST-*` derived from behavior and affected regression |
| `implementation` | Change the code and run it | Edits inside configured implementation sources; `verify --execute` produces real `RESULT-*` |
| `baseline` (default) | Lock it in | `refresh` → `validate` → successor `BL-*`, flow closed |

Stopping at a checkpoint is a **normal, valid state**. It is not an interruption to apologize for. Reviewing behavior *before* tests are derived from it is far cheaper than discovering the mismatch afterward — that is exactly why the checkpoints exist.

## The commands

Run the whole thing in one turn (stops at a successor baseline):

```text
/ai-saas-sdlc:evolve-product <semantic intent>
```

Or take it one checkpoint at a time — recommended for anything non-trivial:

```text
/ai-saas-sdlc:evolve-product --until behavior <semantic intent>
```

`--until` accepts `behavior`, `design`, `tests`, `implementation` or `baseline`. Plain language works too — "stop after the design", "just the specs this time" mean the same thing.

## Walkthrough: a feature, checkpoint by checkpoint

Say the intent is: *"Let an agency reviewer request changes on a scheduled post so it cannot publish until the changes are addressed."*

### Step 1 — Make the requirement observable (`--until behavior`)

```text
/ai-saas-sdlc:evolve-product --until behavior Let an agency reviewer request changes on a
scheduled post so it cannot publish until the changes are addressed.
```

What the flow does:

- Runs `state` to confirm an active baseline and that no conflicting flow is open, then `flow start --type evolution` — reserving a change ID **`CHG-*`** that stamps every artifact it creates.
- Reads the foundations your requirement touches: `PRODUCT-REQUIREMENTS`, `ACCESS-CONTROL`, `SYSTEM-INVARIANTS`, and any existing feature in scope.
- Turns your sentence into **observable behavior**: current vs. desired, the actor/trigger/outcome, what is explicitly *out* of scope, and one or more `FTR-*` each carrying stable `AC-*` acceptance criteria. It derives the `UC-*` (actor–system use cases) and `FLOW-*` (cross-feature/state paths, including the alternate, error and compensation branches).
- If a genuinely material choice is open — one that changes scope, acceptance, compatibility, who can do it, or something expensive to reverse — it asks **once**, with options and a recommendation. Routine choices it just makes.
- Records the checkpoint (`flow checkpoint --stage behavior`) and **stops**, leaving the flow open.

**Review this before continuing.** Read the new `FTR-*` and its `AC-*`. This is the cheapest possible place to catch "that's not quite what I meant." Everything downstream is derived from these acceptance IDs.

### Step 2 — Write the implementation-detail docs (`--until design`)

When the behavior is right, continue. The skill's closing report gives you the exact command; it looks like:

```text
/ai-saas-sdlc:evolve-product --until design continue FLOW-00N
```

What the flow does:

- Runs `impact` to compute the **affected closure** — not just your new feature, but every older feature reached through a shared access rule, invariant, component, subsystem, API, entity, integration, job or event contract. Each item is classified: modify, verify-only, deprecate/retire, material question, or not-affected-with-reason.
- Allocates design artifacts **only where a real boundary exists** — it does not invent layers:
  - `SCR-*` for a real user-facing surface — a web route, a desktop window, a mobile screen, or a tray/menu-bar menu with real interaction structure; when phone, tablet or desktop behavior differs materially, that is one artifact per form factor, not one responsive artifact. In a repository with more than one transition graph, each screen names its owning `03-design/*.mmd` in `depends_on`. `CMP-*` only after a second real consumer exists;
  - `SUB-*` for a non-trivial engine/pipeline/domain capability;
  - `API-*` for the processing semantics of any invocable operation — the owning interface file (OpenAPI by default, a sibling `03-design/interfaces/*.yaml` per further surface) owns the wire contract when it is HTTP, and a multi-file repository names that file in the `API-*`'s `depends_on`; an IPC/bridge/CLI operation owns its full invocation contract in the `API-*` document itself;
  - `ENT-*` for domain identity/lifecycle, each declaring its **persistence authority** — the owning `.dbml` file for relational storage, a `PLT-*#M-NN` row for a device-local store, or an explicit `none — <reason>` for derived state. A document, key-value or client-local entity states its real store; it does not invent a relational mapping;
  - `INT-*` for an external provider boundary; `JOB-*` for durable/scheduled work; `EVT-*` for versioned facts;
  - `PLT-*` for each shipped platform or channel whose constraints, permissions, update behavior or local data differ materially;
  - `ADR-*` **only** for a choice that is multiple-viable, durable, cross-artifact and expensive to reverse.
- Each new artifact is instantiated from the pinned pattern (`artifact create`) and then filled in — never copied by hand into an arbitrary path.
- Recomputes `impact` once design relationships settle, in case the closure grew.
- Records the checkpoint and stops.

> **Two rules with no undo, when a contract family grows past one file.** A product big enough to want a second interface file, a second database or a second screen world hits both:
>
> 1. **Add the file first, declare ownership second — inside the same flow.** While a family holds one file the engine derives ownership itself; declaring an owner before the second file exists forms a dependency cycle with that derived edge, and a cycle is a hard error.
> 2. **A sibling file's name becomes its permanent identity the moment it is baselined.** `billing.yaml` is `WIRE-BILLING` forever; renaming it afterwards reads as deleting a baselined artifact. Name it for its bounded scope — never for a version, a date or a phase.
>
> The same applies to the AREA segment inside every ID. It cannot be renamed after baselining either, so if you intend to use the optional `areas` registry in `sdlc.config.yaml`, register the areas in the flow that mints the IDs — not later.

**Review this before continuing.** These are your implementation-detail documents. Check that every boundary your feature actually has got an artifact — and note that the report explicitly *names any boundary it chose not to allocate and why*. If your intent implied an external integration but no `INT-*` appeared, the report will say so; that is where you catch a missing decision.

### Step 3 — Write the test specifications (`--until tests`)

```text
/ai-saas-sdlc:evolve-product --until tests continue FLOW-00N
```

What the flow does:

- Derives verification from behavior and the affected regression: `UT-*` unit specs — `UT-API-*` behind an invocable operation, `UT-CORE-*` for platform-neutral core logic, `UT-UI-*`, `UT-JOB-*` — plus `IT-*` for real component/persistence/provider/event/job boundaries and `ST-*` for the actor journey and cross-feature behavior.
- Covers the `AC-*`, the `UC`/`FLOW` error paths, access rules, invariants, error codes, concurrency and degradation — by reference, kept minimal but real.
- **Preserves and re-selects existing regression tests** pulled in by the closure, so a shared-contract change re-tests the older features it touched.
- If it is about to extend an `IT-*`/`ST-*` the engine has already flagged `SPEC_OVERSIZED`, it splits it first rather than letting one spec absorb everything.
- Runs `tests select` to list the full obligation, records the checkpoint and stops.

**Review this before continuing.** Every active feature must reach active `UC`, `FLOW`, `UT`, `IT` and `ST` under the baseline. If coverage looks thin for an acceptance criterion, this is the moment to say so.

### Step 4 — Change the code and run it (`--until implementation`)

This step does real work **only if you have wired the docs to your codebase**. See [Wiring up your code](#wiring-up-your-code) below. If nothing is configured, skip to Step 5 — execution is honestly recorded as `not-configured` and nothing is fabricated.

```text
/ai-saas-sdlc:evolve-product --until implementation continue FLOW-00N
```

What the flow does, when implementation sources are configured **and** you have granted access:

- Edits **only** the mapped paths inside your configured implementation roots, preserving your project's conventions. It never touches unrelated paths and never creates or operates a repository.
- Updates the `implementation:` mappings on the canonical and test artifacts (`<source-id>:<relative-path>`).
- Runs your **exact declared commands** through the engine: `verify --all --execute`. Each run reserves a fresh `EXEC-*` and renders a real `RESULT-EXEC-*`. Failures stay in history — a rerun gets a new ID; nothing is overwritten and no pass is simulated.

**Review this before continuing.** Look at the `RESULT-*` verdicts. A failing configured test here is not a reason to edit the test into compliance — if the behavior is right and the code is wrong, that is a normal fix inside this same flow; if a *contract* turns out wrong, that is [Reconciliation](reconcile-a-failure.md).

### Step 5 — Lock it in (default `baseline`)

```text
/ai-saas-sdlc:evolve-product continue FLOW-00N
```

The deterministic close sequence runs: `refresh` → `validate --active` → `baseline create` → `flow close`. You fix any structural, reference or coverage failures it reports and any failed configured test. There is **no prose-review gate**. The result is a successor **`BL-*`** and a closed flow.

> **Tip — run it all at once.** For a small, well-understood feature you can skip the checkpoints entirely and just run `/ai-saas-sdlc:evolve-product <intent>`. The checkpoints earn their keep on features big enough that a silent 30-minute turn rewriting many artifacts would be impossible to steer.

> **What a stage actually costs.** Observed across real runs: a genesis or a single evolution stage lands around 25–85 minutes and roughly $10–45 of model usage, scaling with product size — a multi-surface product's design stage sits at the top of that range. For anything beyond a small feature, drive the flow one `--until` stage per turn: you get a review point at every checkpoint, and no single turn grows past what you can steer.

## How to check it worked

At the end of any turn, the skill prints a **State of the flow** line and **the exact next command** — read from `flow next`, so you never guess. It is either:

- *"open at checkpoint `<reached>`, `<remaining>` left"* — plus the IDs this checkpoint produced, so you know what to review, or
- *"closed at `BL-00N`"* — the feature landed.

Verify independently:

```text
/ai-saas-sdlc:inspect-state CHG-00N
```

or scope to the feature:

```text
/ai-saas-sdlc:inspect-state FTR-00N
```

You are looking for:

- The new `FTR-*` `active`, tracing down to active `UC/FLOW/UT/IT/ST`.
- The affected older features and their regression obligations listed under the closure.
- **Validation errors: 0.** Warnings are informative: `RULE_UNVERIFIED` (a business rule no spec claims yet), `SPEC_OVERSIZED` (a spec to split), `QUESTION_STALE` (an old open question). These are work owed, reported precisely so it stays visible — they do not block the baseline.
- `RESULT-*` verdicts, or an honest `not-configured` if you have no verification wired up.

## Wiring up your code

To make Step 4 do real work, edit `sdlc.config.yaml` at the root of your documentation repository. Keep the three header keys `init` wrote (`schema_version`, `project_id`, `research_mode`) — the engine rejects the file if any of them is missing, and it accepts no keys beyond the ones documented here:

```yaml
implementation_sources:
  - id: web-app
    path: ../approval-web-app        # relative to the docs repo, or absolute
verification:
  unit:
    - id: web-unit
      cwd: ../approval-web-app
      command: npm test -- --runInBand
  integration:
    - id: web-integration
      cwd: ../approval-web-app
      command: npm run test:integration
  system:
    - id: web-system
      cwd: ../approval-web-app
      command: npm run test:system
```

Key rules (full detail in the [configuration reference](../configuration-reference.md)):

- An implementation source is the **only** external tree Evolution may map, inspect or edit. The engine enforces real-path containment and rejects symlink escapes. Your host still needs your explicit filesystem permission.
- The engine never infers commands from `package.json` — it runs **only** the exact strings you declare. `cwd` must resolve to the docs root or a configured source.
- Leave the arrays empty for documentation-only mode; execution is reported as `not-configured` and no pass is inferred.
- A test seam that weakens a stated invariant or access rule — an environment variable that supplies fixture data, an injectable provider — belongs in `TEST-POLICY` beside what it exists to test. Left silent in the code, it reads to any later reviewer as the build contradicting its own contracts.
- The optional top-level `areas` list registers the AREA segment of your IDs. Declared, every live ID must name a registered area; the warning it raises is a naming decision made visible, and it can only be acted on before the ID is baselined.
- When the product has live `PLT-*` platform targets, add `platforms: [PLT-...]` to each command that produces evidence for one; the declaration and the observed host land in every `RESULT-*`, and `validate` warns (`PLATFORM_EVIDENCE_MISSING`) about live platforms no command declares. A target may also declare its expected evidence host with the optional `host_os` frontmatter token; `validate` warns (`PLATFORM_EVIDENCE_CONTRADICTED`) when every recorded execution declaring it observed a different host, and `generated/platform-coverage.md` shows the whole join once any target exists.

## What NOT to use this for

- **A typo or reword in an existing doc** → editorial edit, not a flow. See [Inspect state and check results](inspect-and-check-results.md#editorial-edits-spelling-tone-formatting).
- **A failing test caused by code drift, or two contracts that disagree** → [Reconciliation](reconcile-a-failure.md). Evolution is for *chosen* new behavior; a defect is a repair.
- **New market evidence ("did the competitor change pricing?")** → [Evidence Reassessment](reassess-evidence.md) first. Decide on the evidence, *then* start an Evolution if you want a product response.

## Next

- More on non-additive shapes (change, consolidate, break, deprecate, retire): [Evolve existing behavior](evolve-existing-behavior.md).
- Confirming and reading results in depth: [Inspect state and check results](inspect-and-check-results.md).
