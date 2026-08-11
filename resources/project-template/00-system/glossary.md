---
id: GLOSSARY
artifact_type: glossary
title: Canonical terminology
status: active
created_by_change: GENESIS
depends_on: [DOCUMENT-RULES]
decisions: []
supersedes:
---

# Canonical terminology

## Canonical terms

| Term | Meaning | Not to be confused with | Owning artifact |
|---|---|---|---|
| Artifact | Versioned project contract or generated evidence with a stable identity. | Any informal file or note. | DOCUMENT-RULES |
| Authority | The single artifact permitted to define a normative fact. | A downstream summary or test observation. | DOCUMENT-RULES |
| Applicability | Explicit conditions under which a rule or claim governs. | Priority or probability. | Owning artifact |
| Completion contract | Content conditions required before an authored artifact may be active. | A procedural approval gate. | ARTIFACT-LIFECYCLE |
| Evidence | Dated observation with a traceable source and bounded applicability. | Inference, assumption, or generated prose. | EVIDENCE-LEDGER |
| Inference | Conclusion derived from evidence and visibly labeled as such. | Directly observed fact. | EVIDENCE-LEDGER |
| Invariant | Condition that must remain true throughout its declared scope. | A preferred behavior or UI message. | SYSTEM-INVARIANTS |
| Acceptance criterion | Stable, observable pass/fail condition local to a feature. | A test implementation or broad requirement. | Feature artifact |
| Test specification | Authored intent defining what executable evidence must prove. | An execution result. | UT/IT/ST artifact |
| Test result | Immutable engine projection of an actual test execution. | Test intent or manually written status. | RESULT artifact |
| Wire contract | Protocol path, parameter, payload, and response shape. | Internal processing algorithm. | Owning interface file (OpenAPI by default) |
| Domain entity | Semantic model of an identity-bearing domain concept. | A physical table or API schema. | ENT artifact |
| Physical schema | Tables, columns, indexes, and relationships used for persistence. | Domain meaning or wire representation. | Owning `.dbml` file (one per database) |
| Persistence authority | The declared owner of an entity's physical shape: a schema file, a platform-target local store, or an explicit none. | Wire representation or domain meaning. | ENT artifact |
| Supersession | Explicit transfer of authority to a new stable ID while retaining history. | Editing history or deleting an obsolete file. | ARTIFACT-LIFECYCLE |

## Acronyms

| Acronym | Expansion | Artifact use |
|---|---|---|
| ADR | Architectural Decision Record | Durable architectural choice and consequences. |
| API | Application Programming Interface | OpenAPI wire contract plus API-processing design. |
| ICP | Ideal Customer Profile | Evidence-backed customer segment. |
| IT | Integration Test | Verification across a meaningful technical boundary. |
| ST | System Test | Externally observable product scenario verification. |
| UT | Unit Test | Isolated behavior verification. |
| UX | User Experience | Shared interaction, feedback, accessibility, and content rules. |

## Naming rules

- Use the exact canonical term in artifact titles, headings, tables, and references when the glossary defines it.
- Add project-specific domain terms as rows with a precise meaning, exclusions, and owning artifact before using ambiguous synonyms.
- IDs remain stable even if a title changes; never encode status or assignment in an ID.
- Local IDs are meaningful only within their owning artifact unless referenced as `<artifact ID>#<local ID>`.
- The AREA segment between an ID's type prefix and its number groups artifacts by product area; when `sdlc.config.yaml` declares an `areas` registry, every new ID uses a registered area.

## Completion contract

- [x] Core authority, lifecycle, evidence, product, design, and verification terms are disambiguated.
- [x] Acronyms used by canonical artifacts are expanded.
- [x] Naming and local-ID reference rules are explicit.
