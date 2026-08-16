# Spec-Compliance Review Protocol

Compliance review runs **first and blocks quality review**: well-written code that does not match the specification is still wrong, and reviewing its style before its truth wastes the review. In this repository the specification is not a plan the model wrote for itself — it is the gated, evidence-backed document set, which is exactly why this review has teeth here.

## Extract, then grade

1. Extract every claim the segment answers to: the feature's `AC-*` and `BR-*` in scope, the `UC/FLOW` steps the segment implements, the spec rows (`TC-*`) of every specification the segment maps, the wire/schema/transition contract entries it touches, and the ACCESS-CONTROL / SYSTEM-INVARIANTS / ERROR-CATALOG rows the work packet names.
2. Grade each against the actual diff:

| Verdict | Meaning | Consequence |
|---|---|---|
| PASS | Implemented as specified, evidence at `file:line` | Proceeds |
| MISSING | Specified, not implemented by this segment though the segment claims it | **Blocks**: fix in this flow, re-review |
| EXTRA | Implemented, specified nowhere | Remove it, or route the behavior change to `evolve-product` — undocumented behavior is drift born green |

3. A finding without a `file:line` citation is void — discard it without evaluating its merit. This is the evidence filter that keeps review grounded in the diff rather than in impressions of it.

A row the segment deliberately defers (a `code` segment does not implement `TC-*` rows) is out of scope, not MISSING: the standing `IMPLEMENTATION_LEVEL_UNPROVEN` warning carries deferred levels, and this review only judges the segment as invoked.

EXTRA judges **behavior**, never dependency surface. Adopting a library whose capabilities exceed what the specification asks — a router with middleware nobody registered, a form library with validators nobody enabled — is not EXTRA; that is what adopting commodity infrastructure looks like, and the scouting protocol's solution-class check makes it the default. EXTRA is *wired-up behavior* the documents never asked for. Reading the minimal-scope rule as pressure to hand-roll instead of adopt inverts its purpose: a hand-rolled reimplementation of a commodity concern is itself the reviewable event (see the base checklist), not the compliant baseline.

## Quality pass, after compliance passes

Adversarial posture: assume the implementation may have been produced by a model and look for its habits — phantom tests that execute code without proving behavior, parallel reimplementations of existing utilities, caught-and-swallowed errors, type suppressions, scope drift beyond the segment. Findings carry `file:line` or are void, same filter.

The pass begins with its own edge-case scout over the changed files — dependents, data-flow risks, boundary conditions, async races, state mutations — never trusting the implementer's blast-radius summary. Then it runs the segment's overlays from `implementation-review-checklists.md` (base always; API, client, data and the security sweep by boundary type) in two tiers: critical blocks, informational reports. Before submitting, the reviewer verifies its own sweep covered: concurrency, error propagation (every throw caught or explicitly passed), caller-assumption vs callee-guarantee mismatches, backwards compatibility of exported surfaces, boundary validation, the dual auth check (identity AND permission), query efficiency, and data leakage.

## Suppression list

Review output is signal-dense or it is noise. Do **not** flag:

- style and formatting a linter owns, or preferences between two working idioms ("consider X instead of Y" when Y works);
- redundancy that aids readability;
- hypothetical concerns outside the segment's blast radius;
- requests for comments explaining thresholds or choices — the documents own rationale, not the code;
- anything already addressed elsewhere in the same diff — read the whole diff before commenting;
- wishes for artifacts, tests or design the documents do not demand — the documents are the scope authority, and wanting more of them is an `evolve-product` conversation.

## Simplification pass

When the segment's live diff is large — reference thresholds when the repository sets none: ~400 changed lines, ~8 files, or ~200 lines in one file — a behavior-preserving simplification runs before the verdict, scoped strictly to the changed files: collapse parallel reimplementations onto existing utilities, remove speculative abstraction the spec never asked for, shrink what grew past its job. Its proof is mechanical, never prose: the diff statistics before and after, and the full configured suite still green. Below the thresholds the pass is skipped silently — simplification of an already-small diff is churn.

## Bounds and verdicts

At most **three** review cycles; findings still open after the third go to the author as a named decision, never a fourth silent loop. There is no numeric score and no self-approval threshold: the review's outcome is its finding table, and the verdicts that gate anything are deterministic — the compliance table's MISSING count, the configured suite's exit codes, `validate`'s findings. A model's own satisfaction is not evidence and is never recorded as such. And a reviewer prompted to find gaps will report some even when the work is sound: findings are correctness and requirement gaps only, style preference never blocks, and chasing marginal findings into over-engineering is itself a review failure — named in the report, not indulged.
