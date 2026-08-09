---
id: DOCUMENT-RULES
artifact_type: document_rules
title: Document authority and writing rules
status: active
created_by_change: GENESIS
depends_on: []
decisions: []
supersedes:
---

# Document authority and writing rules

## Authority boundaries

- Each fact has one owning artifact. Other artifacts reference its ID or stable local ID instead of restating it.
- Product artifacts own observable behavior; design artifacts own realization contracts; verification specs own test intent; result artifacts own observed execution evidence.
- `03-design/interfaces/openapi.yaml` owns HTTP wire shape. `03-design/data/schema.dbml` owns physical data shape. `03-design/screen-transitions.mmd` owns the screen-transition graph.
- Shared rules live in `00-system`, `02-product`, or the applicable design singleton. Scalable artifacts may specialize them only through an explicit applicability rule or ADR.
- A generated result, summary, or pinned snapshot never becomes normative authority.

## Required frontmatter

Every Markdown artifact has YAML frontmatter with:

| Field | Contract |
|---|---|
| `id` | Stable, unique project ID matching the artifact catalog or fixed ID. |
| `artifact_type` | Canonical type; exactly one authority family. |
| `title` | Concise human-readable subject. |
| `status` | Valid lifecycle state from ARTIFACT-LIFECYCLE. |
| `created_by_change` | Change ID that first created the artifact. |
| `depends_on` | Existing upstream artifact IDs required to interpret this artifact. |
| `decisions` | ADR IDs that constrain content. |
| `supersedes` | One prior artifact ID or null; never an array. |

Design and verification artifacts add `implementation` when code/test mapping is meaningful. Data-writing designs add `writes_to` using authoritative entity/table identifiers.

## Content rules

- Use English, precise domain language, observable conditions, explicit units, and exact error/state semantics.
- Assign stable local IDs to repeated rules, steps, fields, cases, decisions, and criteria. References use `<artifact ID>#<local ID>` where ambiguity is possible.
- Put guidance and examples inside HTML comments. Active artifacts contain concrete project content and no angle-bracket placeholders, empty required sections, unchecked completion items, or unresolved template tokens.
- Separate observation, inference, decision, and evidence. Never present an assumption as an observed fact.
- Use tables for repeated records with the catalog-defined column order. Add rows rather than creating sibling summary files.
- Record exclusions and applicability wherever a reader could otherwise overgeneralize a rule.

## Cross-reference rules

- `depends_on` contains direct semantic prerequisites, not every reachable ancestor.
- Downstream links belong in traceability/mapping sections and must resolve to an artifact, path, operationId, schema symbol, or local ID.
- Circular normative dependencies are invalid. A mutual informational relationship must still name one authority per fact.
- Supersession is explicit and historical files remain readable; never overwrite an old ID with a different meaning.
- When a change affects behavior, design, implementation, and tests, all affected authorities are updated together and linked by the change ID.

## Completion contract

- [x] Authority rules distinguish behavior, design, interfaces, data, verification intent, and result evidence.
- [x] Frontmatter and reference syntax are deterministic.
- [x] Active-content, evidence, applicability, and placeholder rules are explicit.
- [x] Fixed and scalable artifacts use the same lifecycle and traceability semantics.
