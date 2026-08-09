# Planner Report — Comprehensive Plugin Rebuild

## Decision

Rebuild content contracts and dual-host adapters; preserve the current deterministic lifecycle engine where it is already correct.

## Main findings

- Current `00-system/templates/verification` and `04-verification` are pattern vs instance, but their placement/naming is misleading. Move canonical sources to `resources/artifact-patterns`; pin copies to consuming `00-system/patterns`.
- Current 23 templates total 709 lines and do not approach the field/trace/test depth demonstrated by AI-SDLC/fqe-docs.
- Current skills/protocols total 187 lines and do not define the transformations required to execute full flows.
- Current temporal tests accept one-sentence artifact bodies; current evals total 30 lines and do not inspect produced files.
- SaaS-idea-brainstorm contains useful evidence discipline but its 32 skills, 10 gates, custom agents and repeated rules are the anti-pattern to avoid.
- Codex must use thin Codex-valid skill wrappers plus `.codex-plugin/plugin.json`; all domain truth stays shared under `resources/`.

## Task order

1. Fix pattern ownership/path and dual manifests/adapters.
2. Rebuild every pattern and foundation document.
3. Define complete input-driven shared flow playbooks.
4. Enforce deterministic content/trace contracts and cross-host hooks.
5. Validate with realistic timeline fixtures, semantic evals and both plugin packages.

Plan: `plans/20260809-1835-comprehensive-plugin-rebuild/plan.md`.

## Unresolved questions

None.

