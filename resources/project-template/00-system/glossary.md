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
| Sibling contract file | A second or later file in an interface, schema or transition family, discovered as a first-class artifact whose identity derives from its filename and is permanent once baselined. | A copy, a draft variant, or a versioned duplicate of the canonical file. | The file itself (`WIRE-*`, `SCHEMA-*`, `TRANSITIONS-*`) |
| Platform target | The product-visible consequences of shipping on one platform or channel: constraints, OS permissions, distribution and update behavior, local data. | Build, signing or deployment procedure. | PLT artifact |
| Evidence host token | The `host_os` value a platform target declares as the host its execution evidence is expected to be observed under. | The observed host an execution actually recorded. | PLT artifact |
| Platform coverage | The generated join of platform targets, declaring commands, latest matching executions and observed hosts. | A claim that a platform is proven. | `generated/platform-coverage.md` |
| Foundation coverage | The generated view of which verification specification claims each declared access rule, invariant, error code and UX rule. | A judgement about which level should claim one. | `generated/foundation-coverage.md` |
| Screen coverage | The generated view of where each declared screen action and validation rule ends up: a case, an exclusion handoff, or an open question. | A claim that the behavior is correct. | `generated/screen-coverage.md` |
| Implementation coverage | The generated per-feature join of design and specification mappings, latest executions per level and the unmapped complement, present once implementation sources are configured. | A claim that mapped code is correct. | `generated/implementation-coverage.md` |
| Work packet | The generated per-feature join of its closure in dependency order, mappings, owning contract files, referenced foundation rows, covering specifications and configured commands. | Authority over any artifact it joins. | `generated/implementation-plan/<FTR-ID>.md` |
| Runtime topology | The grouping of subsystems into runtime units, the network boundaries between them and the contracts that cross them. | Deployment, scaling operations or environment inventory. | ARCHITECTURE-OVERVIEW |
| Area | The segment between an ID's type prefix and its number, grouping artifacts by product area; optionally registered in `sdlc.config.yaml`. | A status, an owner or a delivery phase. | `sdlc.config.yaml` when registered |
| Checkpoint | A point inside a flow where the author may take the turn back — behavior, design, tests, implementation, baseline. | A lifecycle stage or an approval gate. | Active flow state |
| Supersession | Explicit transfer of authority to a new stable ID while retaining history. | Editing history or deleting an obsolete file. | ARTIFACT-LIFECYCLE |

## Acronyms

| Acronym | Expansion | Artifact use |
|---|---|---|
| ADR | Architectural Decision Record | Durable architectural choice and consequences. |
| API | Application Programming Interface | Any invocable operation — HTTP, IPC or command line — with OpenAPI authoritative for HTTP only. |
| CMP | Component | Reused interaction contract with real consumers. |
| ENT | Entity | Domain identity, state, invariants and declared persistence authority. |
| EVT | Event | Versioned event envelope, delivery and consumers. |
| FTR | Feature | Outcome, behavior, rules and acceptance criteria. |
| INT | Integration | External provider contract, reliability and secret boundary. |
| JOB | Job | Durable or scheduled processing and retry behavior. |
| PLT | Platform Target | Platform constraints, permissions, distribution and local data. |
| SCR | Screen | A stable user-facing surface, window or not, including a tray or menu-bar surface. |
| SUB | Subsystem | Non-trivial capability boundary and implementation mapping. |
| UC | Use Case | Actor-system main, alternate and error paths. |
| ICP | Ideal Customer Profile | Evidence-backed customer segment. |
| IT | Integration Test | Verification across a meaningful technical boundary. |
| ST | System Test | Externally observable product scenario verification. |
| UT | Unit Test | Isolated behavior verification. |
| UX | User Experience | Shared interaction, feedback, accessibility, and content rules. |

## Naming rules

| Local ID | Rule | Applies to |
|---|---|---|
| NR-01 | Use the exact canonical term in artifact titles, headings, tables, and references when the glossary defines it. | Every artifact |
| NR-02 | Add project-specific domain terms as rows with a precise meaning, exclusions, and owning artifact before using ambiguous synonyms. | This glossary |
| NR-03 | IDs remain stable even if a title changes; never encode status or assignment in an ID. | Every permanent ID |
| NR-04 | Local IDs are meaningful only within their owning artifact unless referenced as `<artifact ID>#<local ID>`. | Every local ID and reference |
| NR-05 | The AREA segment between an ID's type prefix and its number groups artifacts by product area; when `sdlc.config.yaml` declares an `areas` registry, every new ID uses a registered area. | Every new ID |
<!-- The Canonical terms and Acronyms tables above need no local ID: the term is its own identifier, and a reference cites the term itself. These rules are different — a review cites the rule an artifact broke, so each one carries an ID. -->

## Completion contract

- [x] Core authority, lifecycle, evidence, product, design, and verification terms are disambiguated.
- [x] Acronyms used by canonical artifacts are expanded.
- [x] Naming and local-ID reference rules are explicit.
