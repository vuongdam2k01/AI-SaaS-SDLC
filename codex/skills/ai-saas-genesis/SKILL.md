---
name: ai-saas-genesis
description: Create the first AI SaaS SDLC discovery and product-foundation baseline from a raw idea using real public-web research. Use only when the user explicitly invokes this skill for a new unbaselined documentation repository.
---
# Genesis

Treat the user's invocation text after `$ai-saas-genesis` as the raw idea. Read and execute [the shared Genesis playbook](../../../resources/flow-playbooks/genesis.md) completely before acting.

Resolve `PLUGIN_ROOT` as three parent directories above this installed `SKILL.md`; invoke the engine as `node "<PLUGIN_ROOT>/bin/ai-saas-sdlc"`. Run `ENGINE research probe --json` when the flow opens; at rung 1 or above use the `ENGINE research` commands to the depth the playbook's protocol requires and cite each engine-retrieved page's `RET-*` record in its evidence entry. At rung 0, map playbook research to Codex's actual Internet search and page-open/fetch tools and inspect every cited page; if those tools are unavailable, stop without claiming research.

Do not spawn a research agent, conduct interviews/outreach, add gates or start Evolution automatically.
