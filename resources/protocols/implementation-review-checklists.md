# Implementation Review Checklists

The checklist library the quality pass of `spec-compliance-review.md` loads by segment boundary type. Two passes: **critical** findings block the segment (fixed in-flow, re-reviewed); **informational** findings go in the closing report and do not block. Every finding carries `file:line` or is void; the suppression list in the review protocol applies before anything is reported. Read the whole diff first — a finding the diff already addresses is noise.

## Base — every segment

**Critical:**
- Injection: string-built SQL/shell/paths from user input; raw HTML sinks from user-controlled data; unsanitized input persisted or rendered.
- Races: check-then-write without atomicity; find-or-create without a unique constraint; status transitions without a guarded update; shared mutable state unsynchronized.
- Boundaries: new endpoints/operations missing authentication or per-resource authorization (IDOR); secrets in logs, errors or client code; model/AI output used in queries unvalidated; secret equality not constant-time.

**Informational:**
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
