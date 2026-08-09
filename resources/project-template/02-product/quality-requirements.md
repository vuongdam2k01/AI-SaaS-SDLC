---
id: QUALITY-REQUIREMENTS
artifact_type: quality_requirements
title: Quality requirements
status: draft
created_by_change: GENESIS
depends_on: [PRODUCT-REQUIREMENTS, FEASIBILITY-AND-RISK]
decisions: []
supersedes:
---

# Quality requirements

<!-- Owns measurable cross-cutting product qualities and Q IDs. Architecture/design own mechanisms; test policy/specs own evidence allocation. Avoid unsupported targets. -->

## Quality scope

| Quality attribute | Applicable actors/capabilities | Why material | Source/risk IDs | Explicit non-scope |
|---|---|---|---|---|
<!-- Include only relevant attributes such as accessibility, security, privacy, reliability, performance, maintainability, or interoperability. -->

## Quality requirements

| Quality ID | Attribute | Requirement | Measure | Applicability | Verification |
|---|---|---|---|---|---|
<!-- Use Q-001 onward. Include threshold, unit, observation window/conditions, percentile or sample semantics where needed. -->

## Measurement and evidence

| Quality ID | Observation point | Data/evidence source | Calculation | Pass/fail interpretation | Limitations |
|---|---|---|---|---|---|
<!-- State how evidence can be produced without defining unavailable monitoring or operational procedure. -->

## Tradeoffs and boundaries

| Competing qualities | Chosen constraint | Rationale/source | ADR needed | Revisit condition |
|---|---|---|---|---|
<!-- Material durable architecture choices link to ADRs; do not hide tradeoffs inside prose. -->

## Completion contract

- [ ] Every quality row has a stable ID, applicability, measurable threshold/unit, and verification method.
- [ ] Targets trace to opportunity, risk, product, or decision authority rather than aspiration alone.
- [ ] Measurement conditions and limitations prevent misleading evidence.
- [ ] Architecture mechanisms and executable test detail remain downstream.
