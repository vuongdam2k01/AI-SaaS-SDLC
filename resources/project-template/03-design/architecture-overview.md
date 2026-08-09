---
id: ARCHITECTURE-OVERVIEW
artifact_type: architecture_overview
title: Architecture overview
status: draft
created_by_change: GENESIS
depends_on: [PRODUCT-REQUIREMENTS, QUALITY-REQUIREMENTS, ACCESS-CONTROL, SYSTEM-INVARIANTS]
decisions: []
implementation: []
supersedes:
---

# Architecture overview

<!-- Owns system context, architectural boundaries, responsibility allocation, high-level flows, and cross-cutting constraints. Detailed APIs, entities, jobs, events, integrations, screens, and decisions remain separate authorities. -->

## System context

| Actor/external system | Need or exchanged capability | Trust/data boundary | Entry interface | Evidence/requirement IDs |
|---|---|---|---|---|
<!-- Include only actors and external systems required by active scope. -->

## Architectural boundaries

| Boundary/SUB ID | Inside | Outside | Owned data | Public contracts | Rationale/ADR |
|---|---|---|---|---|---|
<!-- Boundaries should minimize overlapping responsibility and make failure/data ownership explicit. -->

## Component responsibilities

| Component/subsystem | Responsibilities | Non-responsibilities | Dependencies | Quality/invariant constraints |
|---|---|---|---|---|
<!-- Map responsibilities to scalable SUB and detailed design artifacts when created. -->

## Data and control flow

1. <!-- Name an initiating actor/event, authoritative interface, processing boundary, state transition, and observable result. -->
2. <!-- Link OpenAPI operationId, ENT/DBML, EVT/JOB/INT, and error behavior rather than duplicating them. -->

## Cross-cutting constraints

| Concern | Governing IDs | Architectural constraint | Enforcement owner | Verification |
|---|---|---|---|---|
<!-- Cover access/tenancy, privacy, reliability, accessibility, error semantics, and quality only as applicable. -->

## Decision references

| ADR ID | Decision summary | Affected boundaries | Required consequences | Verification obligation |
|---|---|---|---|---|
<!-- Accepted ADRs only are authoritative. Proposed ADRs remain visible but cannot govern implementation. -->

## Completion contract

- [ ] Context, trust/data boundaries, responsibilities, dependencies, and ownership are non-overlapping.
- [ ] High-level flows reference detailed interface/data/processing authorities.
- [ ] Every active requirement, quality rule, access rule, and invariant has an architectural home.
- [ ] Durable choices link accepted ADRs and all responsibilities map to implementation/verification.
