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

<!-- Contract: defines one bounded data or operation exchange with an external provider. It is not provider marketing, internal API processing, secret material, or operational procedure. Create when externally owned availability, authentication, schema, limits, or failure semantics affect product behavior. ID is INT-<AREA>-<NNN>; path is 03-design/integrations/<ID>.md. This artifact owns the internal boundary contract and mapping; cited provider specifications own external facts and ENT/EVT/OpenAPI own internal representations. Consumers: API/JOB/SUB designs, IT/ST specs, and implementation. Lifecycle: draft -> active -> superseded. -->

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

- Authentication mechanism: <mechanism, not credential value>
- Credential ownership and storage boundary: <owner and protected location class>
- Rotation/expiry behavior: <application-visible semantics only>
- Least-privilege scope: <required scopes>
- Incoming authenticity verification: <signature or trust rule, if applicable>

## Reliability

- Timeout: <bounded value and rationale>
- Rate-limit behavior: <detection and safe response>
- Idempotency/deduplication: <key, scope, and duplicate behavior>
- Ordering: <guarantee or explicit absence>
- Consistency expectation: <when internal state may be considered reconciled>

## Failure and reconciliation

| Local ID | Failure condition | Detection | State guarantee | Retry or reconciliation | Error code |
|---|---|---|---|---|---|
| F-01 | <condition> | <signal> | <unchanged/partial state rule> | <bounded behavior> | <ERROR code> |

## Observability

- Structured fields: <correlation ID, provider operation, outcome; exclude sensitive payloads>
- Metrics: <success/failure/latency/reconciliation signals>
- Audit events: <security- or business-relevant record>
- Redaction rules: <fields never recorded>

## Completion contract

- [ ] Provider facts cite versioned or dated sources and applicability.
- [ ] Every exchanged field maps to an internal authority and sensitivity class.
- [ ] Authentication is specified without embedding secrets.
- [ ] Timeouts, limits, idempotency, failure, state guarantees, and reconciliation are deterministic.
- [ ] IT/ST and implementation mappings exercise the real boundary where required.
