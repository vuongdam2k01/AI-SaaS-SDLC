# Phase 1 — Repository Contract and Dual-Host Packaging

## Context Links

- [Current audit](research/current-repository-audit.md)
- [Case-study findings](research/case-study-findings.md)
- [Artifact contract](research/artifact-inventory-and-quality-contract.md)

## Overview

Priority: critical  
Status: complete  
Establish explicit ownership boundaries and make one repository installable by Claude Code and Codex without duplicating the domain method.

## Key Insights

The live-project skeleton and pattern catalog are different abstractions, not duplicate verification layers. Their current nesting makes that distinction invisible. Codex and Claude skill frontmatter also differs: Claude needs manual invocation metadata; Codex skills should expose only `name` and `description`. Shared domain instructions therefore belong outside host wrappers.

## Requirements

- Canonical patterns live at `resources/artifact-patterns/`, outside the copied project skeleton.
- `init` copies the project skeleton and pins the pattern catalog to `00-system/patterns/` with version/source metadata.
- `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` describe the same product/version.
- Claude retains five explicitly user-invoked flow skills.
- Codex receives five thin skills with Codex-valid frontmatter and UI metadata; their bodies route to shared playbooks.
- No custom agents, apps or MCP servers.
- Codex hook discovery is tested rather than assumed; host adapters may differ, policy and engine code may not.

## Architecture

```text
resources/
├── flow-playbooks/          shared generative method
├── protocols/               shared decision/research/formation rules
├── artifact-patterns/       one canonical pattern per scalable artifact
└── project-template/        live repository skeleton only

skills/                      Claude wrappers
codex/skills/                Codex wrappers + agents/openai.yaml
.claude-plugin/              Claude manifest/marketplace
.codex-plugin/               Codex manifest
src/ + bin/                  shared deterministic engine
hooks/                       shared policy with host-neutral launch adapter
```

## Related Code Files

Modify:

- `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`
- `skills/*/SKILL.md`
- `src/core/template.ts`, `src/cli/main.ts`, `src/core/paths.ts`
- `scripts/build.mjs`, `scripts/package-check.mjs`, `scripts/validate-plugin-manifests.mjs`
- `hooks/hooks.json`, `package.json`, `README.md`, `CLAUDE.md`, `AGENTS.md`

Create:

- `.codex-plugin/plugin.json`
- `codex/skills/{genesis,reassess-evidence,evolve-product,reconcile,inspect-state}/SKILL.md`
- `codex/skills/*/agents/openai.yaml`
- `resources/artifact-patterns/catalog.yaml`
- `resources/project-template/00-system/patterns/README.md` generated/copied by init
- a host-neutral hook/CLI launcher under `scripts/` or `bin/`
- Codex manifest and installed-plugin fixture tests

Move/delete after references are updated:

- Move `resources/project-template/00-system/templates/**` to `resources/artifact-patterns/**`.
- Remove the old `00-system/templates` path; do not retain aliases that recreate ambiguity.

## Implementation Steps

1. Define a pattern catalog containing pattern ID, artifact type, source path, target instance glob, version and owning flow.
2. Move canonical pattern files outside `project-template` and update package scanning.
3. Extend initialization to copy a pinned pattern snapshot into consuming `00-system/patterns/` and record catalog version/hash.
4. Create Codex manifest with `skills: ./codex/skills/`, valid interface metadata and no unsupported `hooks`, `apps` or `mcpServers` fields.
5. Split current skills into thin host wrappers; move all domain instructions into shared playbooks in Phase 3.
6. Add `agents/openai.yaml` for Codex skill presentation.
7. Make hook/engine launch root resolution work in packaged Claude and Codex installations on Windows and Linux; test real injected variables.
8. Validate both archives contain only in-root files and identical shared resources/engine hashes.

## Todo List

- [x] Remove source/instance naming ambiguity.
- [x] Add strict Codex manifest.
- [x] Add five Codex skill wrappers and UI metadata.
- [x] Prove host-neutral launch behavior.
- [x] Prove shared domain files are not duplicated.

## Success Criteria

- A clean `init` yields `00-system/patterns/` and `04-verification/` with an explicit catalog mapping; no `00-system/templates/` remains.
- Claude and Codex validators accept their manifests and skills.
- Both hosts run the same engine and load the same flow playbooks/patterns.
- A package scan finds no path outside the plugin root and no duplicated flow/template body maintained in host adapters.

## Risk Assessment

- Risk: shared skill syntax accepted by one host but rejected by the other. Mitigation: separate thin wrappers, shared references.
- Risk: Codex hooks expose a different root variable/tool matcher. Mitigation: installed-plugin fixtures and host-neutral launcher; engine remains authoritative when hooks are unavailable.
- Risk: moving patterns breaks init/package references. Mitigation: catalog-driven paths and migration/check tests.

## Security Considerations

Keep path containment, symlink checks and package-root scanning. Do not write to personal Codex marketplace or caches as part of repository build. Repository-local manifests only.

## Next Steps

Phase 2 replaces every pattern and seeded foundation against the new catalog.
