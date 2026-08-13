---
name: ai-saas-inspect-state
description: Inspect the current baseline, dependency graph, impact, stale artifacts, unresolved control items and UT/IT/ST state without changing files. Use only when the user explicitly invokes this skill for status or trace questions.
---
# Inspect State

Treat the user's invocation text after `$ai-saas-inspect-state` as optional scope. Read and execute [the shared Inspect State playbook](../../../resources/flow-playbooks/inspect-state.md) completely.

Run this session at the root of the dedicated documentation repository — never inside an application codebase. Resolve `PLUGIN_ROOT` as three parent directories above this installed `SKILL.md`; invoke the engine as `node "<PLUGIN_ROOT>/bin/ai-saas-sdlc"`. Use read/search tools and only the playbook's read-only engine commands. When the user asks for a browsable site, `docs build` is additionally permitted; it writes only the engine cache under `.ai-saas-sdlc/cache/site/`.

Do not refresh, migrate, verify, start/close a flow, create an issue or edit a content file.
