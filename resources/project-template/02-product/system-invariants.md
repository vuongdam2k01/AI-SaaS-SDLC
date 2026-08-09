---
id: SYSTEM-INVARIANTS
artifact_type: system_invariants
title: System invariants
status: draft
created_by_change: GENESIS
depends_on: [PRODUCT-REQUIREMENTS, ACCESS-CONTROL, QUALITY-REQUIREMENTS]
decisions: []
supersedes:
---

# System invariants

<!-- Single authority for cross-cutting conditions that must always hold. Feature-specific rules stay in FTR artifacts; entity-local invariants may be detailed in ENT artifacts while referencing these IDs. -->

## Authority boundary

- Owns: invariant statement, applicability, enforcement ownership, observable violation, and verification obligation.
- Does not own: implementation mechanism, database syntax, API response shape, or test code.
- An invariant is always true within scope; a preferred outcome or eventual target is not an invariant.

## Invariants

| Invariant ID | Statement | Applicability | Enforcement owner | Observable violation | Verification |
|---|---|---|---|---|---|
<!-- Use INV-001 onward. Phrase each row as a testable condition and name tenant/ownership/transaction/state scope. -->

## Enforcement and observation

| Invariant ID | Preventive enforcement points | Detection points | Error code | Evidence source |
|---|---|---|---|---|
<!-- Defense in depth may list multiple points; one point remains accountable for authoritative enforcement. -->

## Failure semantics

| Invariant ID | Attempted violation | Required response | State guarantee | Recovery/reconciliation |
|---|---|---|---|---|
<!-- No partial state or silent correction unless the invariant explicitly permits and defines it. -->

## Completion contract

- [ ] Every invariant is testable, scoped, and distinct from a preference or future target.
- [ ] Enforcement owner, detection, error response, and state guarantee are explicit.
- [ ] Product, design, data, access, and verification artifacts reference invariant IDs consistently.
- [ ] Implementation mechanisms remain mapped in downstream design contracts.
