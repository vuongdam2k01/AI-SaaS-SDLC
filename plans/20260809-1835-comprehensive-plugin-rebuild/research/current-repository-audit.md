# Current Repository Audit

## Verdict

The repository has a useful deterministic skeleton but does not yet justify the claim that it can produce implementation-ready documentation. Its strongest parts are permanent IDs, dependency graphs, impact closure, lifecycle protection, result provenance and four-flow state transitions. Its weakest parts are the actual information contracts: templates, protocols, skills, docs and model evals are too thin, while deterministic tests accept one-line placeholder bodies.

## Measured inventory

| Surface | Files | Lines | Finding |
|---|---:|---:|---|
| User skills | 5 | 96 | Each flow is reduced to 16–23 lines and assumes the model can infer the transformation details. |
| Shared protocols | 6 | 91 | 11–26 lines each; names the work but does not define inputs, transformation, artifact allocation, evidence handling or quality criteria deeply enough. |
| Scalable artifact templates | 23 | 709 | Most implementation-facing patterns are 25–45 lines and contain empty headings rather than usable field contracts. |
| TypeScript source | 32 | 2,410 | Good structural engine; little artifact-body validation. |
| Tests | 16 | 1,079 | Strong lifecycle/path coverage; scenario fixtures use a single generic sentence as an artifact body. |
| Evals | 11 | 30 | Prompts and graders are two-line assertions, with no runnable harness, transcripts or output artifacts. |
| Public docs | 8 | 165 | Lists concepts and commands, but does not teach artifact allocation, transformation or an end-to-end working example. |

## Why the two verification paths coexist

`resources/project-template/00-system/templates/verification/` contains reusable file patterns; `resources/project-template/04-verification/` is the future instance space containing project test policy and eventually UT/IT/ST/RESULT artifacts. The separation of class from instance is correct and is required for horizontal scale. The implementation is confusing because:

- both are nested under `project-template`, so the repository does not distinguish plugin-owned pattern source from copied project files;
- the name `templates/verification` looks like a second verification layer instead of a pattern catalog;
- there is no catalog explaining which pattern instantiates into which path;
- patterns contain too little instruction to demonstrate why they exist separately;
- no sample generated project shows pattern → instance → implementation/test trace.

Required correction: move canonical pattern sources to `resources/artifact-patterns/`; during `init`, pin a copy into `00-system/patterns/` with a catalog and version manifest. Live project artifacts remain in `01-discovery` through `05-control`. Do not collapse patterns into live directories, because that confuses specification classes with product instances and weakens horizontal scaling.

## Template defects

Current templates provide frontmatter, purpose comments and headings, but routinely omit:

- exact field semantics and allowed values;
- meaningful example rows showing correct granularity;
- local sub-ID rules for actions, validations, states, transitions and cases;
- authority boundaries showing which document owns payload, error copy, persistence or behavior;
- trace tables mapping upstream IDs to the exact section being implemented;
- implementation mapping and post-implementation reconciliation fields;
- explicit positive, alternate, negative, boundary, permission, concurrency and degradation coverage;
- test-level handoff so an observation excluded from UT is not silently lost before IT/ST;
- completion checks that distinguish an empty heading from a finished specification;
- a filled realistic specimen for cold-start evaluation.

The engine-owned result pattern is only seven lines and does not show execution metadata, source revision, environment, case summary, failure linkage, evidence digest or cleanup state, even though the engine internally records part of that provenance.

## Skill and protocol defects

The five skills name the correct macro flow, but they jump between commands such as “complete discovery artifacts”, “follow solution formation” and “create tests” without defining how raw observations become claims, how claims are allocated to documents, how contradictions are retained, how one feature decomposes into UC/FLOW, or how conditional design types are selected. The six protocols repeat that shallowness one layer lower.

This creates an illusion of orchestration: the deterministic engine can record a flow, but the generative work inside it remains under-specified. A model can pass the current instructions while producing generic prose.

Required correction: keep skills concise, but make each one a host adapter that loads a complete shared flow playbook. Playbooks must define concrete inputs, reads, tool actions, transformation sequence, material interaction points, artifact writes, conditional branches, loop triggers and exit evidence. Detailed artifact contracts remain in the pattern catalog rather than being copied into skills.

## Engine and hook defects

The engine correctly validates identity, location, graph references, lifecycle, symlink safety, execution provenance and baselines. It does not currently validate whether required sections contain usable structured content. Genesis only checks for one `EVD` heading and URL; temporal tests create active FTR/API/UT/IT/ST files whose entire body is one generic sentence.

The hooks are intentionally narrow, but their practical limitations are undocumented:

- shell mutation detection is heuristic and tool-name specific;
- hook launch paths use `CLAUDE_PLUGIN_ROOT`, so Codex installation is not proven;
- Stop can identify hard structural errors but cannot prove content quality;
- current SessionStart context reports state but does not route the next valid user action;
- engine invariants and hook convenience protections are not clearly separated in user documentation.

Required correction: deterministic section/table conformance, placeholder detection and cross-reference rules belong in the engine. Semantic quality remains an eval concern. Hooks stay small and must not become prose-review gates.

## Projection defects

Generated projections show node/edge inventory and coarse coverage but do not prove section-level traceability. `feature-coverage.md` lists only downstream types, not acceptance criteria coverage. Research coverage counts evidence entries without mapping research questions/claims/decisions. Interaction maps identify writers but not the chosen conflict semantics. Implementation order is topological but does not explain missing dependencies or parallelizable groups.

Required correction: generate claim-to-synthesis, AC-to-design/test, use-case path-to-test, decision-to-dependent, shared-write conflict and stale-section views from machine-readable IDs already present in artifact bodies.

## Documentation and eval defects

Public documentation does not include a complete realistic timeline. Evals are not executable and grade conversational claims rather than inspecting created files. There is no fixture demonstrating the depth of a completed Genesis or Product Evolution output. Consequently, 55 passing tests prove engine mechanics, not usefulness of the documentation produced.

## What should be preserved

- Four flows: Genesis, Evidence Reassessment, Product Evolution, Reconciliation.
- Read-only Inspect State utility.
- No separate horizontal-scale flow; later features repeat Product Evolution.
- Public-web-only research without interviews or artificial evidence.
- UT, IT and ST as the only test levels.
- Conditional ADR creation and immutable accepted decisions with successors.
- Downstream-declared dependencies, generated reverse relationships and Git/baseline time axis.
- Editorial bypass for representation-only changes.
- Execution-backed `RESULT-*`, exact configured verification commands and no repository management.

## Unresolved questions

None. The rebuild can proceed from the established scope.

