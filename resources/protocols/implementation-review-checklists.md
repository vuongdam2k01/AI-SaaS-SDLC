# Implementation Review Checklists

The checklist library the quality pass of `spec-compliance-review.md` loads by segment boundary type. Two passes: **critical** findings block the segment (fixed in-flow, re-reviewed); **informational** findings go in the closing report and do not block. Every finding carries `file:line` or is void; the suppression list in the review protocol applies before anything is reported. Read the whole diff first — a finding the diff already addresses is noise.

## Base — every segment

**Critical:**
- Injection: string-built SQL/shell/paths from user input; raw HTML sinks from user-controlled data; unsanitized input persisted or rendered.
- Races: check-then-write without atomicity; find-or-create without a unique constraint; status transitions without a guarded update; shared mutable state unsynchronized.
- Boundaries: new endpoints/operations missing authentication or per-resource authorization (IDOR); secrets in logs, errors or client code; model/AI output used in queries unvalidated; secret equality not constant-time.

**Critical (solution-class):**
- A segment hand-rolls a concern whose Engineering profile row names an adopted library — that is drift against the recorded substrate, same class as contradicting any other profile convention.

**Informational (over-build hunt — one line per finding: location, what to cut, what replaces it):**
- A commodity solution-class component (HTTP routing, validation, forms, styling plumbing, animation, state, data fetching, jobs/scheduling, auth mechanics) written where a lower ladder rung was available and unexamined — an existing helper, the stdlib, a native platform feature, an installed dependency — or hand-rolled at subsystem size with no Engineering profile row recording the decision. Reported as an unrecorded decision, naming the rung that was skipped.
- Unrequested flexibility: an interface or abstract base with one implementation, a factory with one product, a wrapper that only delegates, a layer with one caller, config for a value that never changes, dead flags. The replacement is deletion or inlining until a second consumer exists.
- Same logic achievable in materially fewer lines with a stdlib or platform form — report the shorter form, not just the complaint.
- A deliberate simplification with a known ceiling (global lock, O(n²) scan, non-redelivering queue) missing its code-site `ceiling:` marker — or carrying one that names no upgrade trigger, the variant that silently rots.
- A branch that skips its side effect (status set, dependent data forgotten); logs claiming actions that were conditionally skipped.
- Bare literals shared across files; error strings doubling as query filters.
- Dead assignments, stale comments, unused imports.
- Missing negative-path tests; assertions on status but not on effects; security enforcement without an integration test.
- Type coercion at system boundaries; hash inputs not normalized.
- O(n·m) lookups in render paths; missing pagination; N+1 loops; unbounded queries.

## API overlay — segments touching `API-*`/`SUB-*`

**Critical:** public auth endpoints without rate limits; credentials in query strings; bulk endpoints without per-item authorization; bodies accepted without schema validation; mass assignment; uploads without size/type limits; sensitive fields, stack traces or schema detail in responses.
**Informational:** unpaginated lists; inconsistent error envelope or naming across endpoints; new endpoints without logs/metrics or correlation IDs; swallowed exceptions; response-shape changes without a docs-first contract change.

## Client overlay — segments touching `SCR-*`/`CMP-*`

**Critical:** HTML injection sinks from any non-static source; URL parameters rendered unsanitized; `href` from user input without protocol validation; state-changing requests without CSRF protection where cookies authenticate.
**Informational:** queries inside list-render loops; missing stable keys; eagerly-loaded heavy bundles; layout-shifting media without dimensions; interactive elements unreachable by keyboard; inputs without labels; color-only signals (the design gate owns the full accessibility pass — these are the diff-visible symptoms).

## Data overlay — segments touching `ENT-*`/`SCHEMA-*`

**Critical:** migration without a tested rollback; floats for money; invariants the documents assign to the database enforced only in application code; orphan-permitting relations where the docs demand integrity.
**Informational:** indexes on low-cardinality or hot-write columns; missing index behind a new query predicate (plan-verified); tenant filter absent from a query in a multi-tenant repository; unbounded growth fields without a retention note.

## Security sweep — any segment the risk warrants

Structured secret patterns in the diff (cloud keys, `sk_live`-class tokens, PEM headers, credentialed connection URLs) are critical on match after placeholder verification — and the value is never echoed into the report (mask to a name or first-4/last-2). Dependency audit output belongs in the report when the segment changed the dependency set; disabled TLS verification, `eval`-class execution and insecure randomness near token generation are critical. The sweep reports and recommends rotation — it never auto-fixes and never executes a found credential.

## Severity → action

Critical, exploitable now → blocks the segment. High, moderate effort → fixed in-flow or carried as a named `ISS-*` with the author's explicit acceptance. Medium/low → informational, honestly listed. Theatrical severity inflation is itself review noise — the suppression list applies.
