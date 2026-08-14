---
id: {{ID}}
artifact_type: api_processing
title: {{TITLE}}
status: draft
created_by_change: {{CREATED_BY_CHANGE}}
depends_on: [ARCHITECTURE-OVERVIEW, ACCESS-CONTROL, ERROR-CATALOG]
decisions: []
writes_to: []
implementation: []
supersedes:
---

# {{ID}} — {{TITLE}}

<!-- Contract: specifies processing behind one invocable operation or tightly coupled operation set — an OpenAPI operation, an IPC or bridge command, or a CLI entry. For an HTTP operation it does not own paths, parameters, payload schemas, or response schemas; OpenAPI is authoritative for those. For a non-HTTP operation this document owns the full invocation contract, including payload shape, because no wire authority exists elsewhere. Create when an operation needs explicit authorization, validation, processing, transaction, idempotency, side-effect, or implementation semantics. ID is API-<AREA>-<NNN>; path is 03-design/interfaces/<ID>.md. Upstream: FTR/UC, access, invariants, errors, OpenAPI, entities, and ADRs. Consumers: screens, components, UT-API, IT, ST, and implementation. Detail rule: the consumer is implementing and verifying this operation with the owning interface file open, so state authorization order, processing sequence, transaction and side-effect semantics, and never restate a path, parameter, status code or response field the wire authority already holds. Lifecycle: draft -> active -> superseded. -->

## Purpose and boundary

- Processing responsibility: <single cohesive responsibility>
- Included operation IDs: <OpenAPI operationId values>
- Excluded responsibilities: <other processing or transport ownership>
- Invoked by: <SCR action, UC step, integration, or subsystem IDs>

## Interface reference

| Operation identity | Invocation kind and address | Request shape | Success shape | Error codes |
|---|---|---|---|---|
| <operationId, command name, or CLI entry> | <HTTP method path, IPC/bridge channel, or CLI invocation> | <schema ref for HTTP; declared payload for other kinds> | <schema ref or declared result> | <ERROR codes> |

- Wire authority: `03-design/interfaces/openapi.yaml` for HTTP operations; this document for every other invocation kind.
- Conflict rule: update OpenAPI for HTTP wire changes and never redefine those fields here; a non-HTTP operation declares its request and result shape in this table.

## Authorization

| Access rule ID | Subject | Resource scope | Decision point | Denied behavior |
|---|---|---|---|---|
| <ACCESS ID> | <authenticated subject> | <tenant/ownership scope> | <before state access or mutation> | <ERROR code and no-state-change guarantee> |

## Validation and errors

| Local ID | Condition | Validation or rule | Error-catalog code | State guarantee |
|---|---|---|---|---|
| V-01 | <condition> | <deterministic check> | <ERROR code> | <unchanged or explicit state> |

## Processing

| Local ID | Step | Input | Rule or dependency | Output |
|---|---|---|---|---|
| P-01 | <processing step> | <validated value/state> | <BR/INV/ENT/INT reference> | <value/state> |

## Transactions and idempotency

| Local ID | Concern | Rule | Applies to | Observable consequence |
|---|---|---|---|---|
| TX-01 | transaction boundary | <first and last P/S IDs; commit condition> | <P/S IDs> | <what a failed commit leaves behind> |
| TX-02 | rollback guarantee | <state after failure> | <P/S IDs> | <state a case can assert> |
| TX-03 | idempotency key | <source and uniqueness scope, or explicitly not applicable with reason> | <operation> | <observable on replay> |
| TX-04 | duplicate behavior | <same-result, conflict, or safe no-op semantics> | <operation> | <response and state on second delivery> |
| TX-05 | concurrency behavior | <locking, versioning, or conflict response> | <ENT/P IDs> | <loser's observable outcome> |
<!-- Keep one row per concern that applies; state an explicit not-applicable rule rather than deleting a row, because a silent omission and a deliberate exemption are indistinguishable to a later reader. -->

## Side effects and data access

| Local ID | Type | Target | Operation | Timing | Failure behavior |
|---|---|---|---|---|---|
| S-01 | <read/write/event/integration> | <ENT/EVT/INT/JOB ID> | <operation> | <before/inside/after commit> | <rollback, retry, or reconciliation> |

## Implementation mapping

| Processing or side-effect IDs | Source path | Symbol | Verification IDs |
|---|---|---|---|
| <P/S IDs> | <repository-relative path> | <handler/service symbol> | <UT-API/IT/ST IDs and cases> |

## Completion contract

- [ ] Every HTTP operation maps to an existing OpenAPI operationId without duplicating wire schema, and every non-HTTP operation declares its full invocation contract here.
- [ ] Authorization precedes protected reads and writes and cites access rules.
- [ ] Validation and failure paths use error-catalog codes with state guarantees.
- [ ] Processing order, transaction, idempotency, concurrency, and side effects are deterministic.
- [ ] All writes appear in `writes_to` and map to entity/schema authority and verification.
