# Inspect state and check results

Every mutation flow ends by telling you what it did. This guide is about confirming that independently — answering *"where do things actually stand, what's affected, what's still owed, and what should I do next?"* — plus the one write that is **not** a flow: editorial edits.

## Inspect State: the read-only lens

```text
/ai-saas-sdlc:inspect-state [optional scope]
```

It **never writes** — no refresh, no verify, no baseline, no issue, no file edit. You can run it any time, as often as you like; unchanged state produces the same facts. Scope it, or omit the scope for a whole-project summary:

| Scope you pass | What you get |
|---|---|
| *(nothing)* | Project summary: active baseline, evidence revision, any open flow, validation, stale artifacts, open questions/issues, UT/IT/ST state |
| `FTR-007` (any artifact ID) | That artifact's baseline entry, upstream `depends_on`/`decisions`/shared `writes_to`, downstream consumers, implementation mappings, coverage and latest execution, related questions/issues/decisions |
| `CHG-003` / a flow / baseline / `EVR-*` | The change and its diff, direct and affected IDs, checkpoint progress if a flow is open |
| a feature/domain area | The artifacts in that area and their statuses |
| an implementation path | Its mappings — only when you ask for code mapping and read access is granted |

### What to read in the output

Inspect State labels everything as one of three things, and the distinction matters:

- **Structural fact** — the engine/graph/baseline/result says so.
- **Semantic inference** — a relationship or next step *inferred* from content.
- **Unknown** — cannot be established from current artifacts/code/results.

It will not turn a warning into a product decision, and it never claims a test passed without an execution-backed result. The things worth scanning for every time:

- **Active baseline and evidence revision** — the two IDs that tell you *when* you are.
- **Open flow + checkpoint progress** — which stage it reached, which it was asked to stop at, which remain. A flow left open at a checkpoint is a **normal** state, reported as progress with work remaining — not an anomaly.
- **Validation errors vs. warnings** — errors block; warnings are work owed (see below).
- **Stale artifacts** — and *why* each was reached.
- **Business rules no spec claims** (`RULE_UNVERIFIED`) — reported as *unverified commitments*, not as passing coverage.
- **Oldest open questions with their age in baselines** — and what each still blocks. A count without ages hides exactly the ones worth reporting.
- **Oversized specs** (`SPEC_OVERSIZED`) with case counts — maintenance owed.
- **One next valid action, as a runnable command** — read from `flow next`, typed verbatim.

## Errors vs. warnings: what actually blocks

The engine's `validate` returns non-zero only when there is an **error** — a broken structure: a bad ID, a broken reference, a lifecycle or supersession violation, a coverage gap, a mutated immutable record. Those must be fixed before a baseline.

Six findings are **warnings** and never block a baseline, because each names a *judgement* or a debt rather than a broken structure. They are reported precisely so that owing them stays visible:

| Warning | Means | You owe |
|---|---|---|
| `RULE_UNVERIFIED` | A declared business rule that no specification claims | A test that covers the rule |
| `SPEC_OVERSIZED` | A live IT/ST spec past the case threshold | Splitting the spec |
| `CASE_REFERENCE_BROKEN` | A qualified `#TC-nn` reference naming a case its specification does not declare | Fixing the reference, or a recorded deferral when it sits in an immutable ADR |
| `QUESTION_STALE` | An open question that has outlived three baselines | An answer, a decision, or an explicit "still open + what would close it" |
| `PLATFORM_EVIDENCE_MISSING` | A live `PLT-*` platform target no verification command declares evidence for | `platforms: [PLT-...]` on a command that exercises it, or an unproven-platform note in `TEST-POLICY` |
| `PLATFORM_DECLARATION_UNKNOWN` | A `platforms:` declaration naming no live platform target | Fixing the declaration or creating the target |

Seeing warnings after a flow closes is expected and healthy. Seeing **errors: 0** is the bar for "it worked."

## Where the machine-generated truth lives

Flows write canonical artifacts by hand, but the engine regenerates the cross-cutting views into `generated/`. These are reproducible projections — never edit them, but do read them:

- **`generated/baseline-manifest.json`** — the authoritative snapshot of the active baseline.
- **Traceability and artifact graph/index** — how everything connects.
- **Feature / interaction / implementation maps** — what maps to what code.
- **`generated/rule-coverage.md`** — which business rules are claimed by a spec and which are the `RULE_UNVERIFIED` commitments.
- **Stale-artifact, issue and decision indexes.**

If you ever doubt whether the generated views are current, the engine can tell you without writing anything: `refresh --check` reports drift; it does not fix it.

## Checking execution results honestly

A flow that "finished" is not the same as a flow whose tests *ran*. When implementation sources and verification commands are configured, each `verify --execute` reserves a fresh `EXEC-*` and renders a real `RESULT-EXEC-*` from the actual run — exit code, timing, log digest, source snapshot. Key truths to rely on:

- A **failed** attempt stays in history; a rerun gets a **new** ID. Nothing is overwritten.
- Baseline verification uses the **latest** applicable attempt for each declared command.
- With **no** commands configured, results read `not-configured`. That is the honest state — no pass is ever inferred or fabricated, and Inspect State will never claim otherwise.

So when you check results, look for real `RESULT-*` IDs, not a prose "tests pass."

## Editorial edits (spelling, tone, formatting)

Fixing wording is **not** a product event and must not open a flow. It uses one command, run **outside** every flow:

```text
node "<PLUGIN_ROOT>/bin/ai-saas-sdlc" refresh --editorial
```

- It accepts a change **only** when it is body-only: metadata, relationships, evidence, immutable records and machine-owned files are all unchanged. It creates no change record and runs no tests.
- Because it runs outside every flow, the session applying it has no skill context and cannot resolve the plugin root on its own. **Do not search the filesystem for a copy of the engine** — a different copy may be a different version. The resolved command is recorded for you in `.ai-saas-sdlc/engine.json` as `editorial_command`; run that verbatim. Inspect State also prints it, fully resolved, whenever an editorial edit is the next valid action.

If you try to route a wording change through Product Evolution, it is bounced back here — a wording-only edit bypasses the semantic flows by design.

## The rule that governs when *any* flow may run again

A mutation loop is legal only after a **real event**: a new or changed public source, an explicit product decision, an inspected file/code diff, an execution result, or a concrete contradiction. Rereading unchanged, model-authored prose and deciding it could be "more complete" is **not** an event and cannot justify another flow. This is why Inspect State is the right default between flows: it lets you look as much as you want without manufacturing a reason to mutate.

## Where to go from what you find

Inspect State always ends with one runnable next command. Typically it points to:

- **Continue an open flow** → the `--until … continue CHG-*` command it prints.
- **An editorial edit** → the resolved `refresh --editorial` command.
- **A new event** → [Product Evolution](implement-a-feature.md), [Evidence Reassessment](reassess-evidence.md) or [Reconciliation](reconcile-a-failure.md), depending on what the state revealed.
- **No action** → sometimes the honest answer is that nothing is owed right now.
