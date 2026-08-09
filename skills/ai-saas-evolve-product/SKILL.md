---
name: ai-saas-evolve-product
description: Add, change, consolidate, break, deprecate or retire product behavior through one impact-aware flow with conditional design and UT/IT/ST. Use only when the user explicitly invokes this skill with semantic product intent.
---
# Product Evolution

Treat the user's invocation text after `$ai-saas-evolve-product` as the semantic intent. Read and execute [the shared Product Evolution playbook](../../resources/flow-playbooks/product-evolution.md) completely before acting.

Resolve `PLUGIN_ROOT` as two parent directories above this installed `SKILL.md`; invoke the engine as `node "<PLUGIN_ROOT>/bin/ai-saas-sdlc"`. Use Codex file/search tools for documentation and only configured implementation roots. Execute only playbook engine operations and exact configured verification commands.

Do not allocate unconditional artifacts, invent extra lifecycle flows or run prose-review gates. Wording-only edits bypass this skill.
