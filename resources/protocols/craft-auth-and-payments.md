# Craft: Auth and Payment Segments

Judgment for segments implementing ACCESS-CONTROL-governed surfaces and money-moving `INT-*` boundaries — the two places where a plausible-looking implementation fails quietly and expensively. ACCESS-CONTROL owns who-may-do-what; ERROR-CATALOG owns denial semantics; this protocol owns the mechanics that keep those promises true.

## Authentication invariants

- Password hashing is memory-hard (argon2id-class); password policy follows evidence: length over composition rules, breach-list checks, no forced rotation without compromise.
- Sessions: HttpOnly + Secure + SameSite cookies; regenerate the session identifier on login and on privilege elevation; idle and absolute timeouts; sessions enumerable and revocable individually and en masse — password change offers revoking the rest.
- Tokens: short-lived access, rotating refresh (rotation on every use); asymmetric signing for anything public; validate signature, issuer, audience and expiry; minimal claims. OAuth-class flows: PKCE always, exact redirect matching, `state` against CSRF; incomplete PKCE is **rejected, never silently downgraded**; confidential clients present their secret on refresh grants too.
- Out-of-band tokens (verification, reset, magic link) are **single-use and short-lived**, and concurrent requests bearing the same token must not mint multiple sessions — the replay race is a test case.
- Invitation acceptance requires verified ownership of the invited address; device-authorization approvals bind to the verifying session so one user cannot approve another's flow.
- Login does not reveal whether an account exists; failed attempts are limited and locked out; auth events and role/permission changes are audit-logged; MFA is mandatory for administrative access.

## Payment and provider-boundary invariants

- **Webhooks**: verify the signature before any parsing (timing-safe comparison; length mismatch rejects early); signature failure is the *only* non-2xx — processing errors still acknowledge so the provider does not retry-loop; record the event under a unique event-ID constraint **before** processing; duplicates acknowledge and do nothing; respond fast, queue the real work; log event type, ID and amount every time.
- **Provider truth vs local truth**: never trust the success redirect — confirm via API or webhook. Matching provider transactions to local orders uses an ordered fallback chain (explicit ID → parsed reference → amount+time window → amount-only), and ambiguity is rejected, never guessed; persist which method matched or failures become undebuggable. Normalize external identifiers defensively — intermediaries mangle them.
- **Money**: store amounts in the provider's original currency with the code alongside; integer minor units; normalize to one reporting currency only for reporting, with the conversion source recorded; discount application order is fixed and non-commutative — document it, test it. Underpayment flags for review, never auto-processes; overpayment accepts and continues.
- **Side effects after payment** (entitlements, mail, commissions): each individually guarded, never blocking order completion; cross-system sync is asynchronous with bounded backoff, idempotency-marked, and a provider 404 during sync means already-applied, not error.
- **Refunds**: check refundability, refund at the provider, record the reason, cancel dependents, recompute downstream, revoke entitlements deliberately — a lifecycle, not a single call.

## Review posture for these segments

Every rule above that can fail silently gets a spec row and a test: the IDOR probe, the replay race, the duplicate webhook, the ambiguous match, the underpayment. A green suite that never exercised the denial path proves the happy path only — and these are the segments where the unhappy path is the product.
