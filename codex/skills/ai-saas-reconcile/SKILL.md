---
name: ai-saas-reconcile
description: Repair a concrete documentation, interface, implementation or test mismatch using the authoritative side and minimal affected closure. Use only when the user explicitly invokes this skill with a real failure, drift or contradiction.
---
# Reconciliation

Treat the user's invocation text after `$ai-saas-reconcile` as the concrete observation. Read and execute [the shared Reconciliation playbook](../../../resources/flow-playbooks/reconciliation.md) completely before acting.

Resolve `PLUGIN_ROOT` as three parent directories above this installed `SKILL.md`; invoke the engine as `node "<PLUGIN_ROOT>/bin/ai-saas-sdlc"`. Inspect cited files, Git diffs/results and only configured implementation roots. Execute only configured verification through the engine.

Reject vague self-review. Do not change evidence, smuggle in Evolution or edit unrelated artifacts.
