# Craft: API and Backend Segments

Version-agnostic engineering judgment for segments touching `API-*`, `SUB-*`, `JOB-*`, `EVT-*`. Where a repository document (ERROR-CATALOG, QUALITY-REQUIREMENTS, ACCESS-CONTROL, the wire contract) states a rule, the document wins; everything below is the default when the documents are silent, and the review holds the segment to it.

## Security defaults — never silent, never client-side

- Parameterized queries always; user input never concatenated into SQL, shell commands (argument arrays), or paths. Allow-lists over deny-lists for fields and remote URLs (SSRF: validate against an allow-list; block metadata endpoints).
- Authorization is server-side and deny-by-default, checked per resource — authenticated is not authorized, and "does modifying another user's record return 403 or silently succeed" is a test case, not a hope. 401 means unauthenticated; 403 means unauthorized; the distinction is load-bearing.
- Tokens from a CSPRNG, never `Math.random`-class sources; secret equality via constant-time comparison; secrets in environment/secret stores only, rotated on exposure, never in logs, errors, URLs or client code.
- Rate limits tiered by endpoint class, auth endpoints strictest (order-of-magnitude reference: auth ~10/15min, public ~100/15min, authenticated ~1000/15min).
- Never log passwords, tokens, card numbers, PII, or full request bodies in production; log auth successes and failures, authorization denials, and data modifications with actor and timestamp.

## API design invariants

- Resource nouns, not verbs; status semantics carry meaning (201+Location on create, 204 on delete, 409 conflict, 422 validation detail, 429 limited).
- Error responses render the ERROR-CATALOG's codes and user-safe messages in one consistent envelope; internals, stack traces and schema details never leak. A failure is never swallowed: typed error, structured context, rethrow with cause — `catch { return null }` is the anti-pattern.
- Every list endpoint is bounded: pagination with total/hasNext metadata (or cursor), a LIMIT on every query, length caps on array inputs. Unbounded responses are a denial-of-service and a review blocker.
- Request bodies validated against a schema at the boundary — mass assignment (spreading a request body into a model) is a blocker; client-side validation is UX, never enforcement.
- Breaking changes to response shapes ride a docs-first contract change, never a code segment.

## Reliability

- Idempotency for anything a caller can send twice: keyed on a unique external identifier, recorded **before** the effect, duplicate → acknowledge and do nothing.
- Every external call carries a timeout and a named degradation path; retries use exponential backoff with bounded attempts (~3) and only for retryable classes — a 4xx is not retryable.
- Durable side effects (`JOB-*`): each independently guarded so one failure never blocks the primary outcome; concurrency-limited with a dead-letter path.
- Shared writes: check-then-set is atomic (guarded UPDATE), find-or-create backed by a unique constraint — the interaction-map's multi-writer targets are exactly where these bite.

## Performance and observability defaults

- N+1 is eliminated by join/eager-load/batching at every layer; O(n·m) lookups in render paths become map lookups.
- Cache with explicit TTL, explicit invalidation trigger and a measured hit rate; pool connections; index for proven predicates (details in `craft-data.md`).
- Reference budgets when QUALITY-REQUIREMENTS is silent: p95 < 500ms, p99 < 1s, error rate < 1%; liveness ≠ readiness (readiness returns 503 while dependencies are down).
- Structured logs with correlating IDs are the debugging substrate; "is it slow → metrics; is it broken → logs; where → traces".
