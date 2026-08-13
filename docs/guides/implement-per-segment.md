# Implement per segment

**When to use this:** a feature is fully specified — active `FTR/UC/FLOW/UT/IT/ST` — the codebase is [wired](wire-a-codebase.md), and you want construction to happen **now**, in a slice you choose: the production code first, the unit tests next week, the system tests when the journey stabilizes. Implementation is never automatic; each slice starts because you invoked it.

**The one command:**

```text
/ai-saas-sdlc:implement FTR-00N code
```

Run it from the root of your documentation repository — never from inside the application codebase; the two are separate repositories and the engine has nothing legal to read or write in the second.

The segment names the depth: `code` (production code for the feature's design artifacts), `ut`, `it`, `st` (that level's test code), comma-joined combinations (`ut,it`), or `all` (default). Not sure what to implement next? With **no flow open**, `flow next` adds a `suggested_segment` computed from the warning ledger; mid-segment it reports the open flow's progress instead.

## What a segment actually is

One small **closing** flow — an ordinary Product Evolution opened with `--intent implementation`, so flow types remain exactly four. It opens, reads the engine-computed context, writes code, maps it, runs your declared suite, baselines **with honest warnings for what it deliberately did not do**, and closes. Progress across segments is the warning delta:

```text
/ai-saas-sdlc:implement FTR-007 code
  → BL-013: FTR-007 warns IMPLEMENTATION_LEVEL_UNPROVEN for UT, IT, ST

/ai-saas-sdlc:implement FTR-007 ut,it
  → BL-014: FTR-007 warns IMPLEMENTATION_LEVEL_UNPROVEN for ST

/ai-saas-sdlc:implement FTR-007 st
  → BL-015: FTR-007 clean — specified, mapped, executed
```

Do **not** hold "code done, tests pending" by leaving a flow open at the `implementation` checkpoint: an open flow monopolizes the repository's single flow slot and blocks documentation work. The warning ledger is the correct holder of partial state; the parked flow is the anti-pattern.

Stopping *inside* one segment is different and fully supported: `--until behavior|design|tests|implementation|baseline` declares where this turn stops, and the flow stays open deliberately until you continue it. If a segment is interrupted — a stop you asked for, a lost session, a compaction — see [Resume an interrupted flow](resume-an-interrupted-flow.md); the engine prints the exact command that continues it.

Every segment runs the **full** configured suite, not just its own level: a `ut` segment still executes the integration and system commands, because the regression contract is the whole suite. Budget for that on a slow repository — a long suite can carry its own `timeout_ms` (see [Wire a codebase](wire-a-codebase.md)).

## What happens inside the flow

1. **Reads first.** The work packet `generated/implementation-plan/<FTR-ID>.md` (closure in dependency order, foundation rows, test-case tables, commands), the dashboard, and the `Engineering profile`.
2. **Scouts the delta** — what the codebase already does about this spec: conventions to match with `file:line`, blast radius, partial implementations to extend rather than duplicate.
3. **Implements the segment** inside configured roots only, updating `implementation:` mappings and the specs' Implementation-mapping tables as part of the work. A screen segment additionally assembles its brief from the owned sources (`SCR-*` tables, `UX-RULES` incl. design tokens, `ERROR-CATALOG` strings, the transition graph), passes a countable self-review gate (states present, catalog strings verbatim, accessible names, visible focus, 4.5:1 contrast, 375px, zero placeholders), and uses whatever browser verification the host has installed — recording what was and was not observed. The craft protocols load by situation — API and backend, data, auth and payments, client, testing — so a segment reads the judgment its own work needs and nothing else.
4. **Reviews compliance first**: every acceptance criterion and spec row in the segment graded PASS / MISSING / EXTRA against the diff, with `file:line` evidence — before any style opinion. MISSING gets fixed here; EXTRA is behavior the docs never asked for and gets removed or routed to `evolve-product`.
5. **Verifies for real**: `verify --all --execute` — your exact declared commands, fresh `EXEC-*`/`RESULT-*` records, failures kept as history. A command that declared a `report:` file additionally yields per-case rows joined to your `TC-*` mapping rows. Three outcomes are *not* test failures and the record says so: `timed_out` (killed at its budget), `spawn_error` (the command never ran) and `output_truncated`. Test segments prove each new test can fail; no test is ever edited into compliance, and no failing case is made to pass by weakening its spec.
   Two repair attempts that both fail are a signal, not an invitation to a third: the third strike stops treating it as a defect, records an `ISS-*`, and routes the architectural question to Reconciliation or an ADR.
6. **Closes**: `refresh` → `validate` → `baseline create` → `flow close`, reporting execution IDs, warnings cleared, warnings still standing, and the exact next command.

## Hosts

On Claude Code the delegation protocol's roles ship as four plugin agents — `implementation-scout` (read-only, cheap tier), `spec-compliance-reviewer` (read-only by construction, so a reviewer physically cannot fix what it finds), `implementation-debugger` (reproduces, never edits) and `implementation-counsel` (one turn, no questions, at the three-strike or design-fork boundary) — spawned only when `implementation-delegation.md` calls for one, and each refusing with `NEEDS_CONTEXT` if it is spawned without a full packet. Their declared model tiers are floors, never ceilings. On Codex the same protocol reads as the main agent's self-checklist, and nothing is ever reported as delegated that was not. On both hosts the enforcement authority is the engine (validation, execution records, baselines) — hooks are defense-in-depth, and the Codex plugin ships none.

## When implementation disagrees with the documents

Building is where specs meet reality, and the flow has three named exits instead of improvisation:

- **Detail inside this feature's closure is wrong** → fixed in this same flow, named in the report.
- **Something *outside* the closure is wrong** (two other features contradict) → recorded as `ISS-*`, this segment finishes honestly, then [Reconciliation](reconcile-a-failure.md) repairs the recorded contradiction.
- **The feature cannot be built as specified** → stop; either baseline with the `ISS-*` that says why, or abandon by restoring both trees byte-exact to flow start (the engine verifies both snapshots and refuses a half-revert).

## How to check it worked

- The closing report names `RESULT-*` verdicts by ID and the standing warnings by code — or the segment did not finish.
- `generated/implementation-coverage.md` moved: the segment's level column went from `0/n` toward `n/n`.
- `/ai-saas-sdlc:inspect-state FTR-00N` traces the feature to its mapped, executed state.
- `validate` reports no `IMPLEMENTATION_MAPPING_ROW_IGNORED` or `IMPLEMENTATION_MAPPING_PATH_MISSING` for the specs you touched: the first means a mapping row is present but unparseable, the second that its test path resolves under no configured source — test paths are relative to the source root itself, never prefixed with the source ID.

## Catch-up for a repository full of specified-but-unbuilt features

Work the warning ledger down one feature at a time — `implement` for planned construction, Reconciliation slices for drift an implement review recorded — and let `suggested_segment` order the queue. The one thing this method never asks for is the monster flow that builds everything at once.
