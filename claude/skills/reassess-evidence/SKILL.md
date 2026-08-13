---
name: reassess-evidence
description: Reassess one market or product-evidence question against current public sources without silently changing product behavior. Invoke manually for a new signal, contradiction or stale claim.
argument-hint: <decision question or public signal>
disable-model-invocation: true
---
# Evidence Reassessment

Treat `$ARGUMENTS` as the concrete question/signal. Read and execute [the shared Evidence Reassessment playbook](../../../resources/flow-playbooks/evidence-reassessment.md) completely before acting.

Host mapping:

- run this session at the root of the dedicated documentation repository — never inside an application codebase;
- set `ENGINE` to `node "${CLAUDE_PLUGIN_ROOT}/bin/ai-saas-sdlc"`;
- run `ENGINE research probe --json` when the flow opens; at rung 1 or above use the `ENGINE research` commands to the depth the playbook's protocol requires (`research diff` answers "has this page changed?"), and cite each engine-retrieved page's `RET-*` record in its evidence entry;
- at rung 0, use Claude Code `WebSearch` and `WebFetch` for real source discovery/inspection, exactly as before;
- use file tools for evidence/discovery/issue artifacts and the terminal only for playbook engine commands.

If rung 0 applies and real web tools are unavailable, stop honestly. Never mutate product/design/test artifacts or chain into Evolution automatically.
