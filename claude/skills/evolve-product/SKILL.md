---
name: evolve-product
description: Add, change, consolidate, break, deprecate or retire product behavior through one impact-aware flow with conditional design and UT/IT/ST. Invoke manually for semantic product evolution.
argument-hint: [--until behavior|design|tests|implementation|baseline] <semantic product intent>
disable-model-invocation: true
---
# Product Evolution

Treat `$ARGUMENTS` as the semantic intent. Read and execute [the shared Product Evolution playbook](../../../resources/flow-playbooks/product-evolution.md) completely before acting.

`$ARGUMENTS` may name where this turn stops, as `--until <stage>` or in plain words such as "stop after the design". Honour it: reach that checkpoint, record it, report progress and the next command, and leave the flow open. Without one, run to a successor baseline. Announce each checkpoint as you reach it rather than working silently.

This session must run at the root of the dedicated documentation repository — never inside an application codebase. Set `ENGINE` to `node "${CLAUDE_PLUGIN_ROOT}/bin/ai-saas-sdlc"`. Use Claude Code file/search tools to inspect documentation and only configured implementation roots; use the terminal only for documented engine operations and exact configured verification commands.

Do not create unconditional artifacts, extra lifecycle flows, prose-review gates or automatic research. A wording-only edit bypasses this skill.
