---
id: ARTIFACT-LIFECYCLE
artifact_type: artifact_lifecycle
title: Artifact lifecycle
status: active
created_by_change: GENESIS
depends_on: [DOCUMENT-RULES]
decisions: []
supersedes:
---

# Artifact lifecycle

## Lifecycle states

| State | Meaning | Content obligation | Allowed consumers |
|---|---|---|---|
| `draft` | Contract is incomplete or still contains explicit guidance/unknowns. | Required structure exists; gaps are visible; no claim of completion. | Research, authoring, validation diagnostics; not implementation authority. |
| `active` | Contract is complete enough to govern downstream work. | No placeholders; required sections/tables populated; dependencies resolve; completion contract satisfied. | All downstream consumers. |
| `resolved` | An issue or question has a recorded outcome and evidence. | Resolution artifact and affected closure are linked; issue evidence is actual. | Historical traceability and regression consumers. |
| `superseded` | A newer artifact owns the subject. | Replacement ID and reason are recorded; content remains immutable history. | Historical interpretation only. |
| `proposed` | An ADR presents a complete choice awaiting acceptance. | Question, drivers, options, consequences, and affected scope are concrete. | Decision evaluation only. |
| `accepted` | An ADR is authoritative. | Selected option and consequences are stable and referenced downstream. | Architecture, design, implementation, and verification. |
| `rejected` | An ADR option set was considered but not adopted. | Rejection rationale remains recorded. | Historical context only. |
| `generated` | Engine created immutable execution evidence. | Provenance and observed result reconcile with runner output. | Closure, issue, and audit consumers; never normative design. |

## Allowed transitions

- General authored artifacts: `draft -> active -> superseded`.
- Issues and questions: `open -> resolved`; recurrence returns the same issue to `open` only when identity and expected authority are unchanged.
- Decisions: `proposed -> accepted | rejected`; accepted decisions may become `superseded` through a replacement ADR.
- Results are created as `generated` and never transition or mutate.
- An artifact may remain `draft`; time alone does not promote it.

## State semantics

- `active` is a content assertion, not an approval ceremony. Validators check the structural and semantic claim.
- Missing evidence, unresolved authority conflicts, placeholder content, or incomplete required rows keep an artifact `draft`.
- A downstream artifact cannot treat a `draft`, `proposed`, `rejected`, or `superseded` artifact as current authority.
- Status does not encode priority, delivery timing, assignment, or confidence. Those belong in the relevant contract fields.

## Supersession

1. Create a new artifact when meaning or identity changes materially.
2. Set the new artifact's `supersedes` to the old ID and mark the old artifact `superseded` with a replacement reference.
3. Update current downstream references to the new ID without deleting historical evidence.
4. Do not reuse the old ID, merge distinct histories, or use supersession to hide an unresolved defect.

## Completion contract

- [x] Each state has one semantic meaning and content obligation.
- [x] Transition families cover authored artifacts, issues/questions, ADRs, and generated results.
- [x] Active status is tied to concrete content rather than procedure.
- [x] Supersession preserves history and one current authority.
