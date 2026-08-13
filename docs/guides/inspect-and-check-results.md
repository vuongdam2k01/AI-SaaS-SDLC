# Inspect state and check results

Every mutation flow ends by telling you what it did. This guide is about confirming that independently — answering *"where do things actually stand, what's affected, what's still owed, and what should I do next?"* — plus the one write that is **not** a flow: editorial edits.

## Inspect State: the read-only lens

```text
/ai-saas-sdlc:inspect-state [optional scope]
```

It **never writes a content file** — no refresh, no verify, no baseline, no issue, no edit to anything in `00-system/` through `05-control/` or `generated/`. Its one sanctioned write is the browsable site described [below](#browse-the-repository-as-a-site), and only when you ask for it. You can run it any time, as often as you like; unchanged state produces the same facts. Scope it, or omit the scope for a whole-project summary:

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

Twenty-one findings are **warnings** and never block a baseline, because each names a *judgement* or a debt rather than a broken structure. They are reported precisely so that owing them stays visible:

| Warning | Means | You owe |
|---|---|---|
| `RULE_UNVERIFIED` | A declared business rule that no specification claims | A test that covers the rule |
| `SPEC_OVERSIZED` | A live IT/ST spec past the case threshold | Splitting the spec |
| `CASE_REFERENCE_BROKEN` | A qualified `#TC-nn` reference naming a case its specification does not declare | Fixing the reference, or a recorded deferral when it sits in an immutable ADR |
| `QUESTION_STALE` | An open question that has outlived three baselines | An answer, a decision, or an explicit "still open + what would close it" |
| `PLATFORM_EVIDENCE_MISSING` | A live `PLT-*` platform target no verification command declares evidence for | `platforms: [PLT-...]` on a command that exercises it, or an unproven-platform note in `TEST-POLICY` while this warning stands as the record |
| `PLATFORM_DECLARATION_UNKNOWN` | A `platforms:` declaration naming no live platform target | Fixing the declaration or creating the target |
| `PLATFORM_EVIDENCE_CONTRADICTED` | A live `PLT-*` whose declared `host_os` token no recorded execution declaring it has ever observed | Fixing the token, executing a declaring command on that host, or a recorded limitation in `TEST-POLICY` while this warning stands as the record |
| `WIRE_AUTHORITY_UNDECLARED` | A live `API-*` naming no owning interface file while sibling interface files exist | The owning `WIRE-*`/`OPENAPI-CONTRACT` in `depends_on`, or the standing record that the operation is IPC/CLI-only |
| `SCHEMA_AUTHORITY_UNDECLARED` | A live `ENT-*` naming no owning schema file while sibling `.dbml` files exist | The owning `SCHEMA-*`/`PHYSICAL-SCHEMA` in `depends_on`, or the standing record that the entity lives in a client-local or non-relational store |
| `TRANSITION_AUTHORITY_UNDECLARED` | A live `SCR-*` naming no owning transition graph while sibling `.mmd` graphs exist | The owning `TRANSITIONS-*`/`SCREEN-TRANSITIONS` in `depends_on` |
| `AREA_UNREGISTERED` | A live artifact ID naming an area outside the optional `areas` registry in `sdlc.config.yaml` | Registering the area, or picking a registered one before the ID is baselined |
| `EVD_RETRIEVAL_MISSING` | An engine-retrieved URL whose evidence entry does not cite its `RET-*` record | The `- Retrieval: RET-...` line on the entry |
| `EVD_RETRIEVAL_BROKEN` | A cited `RET-*` record that is absent, failed, or retrieved a different URL | Fixing the citation or re-retrieving the source |
| `RESEARCH_CAPABILITY_UNDERUSED` | Instrument discovery surfaced a cited URL no engine retrieval inspected | Retrieving the page through the engine, or the standing record that host tools carried it |
| `RETRIEVAL_RUNG_DEGRADED` | A failed engine retrieval no later success covers | A later successful retrieval, or the standing record of the fallback to host tools |
| `IMPLEMENTATION_MAPPING_MISSING` | With implementation sources configured, an active feature none of whose declaring artifacts maps to code | Mappings when the feature is built, or the standing record that it is specified but not yet implemented |
| `IMPLEMENTATION_LEVEL_UNPROVEN` | With implementation sources configured, a feature level (UT/IT/ST) whose active specifications include none mapped to an implemented test | Implementing and mapping the level, or the standing record that it is specified but unproven |
| `IMPLEMENTATION_DRIFT` | A mapped file whose content left the baseline behind while every artifact declaring it did not | Bringing the documents level through a flow that owns the change, reverting the code, or a Reconciliation on the recorded divergence |
| `IMPLEMENTATION_SYMBOL_MISSING` | A spec mapping row whose test symbol does not occur in the file the row names (approximate textual check) | Fixing the mapping row or the test name so the case can be located |
| `IMPLEMENTATION_MAPPING_ROW_IGNORED` | A mapping-table row present but unparseable (column count, malformed case ID, placeholder mixed with content) | Fixing the row so its cases can join execution reports |
| `IMPLEMENTATION_MAPPING_PATH_MISSING` | On a frontmatter-mapped spec, rows whose test paths exist under no configured source — one finding per specification | Fixing the paths: they are relative to the configured source root itself, never prefixed with the source ID |

Seeing warnings after a flow closes is expected and healthy. Seeing **errors: 0** is the bar for "it worked."

## Where the machine-generated truth lives

Flows write canonical artifacts by hand, but the engine regenerates the cross-cutting views into `generated/`. These are reproducible projections — never edit them, but do read them:

- **`generated/baseline-manifest.json`** — the authoritative snapshot of the active baseline.
- **Traceability and artifact graph/index** — how everything connects.
- **Feature / interaction / implementation maps** — what maps to what code.
- **`generated/rule-coverage.md`**, **`generated/acceptance-coverage.md`**, **`generated/evidence-claim-coverage.md`** — which business rules, acceptance criteria and evidence claims are claimed by a specification and which are still commitments.
- **`generated/implementation-order.md`** — the dependency-ordered build sequence.
- **`generated/research-coverage.md`** — present once engine retrieval has run: which cited sources carry `RET-*` provenance.
- **`generated/decision-impact/<ADR-ID>.md`** and **`generated/change-impact/<CHG-ID>.md`** — what one decision or one change reached.
- **`generated/platform-coverage.md`** — present once any platform target exists: each target's declaring commands, latest matching executions and observed hosts beside its declared `host_os`, with unknown declarations listed.
- **`generated/implementation-coverage.md`** — present once implementation sources are configured: per active feature, how much of its own design surface and each test level is mapped to code, the latest execution per configured command, and the unmapped complement. Derived through the same predicates as the `IMPLEMENTATION_*` warnings, so it never disagrees with a finding.
- **`generated/implementation-plan/<FTR-ID>.md`** — one work packet per active feature, same gating: the closure in dependency order with mappings and owning contract files, the foundation rows the closure references, the covering UT/IT/ST specifications with their test-case tables, and the configured commands.
- **Stale-artifact, issue and decision indexes.**

If you ever doubt whether the generated views are current, the engine can tell you without writing anything: `refresh --check` reports drift; it does not fix it.

Projections regenerate on `refresh` and on `verify`, and on nothing else — so after editing mappings by hand, run `refresh` before you read a dashboard back, or you will read the state you had before the edit.

## Browse the repository as a site

Reading a hundred-artifact repository file by file is the wrong tool for questions like *what depends on this?* Ask Inspect State for a browsable view:

```text
/ai-saas-sdlc:inspect-state give me a browsable view of the repository
```

It runs the engine's `docs build`, which renders the current artifacts, their relationships and the generated reports into a static, dependency-free HTML site — one page per artifact with resolved ID links and reverse traceability, an interactive dependency graph, and status-filtered indexes. It prints the path to open; by default the site lands in `.ai-saas-sdlc/cache/site/index.html`.

Three properties matter:

- **It writes only the engine cache.** No content layer, no `generated/`, no state. It refuses to write into a managed content directory or into a directory it did not produce.
- **It is a projection, never authority.** Nothing in the site is evidence, and no flow reads it back. If the site and an artifact disagree, the artifact is right and the site is stale — rebuild it.
- **It is disposable.** The cache is git-ignored; delete it any time and rebuild.

## Checking execution results honestly

A flow that "finished" is not the same as a flow whose tests *ran*. When implementation sources and verification commands are configured, each `verify --execute` reserves a fresh `EXEC-*` and renders a real `RESULT-EXEC-*` from the actual run — exit code, timing, log digest, source snapshot. Execution is legal only inside Product Evolution or Reconciliation; outside a flow the engine refuses it rather than producing an unattributable record. Key truths to rely on:

- A **failed** attempt stays in history; a rerun gets a **new** ID. Nothing is overwritten.
- Baseline verification uses the **latest** applicable attempt for each declared command.
- With **no** commands configured, results read `not-configured`. That is the honest state — no pass is ever inferred or fabricated, and Inspect State will never claim otherwise.
- **A command that declared a `report:` file yields per-case rows** — each report case joined to the `TC-*` rows of your specification's `## Implementation mapping` table, with the aggregate totals beside them. Undeclared, case counts honestly read `not reported by configured command`. On a very large passing set the artifact shows the first 50 passed rows plus a trailer naming how many more; failures are never capped.
- **Three outcomes are not test failures, and the record says which.** `timed_out` — the command was killed at its budget; `spawn_error` — it never ran at all (a missing binary, a bad `cwd`), an environment failure the `RESULT-*` names as such; `output_truncated` — the log hit the byte budget. On a timeout `verify` also prints one line naming the execution and both remedies: raise `command_timeout_ms` in the machine-local `.ai-saas-sdlc/verification-tools.json`, or give that command its own `timeout_ms` in `sdlc.config.yaml`.

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

- **Continue an open flow** → the `--until … continue FLOW-*` command it prints.
- **An editorial edit** → the resolved `refresh --editorial` command.
- **A new event** → [Product Evolution](implement-a-feature.md), [Evidence Reassessment](reassess-evidence.md) or [Reconciliation](reconcile-a-failure.md), depending on what the state revealed.
- **No action** → sometimes the honest answer is that nothing is owed right now.
