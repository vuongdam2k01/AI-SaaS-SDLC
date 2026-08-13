# Craft: Data Segments

Judgment for segments touching `ENT-*` and `SCHEMA-*` files. The entity's declared persistence authority and the owning schema file are the contract; this protocol governs how the contract becomes sound storage.

## Modeling decisions

- Classify the workload before shaping storage: transactional → normalized; analytical → facts and dimensions with the grain declared first (one row per *what*); document-shaped → embedded; event history → events plus projected read models. Access patterns and integrity needs pick the model, never preference.
- Embed what is read and written with its parent and bounded in size; reference what grows without bound, is shared by many parents, or lives an independent lifecycle. Unbounded concurrently-updated arrays are a defect being designed.
- Normalize to third normal form; denormalize only on measured evidence. Stable identity in primary keys; business uniqueness in unique constraints; foreign keys wherever an orphan would be a bug — invariants the DATABASE must enforce are the SYSTEM-INVARIANTS rows in scope, not application-side hopes.
- Money and quantities in exact types (integer minor units; never floats), always beside their currency/unit; keep the pre-transform original when values are converted.
- Five questions before the schema ships: the top reads and writes it must serve; which invariants the database itself enforces; what can grow without bound; what must be restorable; which fields are sensitive or deletion-regulated.

## Indexing

- Index proven predicates: foreign keys, WHERE columns, ORDER BY columns; composite indexes ordered equality → sort → range, honoring the prefix rule (an `{a,b,c}` index serves `{a}`, `{a,b}` — never `{b}`). One good composite beats several singles.
- Do not index low-cardinality columns, hot-write columns, or tiny tables; every index costs writes, and an unused index is pure cost — verify with the planner's usage stats before and after.
- Multi-tenant repositories put the tenant discriminator first in every index, and every query filters on it.
- A function wrapped around an indexed column disables the index — use an expression index or a stored derived column.

## Query shape

- Healthy plan: examined ≈ returned, index scan, no in-memory sort. Full scans, examined ≫ returned, or unanchored regex mean the index and the query disagree — fix before shipping, verified with the plan, not intuition.
- Project only needed columns; LIMIT everything; filter before joining; prefer batched/eager loading over per-row queries (the N+1 rule from the backend craft applies at this layer too).

## Transactions and migrations

- Multi-statement changes ride a transaction; concurrent counters use server-side atomic operators, never read-modify-write.
- Every migration carries a tested rollback; the test proves both directions — forward preserves existing rows, backward restores the prior schema. Untested migrations are the dominant failure mode; a destructive change documents its steps and its recovery in the ENT mapping notes before it runs.
- Compatibility consequences of a schema change are docs-first: the `.dbml` and the ENT artifact move in the flow that owns the change, and the migration follows them.
