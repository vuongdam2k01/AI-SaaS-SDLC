---
id: TEST-POLICY
artifact_type: test_policy
title: Verification test policy
status: draft
created_by_change: GENESIS
depends_on: [PRODUCT-REQUIREMENTS, QUALITY-REQUIREMENTS, SYSTEM-INVARIANTS]
decisions: []
supersedes:
---

# Verification test policy

<!-- Owns allocation and evidence rules for exactly three test levels: unit, integration, and system. Scalable UT/IT/ST specs own case intent; executable tests own execution; RESULT artifacts own actual evidence. -->

## Authority boundary

- Test levels express the boundary actually exercised, not team ownership, tool choice, or speed.
- A test may support multiple criteria but must not claim a boundary replaced by a controlled substitute.
- Generated coverage percentages alone do not prove product criteria, access, invariants, or failure semantics.

## Test levels

| Level | Boundary | Required coverage | Explicit exclusions | Evidence |
|---|---|---|---|---|
| UT | One production unit with direct collaborators controlled | Local rules, branches, validation, states, errors, and unchanged-state behavior | Real persistence/protocol/provider and cross-surface outcomes | Assertions mapped to UT spec case IDs |
| IT | One meaningful collaboration boundary with claim-critical participants real | Schema/protocol/data/event/job/integration interaction, atomicity, concurrency, and boundary failures | Full actor journey and unrelated boundaries | Assertions mapped to IT spec case IDs |
| ST | Externally observable product scenario across required surfaces | Actor goal, main/alternate/error paths, access, visible outcome, and final business state | Isolated internal branch detail better proven below | Assertions mapped to ST spec case IDs |

## Test allocation rules

| Local ID | Rule | Applies to | Observable consequence |
|---|---|---|---|
| TP-01 | Map each FTR acceptance criterion and material UC/FLOW branch to the lowest level that can truthfully exercise the claim. | <every AC and branch> | <the level named in the spec that claims it> |
| TP-02 | Unit exclusions name an IT or ST handoff when the excluded behavior remains required. | <every UT EX row> | <the receiving specification> |
| TP-03 | Access denial, validation, duplicate or concurrency, partial failure, unchanged state, and recovery are allocated where applicable. | <every applicable behavior> | <a case at the allocated level> |
| TP-04 | Quality requirements identify measure, conditions, and appropriate UT/IT/ST evidence without inventing another test level. | <every Q row> | <the case carrying the measure> |

## Evidence and result rules

| Local ID | Rule | Applies to | Observable consequence |
|---|---|---|---|
| TP-05 | Every authored test case has a stable TC ID and executable test path and name mapping. | <every spec> | <the Implementation mapping row> |
| TP-06 | Only actual execution creates a RESULT artifact; content generation never pre-populates pass or fail evidence. | <every result> | <an EXEC record behind every RESULT> |
| TP-07 | Result provenance includes revision, command, toolchain, timestamps, environment fingerprint, per-case outcomes, and sanitized diagnostic references. | <every result> | <the provenance fields present> |
| TP-08 | Failed or missing cases remain visible; summaries reconcile with case rows. | <every result> | <aggregate matching the case rows> |
| TP-09 | An execution proves the platform it ran on. When the product ships on more than one platform, declare which platform targets each verification command produces evidence for (`platforms:` in `sdlc.config.yaml`); the declaration and the observed host appear in each RESULT's provenance, and a shipped platform no command declares is recorded here as unproven. | <multi-platform products> | <declaration beside observed host> |

## Data and isolation rules

| Local ID | Rule | Applies to | Observable consequence |
|---|---|---|---|
| TP-10 | Use the smallest meaningful dataset that preserves domain, ownership, and boundary semantics. | <every case> | <the stated data requirement> |
| TP-11 | Cases are independent through explicit reset, unique keys, transaction rollback, or deterministic cleanup. | <every case> | <a suite that passes in any order> |
| TP-12 | Controlled substitutes preserve the collaborator contract and never bypass the behavior being proved. | <every controlled boundary> | <what the substitute must still enforce> |
| TP-13 | Sensitive production data, credentials, and fabricated evidence are prohibited. | <every case and record> | <what must never appear in a fixture> |
<!-- A controlled test seam that weakens a stated invariant or access rule is recorded here beside what it exists to test, never left as a silent property of the shipped build. -->

## Completion contract

- [ ] Exactly UT, IT, and ST boundaries and exclusions are defined.
- [ ] Every acceptance/rule/branch has truthful level allocation and traceability.
- [ ] Unit exclusions have explicit IT/ST handoff where required.
- [ ] Executable mappings, actual result provenance, isolation, cleanup, and sensitive-data rules are complete.
