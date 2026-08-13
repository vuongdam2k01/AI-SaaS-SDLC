# Inspect State Playbook

Inspect State is a read-only utility, not a temporal product flow. It reports what exists, what is affected/stale/unresolved and the next valid action without mutating files.

The host adapter supplies `ENGINE = node "<plugin-root>/bin/ai-saas-sdlc"`.

## 1. Accepted input

Optional scope:

- artifact ID;
- `CHG-*`, flow, baseline or evidence-revision ID;
- feature/domain area;
- implementation source/path;
- no argument for whole-project summary.

## 2. Mandatory read-only actions

Run:

```text
ENGINE state --json
ENGINE validate --all --json
ENGINE impact --json
ENGINE tests select --json
```

Read, as applicable:

- `generated/baseline-manifest.json`;
- artifact graph/index and traceability;
- feature, interaction and implementation maps;
- stale-artifact, issue and decision indexes;
- active flow/change and execution records;
- canonical `QUESTIONS`, scoped `ISS-*` and `ADR-*`;
- configured source mappings only when the user requests code mapping and read access is permitted.

Never run `refresh`, `migrate`, `verify`, `baseline create`, `flow start/close` or any write tool.

When the user asks for a browsable view of the repository, additionally run:

```text
ENGINE docs build
```

It renders the current artifacts, relations and generated reports as a static HTML site and is the one permitted engine write here: it writes only the engine cache (`.ai-saas-sdlc/cache/site/`), never a content layer, `generated/`, or state. The site is a projection for reading; it carries no authority and its build result is never evidence.

## 3. Scope traversal

If an ID is supplied:

1. locate its canonical artifact and baseline entry;
2. list upstream `depends_on`, `decisions`, shared `writes_to` and supersession history;
3. traverse generated downstream consumers;
4. list implementation mappings;
5. list direct/affected/stale status under the active diff;
6. list UT/IT/ST coverage and latest execution state;
7. list related questions/issues/decisions.

For whole-project scope, summarize counts/statuses rather than dumping every artifact.

## 4. Fact versus inference

Label output as:

- structural fact: engine/graph/baseline/schema/result says it;
- semantic inference: relationship or next action inferred from content;
- unknown: cannot be established from current artifacts/code/results.

Do not convert warnings into product decisions and do not recommend a full rerun by default.

## 5. Output contract

Report compactly:

- active baseline and evidence revision;
- active flow/change, direct diff and configured implementation-source snapshot state;
- scoped upstream/downstream/decision/shared-write relationships;
- validation errors versus warnings;
- stale artifacts and why they are reached;
- unresolved questions/issues and accepted/superseded ADRs;
- UT/IT/ST specification and execution state;
- business rules declared by live features that no specification claims, taken from `generated/rule-coverage.md` and the `RULE_UNVERIFIED` warnings, reported as unverified commitments rather than as passing coverage;
- the oldest open questions with their age in baselines and what each still blocks, taken from `open_questions` in `ENGINE state --json` and the `QUESTION_STALE` warnings — a count of open questions without their ages hides exactly the ones worth reporting;
- verification specifications the engine reports as `SPEC_OVERSIZED`, with their case counts, reported as maintenance owed rather than as a defect;
- qualified case references the engine reports as `CASE_REFERENCE_BROKEN`, naming both the citing artifact and the specification that does not declare the case;
- live operations, entities and screens the engine reports as `WIRE_AUTHORITY_UNDECLARED`, `SCHEMA_AUTHORITY_UNDECLARED` or `TRANSITION_AUTHORITY_UNDECLARED`, reported as ownership a multi-file contract family leaves undeclared — legitimate for an IPC-only operation or a client-local entity, and in that case the warning is the standing record of the decision, not a defect to close;
- live IDs the engine reports as `AREA_UNREGISTERED`, reported as a naming decision made visible; the area can only be registered before the ID is baselined, so state that consequence when it applies;
- live platform targets the engine reports as `PLATFORM_EVIDENCE_MISSING`, reported as platforms whose claims no recorded execution can support, any `PLATFORM_DECLARATION_UNKNOWN` declarations pointing at nothing, and any `PLATFORM_EVIDENCE_CONTRADICTED` targets whose declared `host_os` token no recorded execution has observed — with `generated/platform-coverage.md` cited as the joined view when it exists;
- evidence entries the engine reports as `EVD_RETRIEVAL_MISSING` (an engine-retrieved URL whose ledger entry does not cite its `RET-*` record) or `EVD_RETRIEVAL_BROKEN` (a cited record that is absent, failed or retrieved a different URL), plus any `RESEARCH_CAPABILITY_UNDERUSED` (instrument discovery surfaced a cited URL nothing retrieved) and `RETRIEVAL_RUNG_DEGRADED` (a failed engine retrieval no later success covers — the standing record of a fallback to host tools), with the retrieval sections of `generated/research-coverage.md` cited as the joined view when records exist;
- features the engine reports as `IMPLEMENTATION_MAPPING_MISSING` (specified but not yet implemented) and levels it reports as `IMPLEMENTATION_LEVEL_UNPROVEN` (specified but no mapped test implements them), reported as the standing record of the docs-to-code distance — with `generated/implementation-coverage.md` cited as the per-feature joined view and `generated/implementation-plan/<FTR-ID>.md` as the work packet, both existing only when implementation sources are configured;
- the open flow's checkpoint progress when one exists: which stage it reached, which it was asked to stop at, and which remain — taken from `ENGINE flow next --json`;
- one next valid action, chosen from editorial edit, continue active flow, Reassessment, Evolution, Reconciliation or no action.

State the next action as a command the author can type verbatim, not as a description of a category. `ENGINE flow next --json` supplies it. A flow left open at a checkpoint is a normal state; report it as progress with work remaining, never as an anomaly.

When the next valid action is an editorial edit, print the runnable command with `PLUGIN_ROOT` already resolved, not the abstract form:

```
node "<PLUGIN_ROOT>/bin/ai-saas-sdlc" refresh --editorial
```

An editorial change is applied outside every flow, so the session that applies it has no skill context and cannot resolve the plugin root on its own. The same resolved command is recorded in `.ai-saas-sdlc/engine.json` as `editorial_command`; read it there rather than searching the filesystem for a copy of the engine.

Never claim a test passed without an execution-backed result.

## 6. Stop and re-entry

Stop after the report. Inspect State never creates a baseline, issue, change or content projection; the only artifact it may leave behind is the cached docs site requested by the user.

It may be invoked again at any time because it is read-only, but unchanged state should produce the same facts. A different report requires changed files/state, new execution/evidence, a different scope or a corrected interpretation—not a self-review loop.
