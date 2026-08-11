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
- Unit-test exclusions are assigned to an integration or system test when the excluded claim remains required.

## Completion contract

- [x] Structural, semantic, and authority checks are distinct.
- [x] Active-content validation rejects placeholders and heading-only documents.
- [x] Shared patterns, fixed foundations, local IDs, references, and generated results are covered.
- [x] Validation observes contracts without creating product or execution evidence.
