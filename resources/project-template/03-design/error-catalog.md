---
id: ERROR-CATALOG
artifact_type: error_catalog
title: Error catalog
status: draft
created_by_change: GENESIS
depends_on: [UX-RULES, ARCHITECTURE-OVERVIEW]
decisions: []
supersedes:
---

# Error catalog

<!-- Single authority for stable error codes, conditions, user-safe messages, protocol mappings, retryability, and state guarantees. Local validation IDs may reference but not redefine codes. -->

## Authority boundary

- Codes identify semantic failure conditions, not source locations or generic exceptions.
- OpenAPI owns response schemas/status declarations; API/JOB/INT designs own detection/processing; this catalog owns shared error meaning.
- Unknown internal faults map to a bounded safe code without leaking implementation or protected existence.

## Error codes

| Error code | Condition | User-safe message | Protocol mapping | Retryable | State guarantee | Owner |
|---|---|---|---|---|---|---|
<!-- Use ERROR-<AREA>-<NNN>. One condition per code; messages are exact, actionable, and privacy-safe. -->

## Exposure and logging rules

| Local ID | Rule | Applies to | Observable consequence |
|---|---|---|---|
| EXP-01 | Public responses include stable code, safe message, and correlation reference only where useful. | <every public response> | <fields a case asserts present> |
| EXP-02 | Internal evidence records the correlation ID, condition, owner, and sanitized diagnostic context. | <internal records> | <fields a case asserts recorded> |
| EXP-03 | Never expose stack traces, credentials, secrets, protected resource existence, or sensitive payload fields. | <every surface> | <fields a case asserts absent> |
| EXP-04 | Validation details identify safe field or local IDs without echoing unsafe input. | <validation responses> | <what the response must not contain> |
<!-- Each row is a negative expectation a verification case proves; a rule nothing asserts against is a commitment no execution can fail on. -->

## Recovery semantics

| Error code | Valid next action | Retry precondition | Reconciliation owner | UX rule IDs |
|---|---|---|---|---|
<!-- Retryable means a repeat may succeed under stated conditions; it never implies automatic retry. -->

## Completion contract

- [ ] Each code maps one condition to an exact safe message, protocol behavior, retryability, owner, and state guarantee.
- [ ] Access/existence privacy and sensitive-data redaction are explicit.
- [ ] OpenAPI, API/JOB/INT, SCR/CMP, and tests reference catalog codes consistently.
- [ ] No code duplicates a local exception name or hides multiple unrelated conditions.
