---
name: inspect-state
description: Inspect the current baseline, dependency graph, impact, stale artifacts, unresolved control items and UT/IT/ST state without changing files. Invoke manually for status or trace questions.
argument-hint: [artifact, change, or scope]
disable-model-invocation: true
---
# Inspect State

Treat `$ARGUMENTS` as optional scope. Read and execute [the shared Inspect State playbook](../../../resources/flow-playbooks/inspect-state.md) completely.

Set `ENGINE` to `node "${CLAUDE_PLUGIN_ROOT}/bin/ai-saas-sdlc"`. Use only read/search operations and the playbook's read-only engine commands.

Do not refresh, migrate, verify, start/close a flow, create an issue or edit any file.
