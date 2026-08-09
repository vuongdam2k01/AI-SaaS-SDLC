# Case-Study Findings

## AI-SDLC / fqe-docs: useful patterns

The AI-SDLC case study is an analysis of the real `fqe-docs` corpus. Direct inspection confirms that its implementation-facing documents are substantially richer than the current plugin templates:

| Pattern or population | Measured depth |
|---|---:|
| Screen/component master template | 288 lines, 129 table rows |
| Backend UT template | 112 lines |
| Frontend UT template | 151 lines |
| Batch UT template | 111 lines |
| Web IT template | 95 lines |
| Batch IT template | 74 lines |
| ST template | 83 lines |
| Test-result template | 83 lines |
| Real API documents | 42 files, 146–822 lines, average 289 |
| Real screen/component documents | 23 files, average 93 |
| Real UT documents | 52 files, average 216 |
| ADR population | 14 files, average 78 |

Depth is not valuable by itself. The reusable value comes from the information architecture:

- SCR progresses in a fixed semantic order: overview → regions → visible fields → actions/events → validation/messages → transitions → rationale.
- Each screen has local stable IDs for regions, output/input elements, events, validations, columns and transitions. Those IDs form test or implementation join keys.
- API documents separate five concerns: metadata/trace anchor, shared-rule references, request/response/error contract, numbered processing/transaction detail and reverse mapping to user-visible events/validations.
- UT specifies target and exclusions, upstream trace, test data, coverage categories, concrete cases and unresolved items.
- UT has an explicit handoff section for integration concerns; those observations are not discarded merely because they are outside UT scope.
- IT identifies real boundaries, common setup/data and state/output checks.
- ST is organized around business journeys and checkpoint mappings rather than implementation units.
- RESULT has a one-to-one target ID, execution context, summary, repeated run history, failure links, evidence references and cleanup confirmation.
- ADR has eight essential parts: status, context, exact question, decision, rationale, compared options, impact and related sources.
- Rules shared across many artifacts have one canonical home; individual files reference them instead of copying them.

The new plugin should adopt these information contracts while removing project-specific technology, Japanese terminology, meeting records and manual delivery conventions.

## AI-SDLC / fqe-docs: defects not to reproduce

The case study also documents weaknesses: inconsistent filename/case ID conventions, empty RESULT files, plaintext test credentials, missing frontend development standards, double-declared relationships, namespace collisions and dated notes embedded in current specs. These demonstrate why the new plugin needs machine-enforced ID spaces, execution-backed results, one-sided dependency declarations and generated reverse indexes.

Do not copy the case study verbatim. Extract its structural depth and traceability, then generalize it for SaaS product discovery and AI-assisted implementation.

## SaaS-idea-brainstorm: useful patterns

- Explicitly distinguishes public evidence from model-generated inference.
- Preserves source registry, contradictions, evidence scope and uncertainty.
- Recognizes that market alternatives include direct competitors, adjacent tools, manual work and doing nothing.
- Contains a relatively detailed blueprint vocabulary for feature behavior, data, UX, APIs, NFRs, tests, interactions and non-CRUD subsystems.
- Uses deterministic scripts where invariants can be checked and leaves semantic review to model evals.
- Records that requirements should earn their token cost through observed failures.

These principles can inform Genesis and Evidence Reassessment without importing the old pipeline.

## SaaS-idea-brainstorm: anti-patterns to reject

Measured size shows the procedural burden: 32 skills/3,850 lines, 5 custom agents/365 lines, 23 scripts/6,229 lines, 5 hook files/1,106 lines and 17 templates/1,528 lines. Its user journey contains seven stages, ten gates, three gate layers, signed thresholds, approval ceremonies, modes, capability rungs and extensive post-lock machinery.

Do not reproduce:

- automatic stage activation or a gate after every document set;
- adversarial self-review loops with unchanged input;
- custom “internet researcher” or competitor-mining agents standing in for real search/fetch tools;
- mandatory interviews, outreach, landing pages, presales, payments or user testing;
- generic market thresholds and fixed sample counts treated as universal truth;
- duplicate normative rules distributed across skills, templates, agents and scripts;
- states whose complexity exceeds the product decisions being captured;
- new artifacts created to describe every procedural transition;
- automatic semantic mutation following new evidence;
- forcing representation-only edits through review, impact and regression cycles;
- claims of completion based on simulated evidence or model self-consistency.

## Synthesis for the rebuild

Use the case studies asymmetrically:

- From AI-SDLC/fqe-docs, take artifact anatomy, local IDs, canonical ownership, cross-layer traceability, test handoff and horizontal scaling patterns.
- From SaaS-idea-brainstorm, take evidence discipline and useful discovery coverage, while removing its pipeline, gates, agents, interviews and procedural state.
- Keep the current repository’s deterministic graph, temporal baselines and lifecycle protections as the control plane.

The resulting model is “deep documents, light process”: four event-driven flows; rich patterns; deterministic structural checks; semantic work only when new evidence, intent, code, execution or contradiction exists.

## Unresolved questions

None.

