# Comprehensive AI SaaS SDLC Plugin Rebuild

Status: complete

## Outcome

Rebuild the repository from a structurally correct but content-thin prototype into a usable dual-host Claude Code and Codex plugin. Preserve the four temporal flows, UT/IT/ST model, immutable evidence and ADR history, and deterministic impact engine. Replace shallow artifacts, vague protocols, non-representative tests and host-specific assumptions.

## Decisions

- Keep patterns separate from live artifacts because one is a reusable class and the other is a project instance; rename and document the boundary so it is no longer mistaken for duplicate verification content.
- Use one domain source of truth in `resources/`; Claude and Codex receive thin host adapters only.
- Increase artifact depth, not workflow ceremony. No stage gates, automatic review loops, user interviews, custom research agents or fake evidence.
- Validate structural completeness deterministically; evaluate semantic usefulness with realistic forward simulations.

## Phases

1. [Repository contract and dual-host packaging](phase-01-repository-contract-and-dual-host-packaging.md) — complete
2. [Artifact patterns and seeded foundations](phase-02-artifact-patterns-and-foundations.md) — complete
3. [Flows, skills and research/formation protocols](phase-03-flows-skills-and-protocols.md) — complete
4. [Engine, hook and projection enforcement](phase-04-engine-hooks-and-projections.md) — complete
5. [Realistic tests, evals, documentation and release validation](phase-05-tests-evals-docs-and-release.md) — complete

## Research

- [Current repository audit](research/current-repository-audit.md)
- [Case-study findings](research/case-study-findings.md)
- [Artifact inventory and quality contract](research/artifact-inventory-and-quality-contract.md)

## Dependencies

Phase 1 fixes ownership and paths before artifact contracts change. Phase 2 defines the contracts consumed by Phase 3. Phase 4 enforces only contracts already defined in Phases 2–3. Phase 5 validates the final integrated behavior.

## Completion

Complete only when a multi-feature SaaS simulation produces evidence-grounded discovery, implementation-ready behavior/design documents, derived UT/IT/ST, impact-aware evolution/reconciliation and reproducible results on both plugin hosts without a procedural gate loop.
