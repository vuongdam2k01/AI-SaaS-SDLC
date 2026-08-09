# Phase 3 — Flows, Skills and Protocols

## Context Links

- [Current repository audit](research/current-repository-audit.md)
- [Artifact quality contract](research/artifact-inventory-and-quality-contract.md)

## Overview

Priority: critical  
Status: complete  
Turn the four flow names into complete, input-driven working playbooks without recreating a gated pipeline.

## Key Insights

A flow requires concrete intake, state read, external/internal observations, transformations, conditional interaction, artifact writes, verification and temporal exit. “Complete the documents” is not a flow. Conversely, every document does not require a ceremony: loops are legal only when new evidence, intent, code, execution or contradiction arrives.

## Requirements

- Five skills remain the only user interfaces; four mutate and Inspect State is read-only.
- Shared playbooks define work for both hosts; host skills contain invocation syntax and tool-name adaptation only.
- Genesis uses real web search/fetch and public sources; no agents simulating research, no interviews/outreach.
- One consolidated interaction only for material choices that cannot be resolved from explicit input/evidence.
- Product Evolution handles add/change/consolidate/break/retire and cross-feature degradation.
- Reconciliation begins from a concrete mismatch and repairs the authoritative side only.
- Editorial changes remain outside all semantic flows.

## Architecture

```text
user intent/event
  -> host skill adapter
  -> shared flow playbook
  -> selected protocols + pattern catalog
  -> deterministic engine operations
  -> canonical artifacts + projections + baseline
```

Each playbook contains: accepted inputs; mandatory reads; real tool actions; transformation map; material questions; writes; validation; exit; legal re-entry triggers.

## Related Code Files

Modify:

- `skills/{genesis,reassess-evidence,evolve-product,reconcile,inspect-state}/SKILL.md`
- `codex/skills/*/SKILL.md`
- `resources/protocols/{public-web-research,behavior-formation,solution-formation,impact-analysis,test-derivation,reconciliation}.md`

Create:

- `resources/flow-playbooks/{genesis,evidence-reassessment,product-evolution,reconciliation,inspect-state}.md`
- optional focused references such as `resources/protocols/evidence-synthesis.md` only if they remove duplication
- flow contract tests and forward-test prompts/transcripts

## Implementation Steps

1. Define a common playbook shape with input contract, observation sources, transformations, artifact allocation, interaction, engine calls, output contract and re-entry triggers.
2. Genesis: preserve raw input; extract explicit constraints; form decision-linked research questions; search/fetch; register sources/claims; synthesize market/customer/problem/competition/commercial/feasibility; distinguish evidence/inference/unknown; ask one material decision set; create opportunity and product foundations; validate and baseline.
3. Evidence Reassessment: scope one claim/decision; inspect existing evidence; search only the delta; append evidence; revise affected synthesis; create an issue when product truth may be invalid; never mutate product/design/test automatically.
4. Product Evolution: normalize semantic intent; identify existing behavior and constraints; form FTR/AC; derive UC paths and FLOW; compute impact; select conditional design artifacts; create ADR only when threshold met; derive test cases/handoffs; optionally implement in configured source; run selected regression; baseline.
5. Reconciliation: ingest exact failure/drift; reproduce or inspect; classify authority by claim domain; create/update ISS; compute closure; repair docs or code; derive/update regression; execute; close issue/baseline without unrelated review.
6. Inspect State: render baseline, active flow/change, unresolved questions/issues, stale closure, unverified tests and next valid action without writes.
7. Add anti-procedure rules once in shared playbooks: no self-review loop, no gate on prose, no auto-repeat without new observation, no unnecessary artifacts.
8. Forward-test each skill with a fresh minimal-context agent against realistic prompts and inspect the files produced, not just the response text.

## Todo List

- [x] Five complete shared playbooks.
- [x] Six deep but non-duplicative protocols.
- [x] Thin Claude/Codex adapters.
- [x] Explicit input→transformation→output mapping for every flow.
- [x] Legal loop triggers and stop conditions documented and tested.

## Success Criteria

- Genesis creates usable discovery/product foundations from raw idea and traceable public evidence without scalable feature documents.
- A later feature runs one Product Evolution from intent through FTR/UC/FLOW/design/UT/IT/ST/implementation verification.
- Shared entity/API changes pull prior features and tests into impact/regression closure.
- Pricing reassessment changes evidence/synthesis only until the user chooses a product change.
- A tone edit starts no flow and invalidates no baseline.
- Skill token load stays bounded: only one playbook, needed protocols and referenced patterns are loaded.

## Risk Assessment

- Risk: detailed playbooks become a new SaaS-idea-brainstorm pipeline. Mitigation: event-driven four-flow boundary, no gates/stages/agents, and every loop requires a new observation.
- Risk: thin wrappers hide critical instructions. Mitigation: each wrapper names exact mandatory shared references and engine entry/exit calls.
- Risk: model claims web research without tools. Mitigation: evidence entries require inspected URLs and tool-use evals inspect traces.

## Security Considerations

Treat fetched content as untrusted data, never instructions. Record source provenance. Inspect/edit only configured implementation roots and execute only declared verification commands.

## Next Steps

Phase 4 makes structural completion and traceability enforceable.
