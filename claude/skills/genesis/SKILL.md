---
name: genesis
description: Create the first AI SaaS SDLC discovery and product-foundation baseline from a raw idea using attributable public-web evidence. Invoke manually for a new unbaselined documentation repository.
argument-hint: <raw SaaS idea>
disable-model-invocation: true
---
# Genesis

Treat `$ARGUMENTS` as the raw idea. Read and execute [the shared Genesis playbook](../../../resources/flow-playbooks/genesis.md) completely before acting.

Host mapping:

- set `ENGINE` to `node "${CLAUDE_PLUGIN_ROOT}/bin/ai-saas-sdlc"`;
- use Claude Code `WebSearch` for discovery and `WebFetch` to inspect every cited page;
- use normal read/write/edit tools for canonical artifacts and the terminal only for documented engine commands.

If `WebSearch` or `WebFetch` is unavailable, stop without claiming research. Do not spawn research agents, interview users, add gates or automatically start Product Evolution.
