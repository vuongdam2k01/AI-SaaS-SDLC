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

When implementation sources are configured, additionally run:

```text
ENGINE config requirements --json
```

It reads key *names* from the sources and from any environment file it consults, never a value, so it is safe in a read-only inspection of a repository whose environment holds real credentials. Never print, infer or ask for a value.

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
- stale artifacts and why they are reached, separating the `ripple` set — what a change put at risk — from what the closure reached only as a prerequisite;
- artifacts the engine reports as `IMPACT_UNCLASSIFIED`, naming the change that reached each one and whether the decision is still open in a live flow or standing as unserviced ripple debt from a closed one, with `generated/change-impact/<CHG-ID>.md` cited as the ledger; report these as decisions owed, never as defects, and never classify anything from this flow — Inspect State writes nothing;
- specifications the engine reports as `SPEC_EXECUTION_UNATTRIBUTED`, reported as selection that outran attributable execution — a command declaring no machine-readable report attributes nothing, so state that cause when it applies rather than claiming the specification did not run;
- specifications the engine reports as `CLAIM_WITHOUT_DEPENDENCY`, naming both the claiming specification and the artifact it proves without declaring, reported as coverage the closure cannot reach;
- unresolved questions/issues and accepted/superseded ADRs;
- UT/IT/ST specification and execution state;
- business rules declared by live features that no specification claims, taken from `generated/rule-coverage.md` and the `RULE_UNVERIFIED` warnings, reported as unverified commitments rather than as passing coverage;
- the same reading for the rules the foundations own and the behavior each screen declares, from `generated/foundation-coverage.md`, `generated/screen-coverage.md` and the `ACCESS_UNVERIFIED`, `INVARIANT_UNVERIFIED`, `ERROR_UNVERIFIED`, `UX_UNVERIFIED` and `SCREEN_BEHAVIOR_UNCLAIMED` warnings; a screen behavior counts as closed when a case proves it, an exclusion hands it on, or a question records that it is undefined;
- any `DESIGN_TOKENS_UNCOMMITTED` warning, reported as a commitment the product owes itself rather than a defect: live screens are rendering with no committed `DT-*` design token, and the closure is a Product Evolution flow that commits the tokens or an open question citing `UX-RULES#design-tokens` that defers them deliberately;
- the ceiling ledger, when implementation sources are configured and read access is permitted: every `ceiling:` marker in the configured sources (`grep -rnE '(#|//|/\*|<!--) ?ceiling:'`, skipping dependency and build directories), one row per marker with `file:line`, the limit named and the upgrade trigger — flagging as `no-trigger` any marker that names no revisit condition, because those are the deliberate simplifications that silently become permanent. Report the count and the no-trigger count; an empty ledger is reported as clean, not skipped;
- the runtime configuration surface, when implementation sources are configured: keys the engine reports as `CONFIG_REQUIREMENT_UNSUPPLIED`, reported as what the owner supplies before the paths depending on them can run; keys it reports as `CONFIG_KEY_UNDECLARED`, reported as a surface the code owns and no artifact does — name the artifact whose contract each one belongs to rather than treating them as defects; `CONFIG_DECLARATION_UNKNOWN` entries as requirements that outlived their code or their design; and any command reported unrunnable on this machine, so a suite that cannot execute says why instead of appearing to have passed. State key names only; never report, request or infer a value;
- the oldest open questions with their age in baselines and what each still blocks, taken from `open_questions` in `ENGINE state --json` and the `QUESTION_STALE` warnings — a count of open questions without their ages hides exactly the ones worth reporting;
- verification specifications the engine reports as `SPEC_OVERSIZED`, with their case counts, reported as maintenance owed rather than as a defect;
- qualified case references the engine reports as `CASE_REFERENCE_BROKEN`, naming both the citing artifact and the specification that does not declare the case;
- live operations, entities and screens the engine reports as `WIRE_AUTHORITY_UNDECLARED`, `SCHEMA_AUTHORITY_UNDECLARED` or `TRANSITION_AUTHORITY_UNDECLARED`, reported as ownership a multi-file contract family leaves undeclared — legitimate for an IPC-only operation or a client-local entity, and in that case the warning is the standing record of the decision, not a defect to close;
- live IDs the engine reports as `AREA_UNREGISTERED`, reported as a naming decision made visible; the area can only be registered before the ID is baselined, so state that consequence when it applies;
- live platform targets the engine reports as `PLATFORM_EVIDENCE_MISSING`, reported as platforms whose claims no recorded execution can support, any `PLATFORM_DECLARATION_UNKNOWN` declarations pointing at nothing, and any `PLATFORM_EVIDENCE_CONTRADICTED` targets whose declared `host_os` token no recorded execution has observed — with `generated/platform-coverage.md` cited as the joined view when it exists;
- evidence entries the engine reports as `EVD_RETRIEVAL_MISSING` (an engine-retrieved URL whose ledger entry does not cite its `RET-*` record) or `EVD_RETRIEVAL_BROKEN` (a cited record that is absent, failed or retrieved a different URL), plus any `RESEARCH_CAPABILITY_UNDERUSED` (instrument discovery surfaced a cited URL nothing retrieved) and `RETRIEVAL_RUNG_DEGRADED` (a failed engine retrieval no later success covers — the standing record of a fallback to host tools), with the retrieval sections of `generated/research-coverage.md` cited as the joined view when records exist;
- features the engine reports as `IMPLEMENTATION_MAPPING_MISSING` (specified but not yet implemented), levels it reports as `IMPLEMENTATION_LEVEL_UNPROVEN` (specified but no mapped test implements them), mappings it reports as `IMPLEMENTATION_DRIFT` (mapped code left the baseline behind while the documents did not — the recorded trigger for Reconciliation), artifacts it reports as `DOCUMENTATION_DRIFT` (the mirror: the specification moved and every file it maps stayed put, so the code is behind its own contract) and mapping rows it reports as `IMPLEMENTATION_SYMBOL_MISSING` (a declared test symbol the named file does not contain), `IMPLEMENTATION_MAPPING_ROW_IGNORED` (a table row present but unparseable) or `IMPLEMENTATION_MAPPING_PATH_MISSING` (a frontmatter-mapped specification's row whose path resolves under no source), all standing records of the docs-to-code distance — with `generated/implementation-coverage.md` cited as the per-feature joined view and `generated/implementation-plan/<FTR-ID>.md` as the work packet, both existing only when implementation sources are configured;
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
