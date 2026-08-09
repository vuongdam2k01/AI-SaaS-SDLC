# Phase 5 — Tests, Evals, Documentation and Release Validation

## Context Links

- [Current repository audit](research/current-repository-audit.md)
- All preceding phase files

## Overview

Priority: critical  
Status: complete  
Replace structural toy fixtures and two-line evals with realistic artifact-producing simulations, then document only behavior that has passed.

## Key Insights

Passing engine mechanics does not prove useful output. Acceptance must inspect generated artifacts on a forward-moving timeline and challenge the flow design itself. Model-backed evals measure semantic quality; deterministic tests enforce contracts and temporal invariants.

## Requirements

- Keep current safety/lifecycle tests and add content/dual-host tests.
- Build one complete multi-feature fixture at realistic artifact depth.
- Evals inspect repository outputs and tool traces, not only final chat messages.
- Paid/model-backed eval execution remains optional, but cases, graders and deterministic fixture assertions ship complete.
- README, artifact/flow/command/config references and architecture must match actual behavior.
- CI validates Windows/Linux Node 22/24 plus both plugin manifests/packages.

## Related Code Files

Modify:

- `tests/*.test.ts`, especially `temporal-scenarios.test.ts`, `project-integration.test.ts`, `hooks.test.ts`, `contract-and-flow-safety.test.ts`
- `evals/**`
- `docs/{artifact-reference,flow-reference,command-reference,configuration-reference,system-architecture,code-standards,development-roadmap,project-changelog}.md`
- `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`
- `.github/workflows/**`, `scripts/package-check.mjs`, `scripts/validate-plugin-manifests.mjs`

Create:

- `tests/fixtures/complete-saas/**`
- `tests/content-contracts.test.ts`, `tests/dual-host-packaging.test.ts`, `tests/coverage-projections.test.ts`
- runnable eval manifest/harness and captured artifact assertions
- `docs/end-to-end-timeline.md`
- `docs/pattern-to-instance.md`
- `docs/codex-installation.md` if host install differs materially

## Implementation Steps

1. Replace generic one-sentence fixture bodies with valid pattern-derived artifacts containing real local IDs, mappings, cases and failures.
2. Simulate raw approval-workflow SaaS idea → public-source fixture ingestion → Genesis foundations/EVR/BL, without claiming live research in deterministic tests.
3. Add first feature with FTR/UC/FLOW/SCR/API/ENT and UT/IT/ST; inspect section-level trace output.
4. Add a second feature sharing entity/API; assert prior feature impact and regression selection.
5. Test tone-only edit, pricing reassessment, accepted ADR supersession, integration failure reconciliation and retirement/deprecation history.
6. Add negative tests for placeholders, empty tables, broken local IDs, missing handoff, incomplete active artifact and fake results.
7. Expand evals for Genesis evidence grounding, behavior formation, conditional design selection, test derivation, reconciliation authority, anti-procedure behavior and Codex/Claude wrapper parity.
8. Forward-test the five skills using fresh agents that receive only the installed plugin and scenario input; grade files and tool traces against explicit rubrics.
9. Rewrite documentation around the actual time axis, pattern→instance relation and one complete flow, avoiding marketing claims not proven by tests.
10. Run full typecheck/lint/build/tests/package checks, Claude strict validation, Codex skill/plugin validation and package scans on the CI matrix.

## Scenario Acceptance Matrix

| Scenario | Required proof |
|---|---|
| Genesis | Real tool trace in model eval; attributable `EVD-*`; complete discovery/product foundations; no feature/test artifacts; `EVR-001`, `BL-000`. |
| First feature | AC→UC/FLOW→conditional design→UT/IT/ST trace; implementation mapping or honest unconfigured state; successor baseline. |
| Editorial edit | No CHG, impact review, test run or baseline invalidation. |
| Shared change | Old feature and its regression tests appear with reasons. |
| Reassessment | Evidence/synthesis only; issue if assumption fails; no silent product mutation. |
| Reconciliation | Concrete authority decision, minimal closure, failed then successful execution history, resolved issue. |
| ADR successor | Old accepted body unchanged; successor/impact graph correct. |
| Retirement | IDs reserved; dependents deprecated/retired; files retained. |
| Fake result | Direct write and missing EXEC binding fail. |
| Dual host | Same scenario loads same playbook/pattern version and produces equivalent canonical artifacts. |

## Todo List

- [x] Realistic deterministic fixture.
- [x] Runnable semantic eval suite.
- [x] Fresh-context forward tests.
- [x] End-to-end temporal documentation.
- [x] Claude and Codex package validation in CI.
- [x] Final roadmap/changelog synchronized with evidence.

## Success Criteria

- All deterministic checks pass with no fake evidence, mock pass/fail shortcuts or ignored failures.
- A reviewer can open the complete fixture and implement behavior without inventing a missing product decision covered by scope.
- Semantic evals fail shallow generic documents and pass only outputs meeting the artifact quality contract.
- Both hosts use identical domain resources and engine bundle.
- Public docs contain no command, path, hook guarantee or flow behavior absent from tested implementation.

## Risk Assessment

- Risk: fixture overfits one CRUD product. Mitigation: include one shared async/job or AI-conditional branch in evals, not mandatory in the base fixture.
- Risk: model evals are nondeterministic. Mitigation: separate deterministic contract assertions from semantic graders and retain inspected artifacts/traces.
- Risk: CI claims Codex parity without installed execution. Mitigation: require manifest/skill validation plus at least one packaged-host smoke test where the CLI is available; document unavailable matrix cells honestly.

## Security Considerations

Fixtures use synthetic labeled data and local commands only. No public network, payments, outreach, secrets or external writes occur in automatic tests. Package scans reject secrets and out-of-root references.

## Next Steps

After all criteria pass, update version/changelog as one release candidate. Do not commit, push or publish unless separately requested.
