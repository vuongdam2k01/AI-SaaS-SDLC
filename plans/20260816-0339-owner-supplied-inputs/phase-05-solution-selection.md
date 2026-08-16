# Phase 5 — Solution-class selection

Status: complete (released as 1.23.0)

## Outcome

The pipeline stops defaulting to hand-rolled infrastructure. Before a segment writes a component that a standard library ships, someone has to have asked the question — and the answer, either way, lands as a recorded row.

## The defect, exactly

The reference repository chose libraries wherever the Engineering profile had a slot (React, Zod, PGlite, Vitest, Playwright, Vite) and hand-rolled wherever it did not: an HTTP router over `node:http`, an in-process job queue, plain CSS. Each hand-rolled instance carried an after-the-fact rationale; none carried a before-the-fact question. Grepping the plugin for library-selection guidance returned nothing that asks — `craft-client.md` assumes libraries already chosen, `implementation-scouting.md` mentions `node_modules` only as a directory not to read, and the review checklists audit dependencies only after the set changed.

Four mechanisms produced the bias:

1. No step anywhere asks "does a standard library solve this?" before the first edit.
2. The Engineering profile's dimension list has slots for framework, package manager, tests and migrations — none for HTTP, forms, styling, animation, state, or queues. A decision without a slot is made silently.
3. `spec-compliance-review.md` grades EXTRA as "implemented, specified nowhere: remove it" — and a library always ships capability the spec never asked for, so the minimal-scope rule reads as pressure to hand-roll.
4. No review finding existed for "hand-rolled a commodity concern".

The professional default runs the other way: commodity infrastructure is adopted, and only the product's own domain is written. The plugin inverted this not by doctrine but by omission — the same defect class as the visual system and the configuration surface: a decision with no owner and no one asking.

## Changes

| File | Change |
|---|---|
| `resources/protocols/implementation-scouting.md` | Sixth mandatory output, the **solution-class check**: every commodity component the segment will write names its profile row; no row → name the ecosystem candidates and adopt one or record the refusal before the first hand-rolled line. Burden of proof on hand-rolling, never on adoption. |
| `resources/project-template/03-design/architecture-overview.md` | Engineering profile contract gains one row per commodity solution class, each either an adopted library or "none — hand-rolled because X; revisit when Y". |
| `resources/protocols/spec-compliance-review.md` | EXTRA judges behavior, never dependency surface — unused library capability is not EXTRA; the hand-rolled reimplementation is the reviewable event. |
| `resources/protocols/implementation-review-checklists.md` | New critical: hand-rolling against a profile row that names a library. New informational: hand-rolled commodity concern with no profile row — an unrecorded decision, reported with the candidate named. |
| `resources/flow-playbooks/implementation.md` | Mandatory reads include the solution-class rows; the profile-silent rule gains a third branch — silent profile plus silent codebase routes to the scouting check, never to silent invention. |
| `docs/guides/wire-a-codebase.md` | The wiring flow's profile fill-in enumerates the solution-class rows. |

## What this deliberately is not

No engine finding and no catalog generation change. "Is this commodity?" is a judgment call, and deterministic validation must not enforce taste — the enforcement point is the model-side scouting output and review checklist, which the countable review structure already carries. The profile section stays a foundation-owned section, not a new artifact.

## Verification

Method-layer change: proven by the next implement segment on the reference repository — the EDITING/PUBLISHING segments must surface the solution-class check in their scout output, and any hand-rolled remainder must appear as a profile row or a review finding.
