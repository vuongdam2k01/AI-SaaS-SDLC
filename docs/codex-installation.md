# Dual-Host Installation and Use

AI SaaS SDLC ships one domain implementation with separate thin host adapters. Both hosts require Node.js 22 or newer and Git. Use the plugin from a separate centralized documentation repository, not from the implementation source it may describe.

## Claude Code

Load a development checkout directly:

```bash
claude --plugin-dir /path/to/AI-SaaS-SDLC
```

Or install the repository's Claude marketplace entry:

```text
/plugin marketplace add vuongdam2k01/AI-SaaS-SDLC
/plugin install ai-saas-sdlc@ai-saas-sdlc
```

Invoke one of the five manual skills:

```text
/ai-saas-sdlc:genesis <raw idea>
/ai-saas-sdlc:reassess-evidence <question or signal>
/ai-saas-sdlc:evolve-product <semantic intent>
/ai-saas-sdlc:reconcile <failure or mismatch>
/ai-saas-sdlc:inspect-state [scope]
```

Claude adapters live under `claude/skills/` and resolve the executable through `${CLAUDE_PLUGIN_ROOT}`.

## Codex

The repository is a skills-only Codex plugin with `.codex-plugin/plugin.json`, five skills under `codex/skills/` and presentation metadata under each skill's `agents/openai.yaml`.

For a development checkout, add this repository as a local marketplace source using the Codex plugin management available in your environment, refresh Codex, and install `ai-saas-sdlc` from that local source. This repository does not publish or modify a user's personal marketplace as part of its build. OpenAI's current local-plugin workflow is described in [Build plugins](https://developers.openai.com/codex/build-plugins).

Invoke the installed Codex skills explicitly:

```text
$ai-saas-genesis <raw idea>
$ai-saas-reassess-evidence <question or signal>
$ai-saas-evolve-product <semantic intent>
$ai-saas-reconcile <failure or mismatch>
$ai-saas-inspect-state [scope]
```

Each Codex adapter resolves the plugin root from its installed `SKILL.md`, then runs `<plugin-root>/bin/ai-saas-sdlc`. It does not depend on a development checkout path or `CODEX_PLUGIN_ROOT` at runtime.

## Shared behavior and host boundary

| Concern | Claude Code | Codex | Shared authority |
|---|---|---|---|
| User interface | Five manual slash-command skills | Five explicit `$` skills | Same five flow playbooks |
| Research tools | `WebSearch`/`WebFetch` mapping | Available Internet search and page-open/fetch mapping | Public-web research protocol and attributable evidence |
| Domain resources | Thin adapter reads `resources/` | Thin adapter reads `resources/` | Same playbooks, protocols and pattern catalog |
| Deterministic operations | Bundled engine | Bundled engine | Same state, validation, impact, verification and baseline code |
| Hook integration | Discovers the shared SessionStart, PreToolUse and Stop hooks | Discovers the same conventional `hooks/hooks.json`; user reviews/trusts it in `/hooks` | Same handler code; engine validation/baselining remains authoritative |

The shared hooks improve context and prevent common direct edits on both hosts. Codex discovers plugin hooks and requires the user to review and trust their current definition; see the [official OpenAI Hooks documentation](https://learn.chatgpt.com/docs/hooks). Hooks can be disabled or restricted by host policy, so they are not the cross-host security boundary. Managed-path containment, pinned-pattern integrity, immutable history, active-content contracts, execution provenance, generated drift and baseline rules are enforced by the engine.

## Package validation

`npm run check` validates and tests the engine, both manifest shapes, all ten host adapters, Codex skill/UI metadata, in-root references and installed-package root resolution. Run `npm run validate:manifests` separately with the Claude CLI installed to stage the package and apply strict Claude validation to both the plugin and marketplace manifests.
