---
name: genesis
description: Create the first AI SaaS SDLC discovery and product-foundation baseline from a raw idea using attributable public-web evidence. Invoke manually for a new unbaselined documentation repository.
argument-hint: <raw SaaS idea>
disable-model-invocation: true
---
# Genesis

Treat `$ARGUMENTS` as the raw idea. Read and execute [the shared Genesis playbook](../../../resources/flow-playbooks/genesis.md) completely before acting.

Host mapping:

- run this session at the root of the dedicated documentation repository (an empty or docs-only directory) — never inside an application codebase;
- set `ENGINE` to `node "${CLAUDE_PLUGIN_ROOT}/bin/ai-saas-sdlc"`;
- run `ENGINE research probe --json` when the flow opens; at rung 1 or above use the `ENGINE research` commands to the depth the playbook's protocol requires, and cite each engine-retrieved page's `RET-*` record in its evidence entry;
- at rung 0, use Claude Code `WebSearch` for discovery and `WebFetch` to inspect every cited page, exactly as before;
- use normal read/write/edit tools for canonical artifacts and the terminal only for documented engine commands.

If rung 0 applies and `WebSearch` or `WebFetch` is unavailable, stop without claiming research. Do not spawn research agents, interview users, add gates or automatically start Product Evolution.
