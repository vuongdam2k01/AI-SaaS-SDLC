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

Every artifact carries exactly one `status`. Authored artifacts use the first five values; issues use the last two and no others. No other value validates.

| State | Applies to | Meaning | Content obligation | Allowed consumers |
|---|---|---|---|---|
| `draft` | Authored artifacts | Contract is incomplete or still contains explicit guidance/unknowns. | Required structure exists; gaps are visible; no claim of completion. | Research, authoring, validation diagnostics; not implementation authority. |
| `active` | Authored artifacts | Contract is complete enough to govern downstream work. | No placeholders; required sections/tables populated; dependencies resolve; completion contract satisfied. | All downstream consumers. |
| `deprecated` | Authored artifacts | Still current authority, but a replacement is intended. | Content stays accurate; the intended direction is recorded. | All downstream consumers, with the direction visible. |
| `retired` | Authored artifacts | The subject no longer exists in the product. | Content remains immutable history; no successor is claimed. | Historical interpretation only. |
| `superseded` | Authored artifacts | A newer artifact owns the subject. | Replacement ID and reason are recorded; content remains immutable history. | Historical interpretation only. |
| `open` | Issues | A concrete mismatch is recorded and unrepaired. | Observation, expected versus observed, and affected IDs are concrete. | Repair coordination. |
| `resolved` | Issues | An issue has a recorded outcome and evidence. | Repair and regression evidence are linked; evidence is actual. | Historical traceability and regression consumers. |

A decision carries a second field, `adr_status`, independent of the lifecycle above: `proposed`, `accepted`, `deprecated` or `superseded`. There is no `rejected` state — a choice not taken is recorded as a rejected option inside the ADR that made the decision. Engine-rendered results (`RESULT-*`) are written `active` and are immutable; they are never authored or edited.

## Allowed transitions

<!-- Prose by design, like State semantics and Supersession below. Every rule in these three sections is executed by the engine — status transitions, lifecycle dependency, immutability and supersession edges are validated in code — so the code is the authority a violation is reported against. A local ID here would be a second copy of that authority, drifting the moment either side changed. The Lifecycle states table above is already identified: the state name is its own ID. -->

- Authored artifacts: `draft -> active`, then `deprecated`, `retired` or `superseded` as the subject's fate requires.
- Issues: `open -> resolved`; recurrence returns the same issue to `open` only when identity and expected authority are unchanged.
- Decisions: `adr_status` moves `proposed -> accepted`, then `deprecated` or `superseded` through a replacement ADR. An accepted ADR's own `status` stays `active` permanently, because accepted content is immutable; the superseded-by edge is derived into the generated decision index rather than written back into the accepted file.
- Results are created `active` by the engine and never transition or mutate.
- An artifact may remain `draft`; time alone does not promote it. But a flow that substantively fills an artifact promotes it in that same flow: satisfy the completion contract and set `active`. A filled-but-`draft` foundation governs downstream work while sitting outside every active-content contract, so nothing checks the rules it states — and a `draft` artifact created by the flow's own change blocks that flow's baseline.

## State semantics

- `active` is a content assertion, not an approval ceremony. Validators check the structural and semantic claim.
- Missing evidence, unresolved authority conflicts, placeholder content, or incomplete required rows keep an artifact `draft`.
- A downstream artifact cannot treat a `draft`, `retired` or `superseded` artifact, or one whose `adr_status` is still `proposed`, as current authority.
- Status does not encode priority, delivery timing, assignment, or confidence. Those belong in the relevant contract fields.

## Supersession

1. Create a new artifact when meaning or identity changes materially.
2. Set the new artifact's `supersedes` to the old ID and mark the old artifact `superseded` with a replacement reference.
3. Update current downstream references to the new ID without deleting historical evidence.
4. Do not reuse the old ID, merge distinct histories, or use supersession to hide an unresolved defect.

## Completion contract

- [x] Each state has one semantic meaning and content obligation, and the set matches what the engine accepts.
- [x] Transition families cover authored artifacts, issues, ADR decision state, and engine-rendered results.
- [x] Active status is tied to concrete content rather than procedure.
- [x] Supersession preserves history and one current authority.
