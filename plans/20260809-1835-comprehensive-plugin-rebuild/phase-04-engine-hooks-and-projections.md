# Phase 4 — Engine, Hooks and Projections

## Context Links

- [Current audit: engine and hook defects](research/current-repository-audit.md)
- [Artifact quality contract](research/artifact-inventory-and-quality-contract.md)

## Overview

Priority: high  
Status: complete  
Extend the deterministic control plane so shallow placeholder artifacts cannot form a baseline, while hooks remain minimal and non-semantic.

## Key Insights

The engine already protects identity, graph, lifecycle and execution provenance. The missing layer is machine-checkable artifact content. The engine must not attempt to judge prose quality; it can validate required sections, IDs, tables, allowed values and trace joins.

## Requirements

- Content contracts are data-driven from the pattern catalog, not hard-coded across validators.
- `draft` may be incomplete; `active` must satisfy the type-specific structural completion predicate.
- Section-level IDs form trace edges without duplicating artifact-level dependencies.
- Coverage projections prove evidence→claim and AC→behavior/design/test chains.
- Hook denial remains limited to protected paths/history/real implementation boundary.
- Stop blocks once only for deterministic hard failures; no tone/prose/review gate.
- All mutating engine commands remain locked and path-safe.

## Related Code Files

Modify:

- `src/core/artifact-contracts.ts`, `artifacts.ts`, `frontmatter.ts`, `validation.ts`
- `src/core/baseline-flow-rules.ts`, `baseline.ts`, `graph.ts`, `impact.ts`
- `src/core/test-selection.ts`, `projections.ts`, `verification.ts`, `result-artifact.ts`
- `src/core/types.ts`, `record-validation.ts`, `internal-validation.ts`
- `src/hooks/{session-start,pre-tool-use,stop}.ts`, `hooks/hooks.json`
- `schemas/*.json`, `src/cli/main.ts`

Create:

- `src/core/content-contracts.ts`
- `src/core/section-identifiers.ts`
- `src/core/coverage-derivation.ts`
- focused modules if any file exceeds the repository’s 200-line guidance
- schema fixtures for every artifact type and host hook input

## Implementation Steps

1. Parse headings, required tables and stable local IDs using the catalog; reject unresolved placeholders and empty mandatory rows only when activating/baselining.
2. Enforce local ID uniqueness and correct namespaces: `AC`, UC path IDs, screen element/event/validation/transition IDs, `INV`, test case IDs, question IDs and errors.
3. Validate cross-layer references: UC paths cover FTR/AC, design references behavior, UT/IT/ST cases cite targets, test handoffs resolve, API operations/error codes/entities exist.
4. Expand impact closure with section-level changes to shared entity/API/invariant/access/decision contracts while retaining previous-baseline edges for removals.
5. Make test selection return exact reasons and missing coverage, not only arrays by level.
6. Generate research question/claim/evidence coverage, AC trace matrix, path/case coverage, shared-write conflict status and implementation/test gaps.
7. Generate RESULT body entirely from EXEC plus selected test/spec mappings; include failure/issue and cleanup fields when available.
8. Update SessionStart to give compact state plus next valid action. Keep PreToolUse narrow and portable. Keep Stop structural and one-shot.
9. Add Codex/Claude hook fixtures; if a host cannot support a protection, document it and rely on engine validation instead of pretending parity.
10. Keep migration deterministic for the v1 prototype layout and pattern version.

## Todo List

- [x] Active-content contracts enforced for every type.
- [x] Local IDs and section references parsed and validated.
- [x] Section-level coverage projections reproducible.
- [x] Test selection explains coverage and regression reasons.
- [x] Hooks work or degrade honestly on both hosts.
- [x] Existing safety/lifecycle/provenance guarantees remain intact.

## Success Criteria

- The current one-sentence temporal fixture can no longer create a valid active baseline.
- Removing an AC’s only test or a UT→IT handoff target yields a deterministic finding with file/ID context.
- Changing a shared entity/API/invariant selects old and new feature regressions.
- An editorial body-only diff bypasses semantic impact after explicit editorial refresh.
- A fabricated RESULT remains impossible through direct tools, shell indirection or engine APIs.
- Generated projections are reproducible byte-for-byte.

## Risk Assessment

- Risk: validators become a bespoke Markdown parser. Mitigation: validate explicit headings/tables/IDs only; avoid prose semantics.
- Risk: stricter contracts break migration. Mitigation: version pattern/content schemas and provide check/apply migration fixtures.
- Risk: hook heuristics overblock normal work. Mitigation: engine-first enforcement and cross-host negative fixtures.

## Security Considerations

Preserve symlink/junction containment, atomic writes, project locks, exact command/cwd binding, immutable accepted ADR/raw input/terminal artifacts and output digests. Never execute commands inferred from document content.

## Next Steps

Phase 5 proves the rebuilt method by running realistic timelines and validating packages.
