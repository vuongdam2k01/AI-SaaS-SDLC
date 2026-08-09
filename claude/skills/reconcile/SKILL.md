---
name: reconcile
description: Repair a concrete documentation, interface, implementation or test mismatch using the authoritative side and minimal affected closure. Invoke manually for a real failure, drift or contradiction.
argument-hint: <failure, drift, mismatch, or contradiction>
disable-model-invocation: true
---
# Reconciliation

Treat `$ARGUMENTS` as the concrete observation. Read and execute [the shared Reconciliation playbook](../../../resources/flow-playbooks/reconciliation.md) completely before acting.

Set `ENGINE` to `node "${CLAUDE_PLUGIN_ROOT}/bin/ai-saas-sdlc"`. Use Claude Code file/Git tools to inspect the cited mismatch and only configured implementation roots; execute only engine-declared verification commands.

Reject vague self-review. Do not change evidence, smuggle in Product Evolution, touch unrelated artifacts or create a prose gate.
