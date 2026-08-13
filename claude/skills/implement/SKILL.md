---
name: implement
description: Bring code into conformance with already-specified behavior, one feature and one segment at a time, through an implementation-intent Product Evolution with mapped paths and executed verification. Invoke manually with a feature ID and optional segment.
argument-hint: <FTR-ID> [code|ut|it|st|all] [--until behavior|design|tests|implementation|baseline]
disable-model-invocation: true
---
# Implementation

Treat `$ARGUMENTS` as one feature ID plus an optional segment (`code`, comma-joined `ut,it,st`, or `all`; absent means `all`). Read and execute [the shared Implementation playbook](../../../resources/flow-playbooks/implementation.md) completely before acting. The flow it opens is `flow start --type evolution --intent implementation` — flow types remain exactly four.

`$ARGUMENTS` may name where this turn stops, as `--until <stage>` or in plain words. Honour it: reach that checkpoint, record it, report progress and the next command, and leave the flow open. Without one, run the segment to its successor baseline and close — a segment is a small closing flow, never a parked one.

Set `ENGINE` to `node "${CLAUDE_PLUGIN_ROOT}/bin/ai-saas-sdlc"`. Use Claude Code file/search tools to inspect documentation and only configured implementation roots; use the terminal only for documented engine operations and exact configured verification commands.

On this host the delegation protocol's roles ship as four plugin agents — `implementation-scout`, `spec-compliance-reviewer`, `implementation-debugger`, `implementation-counsel` — the preferred delegates whenever `resources/protocols/implementation-delegation.md` calls for a spawn. Every engine operation stays in this controlling session; a delegate never runs one.

Without configured `implementation_sources`, stop and point the author at the wire-a-codebase guide instead of inventing anything. Never write `RESULT-*`, simulate a pass, or auto-approve on any self-assessed score. Expected standing warnings (`IMPLEMENTATION_LEVEL_UNPROVEN` for deferred levels) are the honest remainder — name them, do not fight them.
