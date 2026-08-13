# Implementation Delegation Protocol

How an implementation flow uses subagents when the host provides them, and how the same discipline holds with none. Delegation here is never ceremony: a subagent earns its spawn through exactly four mechanisms — **a fresh context window, an enforced tool boundary, parallel wall-clock, or a specialist posture** — and a spawn providing none of these is work done worse, inline being better. On a host without subagents (Codex included), every rule below becomes a checklist the main agent holds itself to, and a delegation is never faked: the report names the gap instead.

## When to spawn — timing beats selection

| Moment in the segment | Condition | Role and posture |
|---|---|---|
| Scout (§4 of the playbook) | More than two source areas to map | Parallel read-only explorers, one per area, exact path assignments; each returns files/patterns/risks/unresolved questions |
| Implement | Genuinely disjoint file sets inside one segment | One implementer per set — ownership decided **before** spawning; the single-active-flow rule serializes flows, never files inside one |
| Test execution | Suite run + failure triage | A runner whose report is the recorded evidence, never its prose |
| Review (§7) | Always available as the preferred shape | An **independent reviewer with no edit authority** — findings only, fixes happen afterwards in the implementer's hands |
| Any failure met twice | Same failure despite a fix | An evidence-gathering debugger carrying everything known so far, under the debugging protocol |
| The three-strike boundary, or a design fork the documents do not settle | Two repair attempts failed, or an ADR-threshold choice no document owns | A one-turn counsel on the strongest available tier — zero questions, TL;DR first, honest alternatives, assumptions with confidence; it advises only, the flow owns the fix |

The commonest failure is the right role spawned late — explorers after the context is already lost, the reviewer after the work is declared done. Spawn at the trigger, not at the regret. And keep concurrency to a handful — three to five delegates at once, each returning a summary of one to two thousand tokens, never a transcript: multi-agent work costs roughly fifteen times a single conversation, so parallelism is spent only on reads and independent verifications, scaled to the task's real complexity. A wall of agents produces reports faster than anyone can verify them.

## The packet — a subagent's entire world

A spawn carries all eight fields; the subagent sees no conversation history, so the packet is everything it knows:

1. **Task** — one verifiable outcome.
2. **Files to read** — exact paths, never "look around" (unless scouting is the task).
3. **Files it may modify** — explicit ownership; empty for read-only roles.
4. **Acceptance criteria** — for implementation work, the spec rows themselves.
5. **Constraints** — patterns to follow, boundaries not to cross, no engine mutations (flows, baselines, results) from inside a delegate: the controlling agent owns every engine operation.
6. **Work-context path** — the docs repository root and the relevant packet/dashboard paths.
7. **Report destination** — inline result, or the turn's report; never a claim without its evidence reference.
8. **Scope flags** — any author-passed narrowing, verbatim; a delegate that never sees the flag silently reverts to full scope.

Context isolation is the point, not a limitation: summarize only the decisions the subtask needs, keep coordination, merge choices and author approvals in the controlling session.

## Roles as enforcement, not as theater

- **The reviewer cannot edit.** Where the host can restrict tools, restrict them; where it cannot, the discipline stands: review output is a findings table with `file:line` evidence, and every fix is a separate act by the implementer. A reviewer who fixes what it finds has rationalized the finding away.
- **The reviewer re-scouts before reviewing.** Its first act is its own edge-case pass over the changed files — dependents, data-flow risks, boundary conditions, async races, state mutations — never trusting the implementer's summary of the blast radius.
- **The runner's prose is not evidence.** Test outcomes enter the record through the engine's `verify --execute`; a delegate's summary of a run it performed some other way proves nothing and is not accepted.
- **Match capability to judgment, cost to mechanics.** Discovery, suite-running and mechanical sweeps take the cheap tier; review, design judgment and diagnosis take the strong tier. Never budget-route judgment.
- **Counsel never edits, never asks.** Its single turn returns judgment — recommendation, alternatives with honest costs, assumptions carried with confidence — and judgment is never evidence: execution records and the author's recorded decisions remain the only proof.

## Parallel safety

Disjoint file ownership is decided before spawning, never discovered after. No parallel edits to the same file, generated artifact, migration sequence or shared config — an ownership conflict detected mid-work stops the delegate immediately and returns to the controller. Read-only explorers parallelize freely.

## Status protocol

Every delegate ends with:

```text
Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: one or two sentences
Concerns/Blockers: when present
```

`BLOCKED` and `NEEDS_CONTEXT` are handled by changing context, scope or approach — re-sending a failing prompt unchanged is a loop, not a retry. `DONE_WITH_CONCERNS` items are carried into the closing report **verbatim**: concerns from a fresh-context agent are signal, not noise.
