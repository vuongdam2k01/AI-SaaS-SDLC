---
name: ai-saas-reassess-evidence
description: Reassess one current market or product-evidence question using real public sources without silently changing product behavior. Use only when the user explicitly invokes this skill with a new signal, contradiction or stale claim.
---
# Evidence Reassessment

Treat the user's invocation text after `$ai-saas-reassess-evidence` as the concrete question/signal. Read and execute [the shared Evidence Reassessment playbook](../../../resources/flow-playbooks/evidence-reassessment.md) completely before acting.

Resolve `PLUGIN_ROOT` as three parent directories above this installed `SKILL.md`; invoke the engine as `node "<PLUGIN_ROOT>/bin/ai-saas-sdlc"`. Use Codex's actual Internet search and page-open/fetch tools and inspect every cited source. Stop honestly if they are unavailable.

Never mutate product/design/test artifacts or chain into Product Evolution automatically.
