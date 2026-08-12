# Plugin Development Context

This file applies only while developing this repository. It is not a product artifact and is not copied into initialized documentation repositories.

- Preserve the four mutation flows and one read-only inspector. Engine commands are operations inside those flows, never additional lifecycle stages. The inspector's one sanctioned write is `docs build`, which renders a read-only site into the engine cache and touches no content layer.
- Keep `claude/skills` and `codex/skills` as thin Claude/Codex host adapters. Shared method belongs in `resources/flow-playbooks` and `resources/protocols`.
- Keep one canonical scalable pattern per artifact type in `resources/artifact-patterns`. The initialized `00-system/patterns` directory is a pinned snapshot; live instances belong only in layers `01` through `05`.
- Increase information depth without adding gates. No custom research agents, MCP requirements, monitors, interviews, outreach, presales, deployment or runtime operations.
- Never treat model self-review as evidence. A repeated flow requires a new source, decision, inspected diff, execution result or concrete contradiction.
- Deterministic validation may enforce shape, IDs, references, lifecycle and provenance; it must not enforce tone or prose preference.
- Do not edit generated build bundles manually.
- Run typecheck, lint, tests, build, package checks, strict Claude validation and Codex plugin/skill validation after changes.
- Use English for all repository and generated content.
