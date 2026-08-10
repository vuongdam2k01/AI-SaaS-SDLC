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
- one next valid action, chosen from editorial edit, continue active flow, Reassessment, Evolution, Reconciliation or no action.

When the next valid action is an editorial edit, print the runnable command with `PLUGIN_ROOT` already resolved, not the abstract form:

```
node "<PLUGIN_ROOT>/bin/ai-saas-sdlc" refresh --editorial
```

An editorial change is applied outside every flow, so the session that applies it has no skill context and cannot resolve the plugin root on its own. The same resolved command is recorded in `.ai-saas-sdlc/engine.json` as `editorial_command`; read it there rather than searching the filesystem for a copy of the engine.

Never claim a test passed without an execution-backed result.

## 6. Stop and re-entry

Stop after the report. Inspect State never creates a baseline, issue, change or projection.

It may be invoked again at any time because it is read-only, but unchanged state should produce the same facts. A different report requires changed files/state, new execution/evidence, a different scope or a corrected interpretation—not a self-review loop.
