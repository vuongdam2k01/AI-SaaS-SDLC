# Implement per segment

**When to use this:** a feature is fully specified — active `FTR/UC/FLOW/UT/IT/ST` — the codebase is [wired](wire-a-codebase.md), and you want construction to happen **now**, in a slice you choose: the production code first, the unit tests next week, the system tests when the journey stabilizes. Implementation is never automatic; each slice starts because you invoked it.

**The one command:**

```text
/ai-saas-sdlc:implement FTR-00N code
```

The segment names the depth: `code` (production code for the feature's design artifacts), `ut`, `it`, `st` (that level's test code), comma-joined combinations (`ut,it`), or `all` (default). Not sure what to implement next? `flow next` prints a `suggested_segment` computed from the warning ledger.

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

## What happens inside the flow

1. **Reads first.** The work packet `generated/implementation-plan/<FTR-ID>.md` (closure in dependency order, foundation rows, test-case tables, commands), the dashboard, and the `Engineering profile`.
2. **Scouts the delta** — what the codebase already does about this spec: conventions to match with `file:line`, blast radius, partial implementations to extend rather than duplicate.
3. **Implements the segment** inside configured roots only, updating `implementation:` mappings and the specs' Implementation-mapping tables as part of the work.
4. **Reviews compliance first**: every acceptance criterion and spec row in the segment graded PASS / MISSING / EXTRA against the diff, with `file:line` evidence — before any style opinion. MISSING gets fixed here; EXTRA is behavior the docs never asked for and gets removed or routed to `evolve-product`.
5. **Verifies for real**: `verify --all --execute` — your exact declared commands, fresh `EXEC-*`/`RESULT-*` records, failures kept as history. Test segments prove each new test can fail; no test is ever edited into compliance.
6. **Closes**: `refresh` → `validate` → `baseline create` → `flow close`, reporting execution IDs, warnings cleared, warnings still standing, and the exact next command.

## When implementation disagrees with the documents

Building is where specs meet reality, and the flow has three named exits instead of improvisation:

- **Detail inside this feature's closure is wrong** → fixed in this same flow, named in the report.
- **Something *outside* the closure is wrong** (two other features contradict) → recorded as `ISS-*`, this segment finishes honestly, then [Reconciliation](reconcile-a-failure.md) repairs the recorded contradiction.
- **The feature cannot be built as specified** → stop; either baseline with the `ISS-*` that says why, or abandon by restoring both trees byte-exact to flow start (the engine verifies both snapshots and refuses a half-revert).

## How to check it worked

- The closing report names `RESULT-*` verdicts by ID and the standing warnings by code — or the segment did not finish.
- `generated/implementation-coverage.md` moved: the segment's level column went from `0/n` toward `n/n`.
- `/ai-saas-sdlc:inspect-state FTR-00N` traces the feature to its mapped, executed state.

## Catch-up for a repository full of specified-but-unbuilt features

Work the warning ledger down one feature at a time — `implement` for planned construction, Reconciliation slices for drift an implement review recorded — and let `suggested_segment` order the queue. The one thing this method never asks for is the monster flow that builds everything at once.
