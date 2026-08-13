---
id: VALIDATION-RULES
artifact_type: validation_rules
title: Artifact validation rules
status: active
created_by_change: GENESIS
depends_on: [DOCUMENT-RULES, ARTIFACT-LIFECYCLE]
decisions: []
supersedes:
---

# Artifact validation rules

## Validation scope

Validation evaluates project artifacts as contracts. It detects structural absence, unresolved references, duplicate authority, incomplete active content, and traceability gaps. It does not invent product facts, decide architecture, execute missing tests, or treat formatting alone as semantic completeness.

## Structural validation

- Every Markdown artifact has parseable frontmatter and a unique canonical ID.
- Scalable artifacts match exactly one catalog entry, its ID pattern, target path, required headings, table schemas, and local-ID minima.
- Fixed artifacts match their foundation contract when `active`.
- Only `{{ID}}`, `{{TITLE}}`, and `{{CREATED_BY_CHANGE}}` may appear in shared patterns; instantiated active artifacts contain no unresolved template tokens.
- Frontmatter fields have the declared scalar/list/null shape; `supersedes` is null or one ID.

## Semantic validation

- Active required sections contain project-specific assertions, not headings alone, generic filler, angle-bracket guidance, or unchecked completion items.
- Required tables contain meaningful rows and preserve required columns.
- Local IDs are unique inside the artifact, conform to the catalog namespace, and are referenced without ambiguity.
- Claims use observable conditions, applicability, units, state guarantees, and exact authority references where the artifact family requires them.
- Verification cases have executable mappings; generated results originate from actual execution and reconcile aggregate/case outcomes.

## Authority validation

- Each normative fact has one owner; copies, summaries, and generated evidence do not compete with it.
- `depends_on`, ADR, operationId, entity/schema, error, access, invariant, feature acceptance, and test-case references resolve.
- Dependency edges are direct, meaningful, and acyclic across normative artifacts.
- Wire fields are not redefined outside the owning interface file; physical schema is not redefined outside the owning DBML file; shared access/error/UX/invariant rules are referenced rather than duplicated.
- A contract family holding sibling files declares ownership: each live operation, entity and screen names its owning interface file, schema file or transition graph in `depends_on`, and impact converges through that edge rather than across the whole surface.
- Unit-test exclusions are assigned to an integration or system test when the excluded claim remains required.

## Reported severity

Validation reports two severities and they mean different things. An **error** is a broken structure — a bad ID, an unresolved reference, a lifecycle or supersession violation, a mutated immutable record, a coverage gap, generated projections out of sync. Errors block a baseline and must be repaired.

A **warning** names a judgement or a debt rather than a broken structure, never blocks a baseline, and is itself the durable record of what is owed. Seventeen exist:

| Warning | Means |
|---|---|
| `RULE_UNVERIFIED` | A declared business rule no specification claims. |
| `SPEC_OVERSIZED` | A live IT/ST specification past the case threshold. |
| `CASE_REFERENCE_BROKEN` | A qualified case reference naming a case its specification does not declare. |
| `QUESTION_STALE` | An open question that has outlived three baselines. |
| `PLATFORM_EVIDENCE_MISSING` | A live platform target no verification command declares evidence for. |
| `PLATFORM_DECLARATION_UNKNOWN` | A `platforms:` declaration naming no live platform target. |
| `PLATFORM_EVIDENCE_CONTRADICTED` | A declared `host_os` token no recorded execution declaring that target has observed. |
| `WIRE_AUTHORITY_UNDECLARED` | A live operation naming no owning interface file while siblings exist. |
| `SCHEMA_AUTHORITY_UNDECLARED` | A live entity naming no owning schema file while siblings exist. |
| `TRANSITION_AUTHORITY_UNDECLARED` | A live screen naming no owning transition graph while siblings exist. |
| `AREA_UNREGISTERED` | A live ID naming an area outside the optional `areas` registry. |
| `EVD_RETRIEVAL_MISSING` | An engine-retrieved URL whose evidence entry does not cite its `RET-*` record. |
| `EVD_RETRIEVAL_BROKEN` | A cited `RET-*` record that is absent, failed, or retrieved a different URL. |
| `RESEARCH_CAPABILITY_UNDERUSED` | Instrument discovery surfaced a cited URL no engine retrieval inspected. |
| `RETRIEVAL_RUNG_DEGRADED` | A failed engine retrieval no later success covers — the record of a fallback to host tools. |
| `IMPLEMENTATION_MAPPING_MISSING` | With implementation sources configured, an active feature none of whose declaring artifacts maps to code — specified but not yet implemented. |
| `IMPLEMENTATION_LEVEL_UNPROVEN` | With implementation sources configured, a feature whose active UT, IT or ST specifications include none mapped to an implemented test — the level is specified but unproven. |

Closing a warning by weakening the artifact that raised it is not a repair. Several are legitimately permanent: an unproven platform, an IPC-only operation with no wire owner, a client-local entity with no schema owner, a degraded retrieval whose source stayed unreachable, a feature validated on paper before anyone builds it.

## Completion contract

- [x] Structural, semantic, and authority checks are distinct.
- [x] Active-content validation rejects placeholders and heading-only documents.
- [x] Shared patterns, fixed foundations, local IDs, references, and generated results are covered.
- [x] Validation observes contracts without creating product or execution evidence.
- [x] Errors and warnings are distinguished, and every warning is named with what it means.
