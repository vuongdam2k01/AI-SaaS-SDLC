---
name: ai-saas-genesis
description: Create the first AI SaaS SDLC discovery and product-foundation baseline from a raw idea using real public-web research. Use only when the user explicitly invokes this skill for a new unbaselined documentation repository.
---
# Genesis

Treat the user's invocation text after `$ai-saas-genesis` as the raw idea. Read and execute [the shared Genesis playbook](../../resources/flow-playbooks/genesis.md) completely before acting.

Resolve `PLUGIN_ROOT` as two parent directories above this installed `SKILL.md`; invoke the engine as `node "<PLUGIN_ROOT>/bin/ai-saas-sdlc"`. Map playbook research to Codex's actual Internet search and page-open/fetch tools, and inspect every cited page. If those tools are unavailable, stop without claiming research.

Do not spawn a research agent, conduct interviews/outreach, add gates or start Evolution automatically.
