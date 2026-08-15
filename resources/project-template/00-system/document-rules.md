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

| Local ID | Rule | Applies to |
|---|---|---|
| DR-01 | Each fact has one owning artifact. Other artifacts reference its ID or stable local ID instead of restating it. | Every artifact |
| DR-02 | Product artifacts own observable behavior; design artifacts own realization contracts; verification specs own test intent; result artifacts own observed execution evidence. | Layer boundaries |
| DR-03 | Each interface file under `03-design/interfaces/` owns the HTTP wire shape of one surface, each `03-design/data/*.dbml` file owns the physical shape of one database, and each `03-design/*.mmd` file owns one screen-transition graph. `openapi.yaml`, `schema.dbml` and `screen-transitions.mmd` are the mandatory defaults; sibling files are first-class discovered contracts, and in a multi-file family each design artifact names its owning file in `depends_on`. | Contract files |
| DR-04 | Shared rules live in `00-system`, `02-product`, or the applicable design singleton. Scalable artifacts may specialize them only through an explicit applicability rule or ADR. | Shared rules |
| DR-05 | A generated result, summary, or pinned snapshot never becomes normative authority. | `generated/` and pinned snapshots |
<!-- These rules are applied by whoever writes or reviews an artifact, so each carries an ID a finding can cite. The frontmatter table below needs none: the field name is its own identifier, and the engine enforces the field set in code. -->

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

Three fields belong to one artifact family each and are accepted nowhere else: `adr_status` on a decision (`proposed`, `accepted`, `deprecated` or `superseded`, independent of the artifact's own `status`); `host_os` on a platform target (the lowercase `process.platform` token its execution evidence is expected to be observed under); and `execution_id` on an engine-rendered result. No other frontmatter field is accepted — an unknown field is a validation error, not a private extension point.

## Content rules

| Local ID | Rule | Applies to |
|---|---|---|
| DR-06 | Use English, precise domain language, observable conditions, explicit units, and exact error and state semantics. | Every artifact |
| DR-07 | Assign stable local IDs to repeated rules, steps, fields, cases, decisions, and criteria. References use `<artifact ID>#<local ID>` where ambiguity is possible. | Repeated records |
| DR-08 | Put guidance and examples inside HTML comments. Active artifacts contain concrete project content and no angle-bracket placeholders, empty required sections, unchecked completion items, or unresolved template tokens. | Active artifacts |
| DR-09 | Separate observation, inference, decision, and evidence. Never present an assumption as an observed fact. | Evidence-bearing artifacts |
| DR-10 | Use tables for repeated records with the catalog-defined column order. Add rows rather than creating sibling summary files. | Repeated records |
| DR-11 | Record exclusions and applicability wherever a reader could otherwise overgeneralize a rule. | Every stated rule |

## Cross-reference rules

| Local ID | Rule | Applies to |
|---|---|---|
| DR-12 | `depends_on` contains direct semantic prerequisites, not every reachable ancestor. A specification proving another artifact's rule declares that artifact, or the closure cannot reach it — machine-checked as `CLAIM_WITHOUT_DEPENDENCY`. | Frontmatter |
| DR-13 | Downstream links belong in traceability and mapping sections and must resolve to an artifact, path, operationId, schema symbol, or local ID. | Traceability sections |
| DR-14 | Circular normative dependencies are invalid. A mutual informational relationship must still name one authority per fact. | Dependency edges |
| DR-15 | Supersession is explicit and historical files remain readable; never overwrite an old ID with a different meaning. | Supersession |
| DR-16 | When a change affects behavior, design, implementation, and tests, all affected authorities are updated together and linked by the change ID. What the change put in question and did not update carries a recorded decision instead — machine-checked as `IMPACT_UNCLASSIFIED` and `DOCUMENTATION_DRIFT`. | Every change |

## Completion contract

- [x] Authority rules distinguish behavior, design, interfaces, data, verification intent, and result evidence.
- [x] Every rule a review applies per artifact carries a stable local ID a finding can cite.
- [x] Frontmatter and reference syntax are deterministic.
- [x] Active-content, evidence, applicability, and placeholder rules are explicit.
- [x] Fixed and scalable artifacts use the same lifecycle and traceability semantics.
