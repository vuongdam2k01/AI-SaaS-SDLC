---
name: ai-saas-implement
description: Bring code into conformance with already-specified behavior, one feature and one segment at a time, through an implementation-intent Product Evolution with mapped paths and executed verification. Use only when the user explicitly invokes this skill with a feature ID.
---
# Implementation

Treat the user's invocation text after `$ai-saas-implement` as one feature ID plus an optional segment (`code`, comma-joined `ut,it,st`, or `all`; absent means `all`). Read and execute [the shared Implementation playbook](../../../resources/flow-playbooks/implementation.md) completely before acting. The flow it opens is `flow start --type evolution --intent implementation` — flow types remain exactly four.

The invocation may name where this turn stops, as `--until <stage>` over `behavior|design|tests|implementation|baseline`, or in plain words. Honour it: reach that checkpoint, record it with `flow checkpoint`, report progress and the next command, and leave the flow open. Without one, run the segment to its successor baseline and close — a segment is a small closing flow, never a parked one.

Resolve `PLUGIN_ROOT` as three parent directories above this installed `SKILL.md`; invoke the engine as `node "<PLUGIN_ROOT>/bin/ai-saas-sdlc"`. Use Codex file/search tools for documentation and only configured implementation roots. Execute only playbook engine operations and exact configured verification commands. The playbook's delegation packet applies only where subagents exist; on this host, hold its fields as your own checklist and work in the main agent.

Without configured `implementation_sources`, stop and point the author at the wire-a-codebase guide instead of inventing anything. Never write `RESULT-*`, simulate a pass, or auto-approve on any self-assessed score. Expected standing warnings (`IMPLEMENTATION_LEVEL_UNPROVEN` for deferred levels) are the honest remainder — name them, do not fight them.
