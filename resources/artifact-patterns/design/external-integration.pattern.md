---
id: {{ID}}
artifact_type: external_integration
title: {{TITLE}}
status: draft
created_by_change: {{CREATED_BY_CHANGE}}
depends_on: [ARCHITECTURE-OVERVIEW, ERROR-CATALOG]
decisions: []
writes_to: []
implementation: []
supersedes:
---

# {{ID}} — {{TITLE}}

<!-- Contract: defines one bounded data or operation exchange with an external provider. It is not provider marketing, internal API processing, secret material, or operational procedure. Create when externally owned availability, authentication, schema, limits, or failure semantics affect product behavior. ID is INT-<AREA>-<NNN>; path is 03-design/integrations/<ID>.md. This artifact owns the internal boundary contract and mapping; cited provider specifications own external facts and ENT/EVT/OpenAPI own internal representations. Consumers: API/JOB/SUB designs, IT/ST specs, and implementation. Detail rule: the consumer is implementing and verifying this boundary with the provider's own documentation open, so state the internal contract — mapping, timeout, retry, degradation, redaction — and cite the provider's facts with their observation date rather than copying its reference material. Lifecycle: draft -> active -> superseded. -->

## Purpose and boundary

- Capability obtained or data exchanged: <purpose>
- Provider and contract reference: <provider/source identifier and observed version/date>
- Included operations: <bounded operations>
- Excluded operations: <scope>

## Provider contract

| External operation or event | Direction | Trigger | Limit or constraint | Internal consumer |
|---|---|---|---|---|
| <operation> | <inbound/outbound> | <condition> | <documented limit> | <API/JOB/SUB ID> |

## Data mapping

| Local ID | Direction | Internal field or event | External field or operation | Transformation | Sensitivity |
|---|---|---|---|---|---|
| M-01 | <direction> | <ENT attribute/EVT field> | <external field> | <normalization/validation> | <classification> |

## Authentication and secret boundary

| Local ID | Concern | Rule | Observable consequence |
|---|---|---|---|
| AU-01 | authentication mechanism | <mechanism, not credential value> | <observable when the mechanism is absent or wrong> |
| AU-02 | credential ownership and storage | <owner and protected location class> | <what must never appear in logs or responses> |
| AU-03 | rotation and expiry | <application-visible semantics only> | <observable at expiry> |
| AU-04 | least-privilege scope | <required scopes> | <observable when a scope is missing> |
| AU-05 | incoming authenticity verification | <signature or trust rule, if applicable> | <response to an unverified caller> |
<!-- Never record credential values here; a row states the rule and what a case can observe, not the secret. -->

## Reliability

| Local ID | Concern | Rule | Observable consequence |
|---|---|---|---|
| RL-01 | timeout | <bounded value and rationale> | <product behavior once the bound elapses> |
| RL-02 | rate-limit behavior | <detection and safe response> | <observable degraded behavior> |
| RL-03 | idempotency and deduplication | <key, scope, and duplicate behavior> | <observable on a repeated exchange> |
| RL-04 | ordering | <guarantee or explicit absence> | <observable out-of-order outcome> |
| RL-05 | consistency expectation | <when internal state may be considered reconciled> | <state a case may assert after reconciliation> |
<!-- Keep one row per concern that applies; state an explicit not-applicable rule rather than deleting a row. -->

## Failure and reconciliation

| Local ID | Failure condition | Detection | State guarantee | Retry or reconciliation | Error code |
|---|---|---|---|---|---|
| F-01 | <condition> | <signal> | <unchanged/partial state rule> | <bounded behavior> | <ERROR code> |

## Observability

| Local ID | Concern | Rule | Observable consequence |
|---|---|---|---|
| OB-01 | structured fields | <correlation ID, provider operation, outcome; exclude sensitive payloads> | <fields a record must carry> |
| OB-02 | metrics | <success/failure/latency/reconciliation signals> | <signal a case or operator can read> |
| OB-03 | audit events | <security- or business-relevant record> | <event a case can assert was written> |
| OB-04 | redaction rules | <fields never recorded> | <fields a case asserts absent from any record> |
<!-- Redaction rows are negative expectations: a case proves the field is absent, not that logging happened. -->

## Completion contract

- [ ] Provider facts cite versioned or dated sources and applicability.
- [ ] Every exchanged field maps to an internal authority and sensitivity class.
- [ ] Authentication is specified without embedding secrets.
- [ ] Timeouts, limits, idempotency, failure, state guarantees, and reconciliation are deterministic.
- [ ] IT/ST and implementation mappings exercise the real boundary where required.
