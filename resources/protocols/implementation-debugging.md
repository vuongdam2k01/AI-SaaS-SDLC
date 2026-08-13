# Implementation Debugging Protocol

Diagnosis method for any failure met while implementing: a red configured run, a wrong output, a broken build, drift the review surfaced. The verification protocol owns *proof*; this protocol owns *finding the cause*. Its one law, which bends for no urgency: **no fix without root-cause investigation first** — random fixes are slower than diagnosis and create the next defect.

## The six-question gate

Propose no repair until every question has a one-concrete-sentence answer. Any answer containing "probably", "I think" or "something with" means the investigation is not done — gather evidence or scout further, never guess:

1. **Exact symptom** — the verbatim error, failing assertion or observed behavior (copied, not paraphrased; in this method, the recorded `EXEC-*` log is the copy).
2. **Reproduction** — the minimal command/input sequence that triggers it.
3. **Expected vs actual** — what the specification says should happen vs what does.
4. **Root cause, not symptom** — the specific line, missing check, race, or contract violation, with `file:line` evidence.
5. **Why now** — the change or condition that exposed it (a commit, a data shape, an environment difference).
6. **Blast radius** — every path sharing the broken behavior or the same cause.

## The four phases, in order, no skipping

**1. Investigate.** Read the whole error and stack, not its first line. Reproduce reliably; an unreproducible failure means gather more data, not guess. Check what changed (diff, commits, dependencies, config). In multi-component paths, log data entering and leaving each boundary and run once to see *where* it breaks before reasoning about *why*. Trace the bad value backward up the call chain to its origin — the fix belongs at the source, never where the error surfaced.

**2. Compare.** Find working code in the same codebase that does the same kind of thing; read it completely; list every difference however small — "that can't matter" is how the difference that matters gets skipped.

**3. Hypothesize.** Form two or three competing hypotheses and say which evidence separates them — locking onto the first plausible story is the classic failure. Test with the smallest possible change, one variable at a time. A disproven hypothesis is replaced, never patched over with a second simultaneous fix. Not understanding something is stated, not papered over.

**4. Repair.** First a failing reproduction (in this method: the spec's test case, executed and red). Then one change addressing the identified cause — no "while I'm here" improvements. Then the proof per the verification protocol: exact pre-fix commands re-run, red turned green, blast radius swept.

**The three-strike rule.** Count repair attempts. Under three: return to phase 1 carrying the new information. At three: stop treating it as a defect — each failed fix revealing new coupling is the signature of a design problem. Record the `ISS-*`, name the architectural question, and route to Reconciliation or an ADR through Evolution. The author decides; a fourth silent attempt is prohibited. On a host with delegation, one fresh-context counsel consult (delegation protocol) may sharpen the `ISS-*` and the routing first — one turn, zero questions, alternatives with honest costs — and it never substitutes for the author's decision.

## Techniques, loaded by situation

| Situation | Technique |
|---|---|
| Error surfaces deep in a call chain, origin unclear | **Backward tracing**: write the chain, inspect the value passed at each hop upward until the original trigger; instrument the dangerous call site (stack + arguments) when reading is not enough. Never fix only where the error appears. |
| Cause found; same class of bug must become impossible | **Defense in depth**: validate at every layer the data crosses — entry boundary, business rule, environment guard, forensic instrumentation. One validation is "fixed this bug"; layers are "made it impossible". Test each layer by bypassing the one above it. A guard that weakens a stated invariant is a test seam — record it in `TEST-POLICY`. |
| A test fails only in the full suite, passes alone | **Polluter bisection**: run test files serially, probing for the leaked state after each one; the first appearance names the polluter. Isolate by evidence, not by reasoning about who "should" leak. |
| The failure involves an external boundary (provider, clock, filesystem) | Reproduce against the recorded payload/log first; only then against the live boundary. The record is the stable oracle. |

## Red flags — each one means "return to phase 1"

"Quick fix for now, investigate later" · "Just try changing X and see" · "It's probably X" · "Add several changes and run the tests" · "Skip the failing-test step, I'll verify manually" · "I don't fully understand it but this might work" · "One more attempt" (when two have failed) — and from the author's side: "is that not happening?", "stop guessing", visible frustration — all signals the process was abandoned.

| Rationalization | Reality |
|---|---|
| "The issue is simple, no need for process" | Simple issues have root causes too; the gate takes minutes when the cause really is simple. |
| "Emergency — no time for this" | Systematic diagnosis is faster than guess-and-check; thrash is the slow path. |
| "I already know this codebase" | Knowledge decays; the scout exists to re-verify it. |
| "Tests pass now, done" | Without the cause named and the class guarded, the same defect returns wearing a different symptom. |
