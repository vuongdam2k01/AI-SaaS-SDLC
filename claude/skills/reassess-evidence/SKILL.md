---
name: reassess-evidence
description: Reassess one market or product-evidence question against current public sources without silently changing product behavior. Invoke manually for a new signal, contradiction or stale claim.
argument-hint: <decision question or public signal>
disable-model-invocation: true
---
# Evidence Reassessment

Treat `$ARGUMENTS` as the concrete question/signal. Read and execute [the shared Evidence Reassessment playbook](../../../resources/flow-playbooks/evidence-reassessment.md) completely before acting.

Host mapping:

- set `ENGINE` to `node "${CLAUDE_PLUGIN_ROOT}/bin/ai-saas-sdlc"`;
- use Claude Code `WebSearch` and `WebFetch` for real source discovery/inspection;
- use file tools for evidence/discovery/issue artifacts and the terminal only for playbook engine commands.

If real web tools are unavailable, stop honestly. Never mutate product/design/test artifacts or chain into Evolution automatically.
