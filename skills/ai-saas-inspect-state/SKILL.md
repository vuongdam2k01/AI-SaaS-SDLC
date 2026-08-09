---
name: ai-saas-inspect-state
description: Inspect the current baseline, dependency graph, impact, stale artifacts, unresolved control items and UT/IT/ST state without changing files. Use only when the user explicitly invokes this skill for status or trace questions.
---
# Inspect State

Treat the user's invocation text after `$ai-saas-inspect-state` as optional scope. Read and execute [the shared Inspect State playbook](../../resources/flow-playbooks/inspect-state.md) completely.

Resolve `PLUGIN_ROOT` as two parent directories above this installed `SKILL.md`; invoke the engine as `node "<PLUGIN_ROOT>/bin/ai-saas-sdlc"`. Use read/search tools and only the playbook's read-only engine commands.

Do not refresh, migrate, verify, start/close a flow, create an issue or edit a file.
