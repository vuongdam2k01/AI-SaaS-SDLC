# Implementation Verification Protocol

Two iron laws govern every implementation segment, and neither bends for urgency, size or confidence:

1. **No fix without root-cause investigation first.** A failing test, a wrong output or a broken build is diagnosed before it is touched: read the actual error, trace the actual path, form at most two or three competing hypotheses and eliminate them against evidence — one variable at a time. Guessing at fixes is slower than diagnosis and leaves the cause alive.
2. **No completion claim without fresh engine-recorded evidence.** "It works" is a claim about a record, or it is nothing. The only execution evidence this method accepts is `ENGINE verify --execute` output — reserved `EXEC-*`, immutable log, rendered `RESULT-*`. A pass remembered from earlier, reasoned about, or observed through an improvised shell command is not evidence.

## Claim → evidence

Every claim in a closing report names what backs it:

| Claim | Backed by | Never by |
|---|---|---|
| The segment's behavior is implemented | Spec-compliance table, all PASS, with `file:line` | The diff "looking complete" |
| Tests pass | `RESULT-EXEC-*` for the declared commands, exit code 0 | A paraphrase of a suite run |
| The regression surface is safe | The full configured suite green plus the walked touchpoint list | "Nothing else should be affected" |
| A defect is fixed | The captured pre-fix failure re-run and now passing, root cause named | The symptom no longer appearing once |
| A test covers its spec row | The row's ID in the test, the test named in the spec's Implementation-mapping table | Coverage inferred from filenames |

## Pre-fix capture

Before repairing any failure, capture its exact state: the failing command, the verbatim error, the relevant record ID. That capture is the verification baseline — the repair is proven by re-running precisely what failed, not something like it.

## Red-green, adapted per segment

- A **test segment** proves each new test can fail: derived strictly from the spec row, it must be demonstrably capable of failing when the behavior is broken — a test that cannot fail proves nothing and is a phantom.
- A **code segment** fixing observed misbehavior proves the fix by reverting it where cheap: fail without, pass with. Where reverting is not cheap, the pre-fix capture re-run stands as the proof.

## Honest failure

A red `verify` run is recorded history, never an embarrassment: the record stays, the rerun gets a new ID, and the report names both. Editing a test into compliance, weakening an assertion, skipping a case or simulating a pass converts a visible failure into an invisible one — the single worst trade this method knows. When a failure's cause is the specification itself, the specification does not get quietly rewritten to match the code: that is a contract contradiction and it routes to Reconciliation with the evidence attached.
