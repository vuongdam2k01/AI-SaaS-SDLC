# Phase 4 — Migration, tests and documentation

Status: draft

## Outcome

Existing repositories move onto the new contracts deliberately, are told what changed, and are never silently edited. The reference repository proves the patch on the defect that produced it.

## Catalog generation

Phases 1–3 change three contract layers, so `resources/artifact-patterns/catalog.yaml` moves from generation 5 to 6:

| Layer | Change |
|---|---|
| Foundations | `ux_rules` gains the `Design tokens` heading, table and namespace; `question_ledger` gains the `Blocked on` column |
| Scalable patterns | `screen.pattern.md` and `shared-component.pattern.md` state token consumption |
| System documents | `validation-rules.md` gains five findings |

`patterns migrate` already handles all three layers and reports them separately. Its own behavior needs no change; `pattern-migration.ts` documents that migration re-pins system-document contracts without carrying the documents, so `SYSTEM_DOCUMENT_INCOMPLETE` after migrating is expected and explained.

## Findings added

| Finding | Phase | Blocks baseline |
|---|---|---|
| `DESIGN_TOKENS_UNCOMMITTED` | 1 | no |
| `COMMITMENT_DEFERRED_UNOWNED` | 2 | no |
| `QUESTION_AWAITING_OWNER` | 2 | no |
| `CONFIG_REQUIREMENT_UNSUPPLIED` | 3 | no |
| `CONFIG_KEY_UNDECLARED` | 3 | no |

All five are standing warnings. None blocks a baseline, so no existing repository loses the ability to close a flow by upgrading — consistent with how the six warnings added in generation 5 behaved.

## Documentation

`docs/command-reference.md` (`config requirements`, five new findings), `docs/artifact-reference.md` (generation 6 namespaces), `docs/pattern-to-instance.md` (migration path), `docs/inspect-and-check-results.md` (warning table and the new projection), `docs/flow-reference.md` (owner-blocked reporting at flow close), `docs/development-roadmap.md` and `docs/project-changelog.md`.

## Tests

- Contract tests for the two changed foundations and the two changed patterns.
- Migration test: generation 5 repository → 6, asserting the reported delta and that no instance was edited.
- Finding tests per finding, including the negative cases — a pre-screen repository with empty tokens, a ledger holding only `post-launch` questions, a repository with no external boundary.
- Secret-safety test: no configuration value reaches a projection, document or log under any input.
- An eval that runs a small product through genesis and one evolution and asserts it cannot reach a live screen with neither tokens nor a question naming the owner.

## Proving it on the reference repository

`sayitalive` is the repository whose failure produced this plan, and is the acceptance case:

1. `patterns migrate --check` — read the three-layer delta.
2. `patterns migrate`, then `refresh` and `validate --all`.
3. Expect: `DESIGN_TOKENS_UNCOMMITTED` covering four screens; `QUESTION_AWAITING_OWNER` for `QST-004`; `CONFIG_REQUIREMENT_UNSUPPLIED` for the `INT-CREATION-001` boundary; `CONFIG_KEY_UNDECLARED` for five keys.
4. Repair through ordinary flows, each routed by what the repair needs — Product Evolution for the visual commitment and for provider selection, Reconciliation for `CREATION_GATE_OPEN`, which is code reading a product decision no artifact declares.

Accepted decision records and the original idea stay exempt from tightened contracts, so the five existing ADRs are untouched.

## Release checks

Typecheck, lint, tests, build, package checks, strict Claude validation, Codex plugin and skill validation.

## Completion

Complete when the reference repository, after migration and repair, holds committed design tokens its four screens cite, a provider question closed by a decision or classified as owner-blocked, a configuration surface whose every key is declared, and a ledger that separates what waits on the owner from what waits on the world.
