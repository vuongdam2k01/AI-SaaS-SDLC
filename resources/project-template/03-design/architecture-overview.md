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

<!-- Owns system context, architectural boundaries, responsibility allocation, high-level flows, cross-cutting constraints, and the runtime topology. Detailed APIs, entities, jobs, events, integrations, screens, and decisions remain separate authorities. -->

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

## Runtime topology

| Runtime unit | Grouped subsystems | Network boundary | Crossing contracts | Failure and scaling boundary |
|---|---|---|---|---|
<!-- Group SUB-* into the processes and installables they run in. Name each network boundary and the API/EVT/interface contracts crossing it, and state what fails and scales together. Descriptive design truth only: build, signing and deployment operations stay out of scope. A single-process product states its one unit explicitly. -->

## Decision references

| ADR ID | Decision summary | Affected boundaries | Required consequences | Verification obligation |
|---|---|---|---|---|
<!-- Accepted ADRs only are authoritative. Proposed ADRs remain visible but cannot govern implementation. -->

## Engineering profile

| Dimension | Choice | Evidence in the codebase |
|---|---|---|
<!-- Filled by the flow that wires implementation sources, from what the codebase itself evidences; empty until then. Rows: language and runtime, framework(s), package manager, repository layout map (which top-level directories own what), test framework per level (UT/IT/ST), migration tool, build entry points, convention source (linter/formatter config) — and one row per commodity solution class the code touches: HTTP serving and routing, validation, form handling, styling and design-token plumbing, animation, state management, data fetching, background jobs and scheduling, auth/session mechanics, and peers. A solution-class row records the rung of the solution ladder the code stands on: an adopted library, a stdlib or native-platform choice with its revisit condition ("node:http — revisit when route count or middleware needs grow"), or an explicit refusal ("none — hand-rolled because X; revisit when Y"). A commodity concern implemented by hand with no row is an unrecorded decision the implementation review reports. The direction is the ladder — reuse, then stdlib, then native platform, then installed dependency, then a recorded decision — never a doctrine in either direction. Descriptive substrate truth only — the stack the code actually runs on, so an implementer reads it here instead of inferring it per segment. Deployment, hosting and CI stay out of scope. A choice worth deliberating (two viable options, expensive to reverse) still earns an ADR; this table records what is, not why. -->

## Completion contract

- [ ] Context, trust/data boundaries, responsibilities, dependencies, and ownership are non-overlapping.
- [ ] Runtime units group every live subsystem, and every contract crossing a network boundary is named.
- [ ] High-level flows reference detailed interface/data/processing authorities.
- [ ] Every active requirement, quality rule, access rule, and invariant has an architectural home.
- [ ] Durable choices link accepted ADRs and all responsibilities map to implementation/verification.
