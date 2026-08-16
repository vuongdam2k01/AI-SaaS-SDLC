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

Validation also reads the four documents in `00-system` against their pinned contracts, even though they are not artifacts and enter no graph, manifest or projection. They state the rules everything else is graded against, so a gap here is a gap in every downstream judgement; it is reported as a warning because a repository initialized under an older template carries an older copy it did not author.

Validation evaluates project artifacts as contracts. It detects structural absence, unresolved references, duplicate authority, incomplete active content, and traceability gaps. It does not invent product facts, decide architecture, execute missing tests, or treat formatting alone as semantic completeness.

<!-- The three validation sections below are prose by design: each describes a check the engine performs, so the implementation is the authority and a finding cites its warning or error code rather than a line here. The severity table further down is already identified — the code is its own ID. -->

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

A **warning** names a judgement or a debt rather than a broken structure, never blocks a baseline, and is itself the durable record of what is owed. Thirty-five exist:

| Warning | Means |
|---|---|
| `RULE_UNVERIFIED` | A declared business rule no specification claims. |
| `CLAIM_WITHOUT_DEPENDENCY` | A specification proving another artifact's rule by qualified reference without declaring it in `depends_on`, so the closure cannot reach it. |
| `IMPACT_UNCLASSIFIED` | An artifact a change put in question that carries no recorded ripple decision — while the change is open, and afterwards for as long as the artifact stays untouched. |
| `SPEC_EXECUTION_UNATTRIBUTED` | A specification the affected closure selected that no ingested report of the flow attributes a case to. |
| `DOCUMENTATION_DRIFT` | An artifact whose content left the baseline behind while every implementation file it maps did not — documents moved, code did not. |
| `ACCESS_UNVERIFIED` | A declared access rule no active verification specification claims. |
| `INVARIANT_UNVERIFIED` | A declared system invariant no active verification specification claims. |
| `ERROR_UNVERIFIED` | A declared error code no active verification specification claims. |
| `UX_UNVERIFIED` | A declared UX rule no active verification specification claims. |
| `SCREEN_BEHAVIOR_UNCLAIMED` | A screen action or validation rule that reaches no case, no exclusion handoff and no open question. |
| `DESIGN_TOKENS_UNCOMMITTED` | A live screen rendering with no committed `DT-*` design token and no open question citing `UX-RULES#design-tokens`. |
| `SYSTEM_DOCUMENT_INCOMPLETE` | A `00-system` document missing a required section, table or rule ID its pinned contract declares. |
| `SPEC_OVERSIZED` | A live IT/ST specification past the case threshold. |
| `CASE_REFERENCE_BROKEN` | A qualified case reference naming a case its specification does not declare. |
| `QUESTION_STALE` | An open question that has outlived three baselines. |
| `PLATFORM_EVIDENCE_MISSING` | A live platform target no verification command declares evidence for. |
| `PLATFORM_DECLARATION_UNKNOWN` | A `platforms:` declaration naming no live platform target. |
| `PLATFORM_EVIDENCE_CONTRADICTED` | A declared `host_os` token no recorded execution declaring that target has observed. |
| `CONFIG_KEY_UNDECLARED` | An environment key a configured implementation source reads that no `configuration` entry declares. |
| `CONFIG_REQUIREMENT_UNSUPPLIED` | A declared, non-optional configuration key this machine supplies no value for. |
| `CONFIG_DECLARATION_UNKNOWN` | A `configuration` entry no source reads, or whose `required_by` names no live artifact. |
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
| `IMPLEMENTATION_DRIFT` | A mapped file whose content left the baseline behind while every artifact declaring it did not — code moved, documents did not. |
| `IMPLEMENTATION_SYMBOL_MISSING` | A specification mapping row whose test symbol does not occur in the file the row names (approximate textual check). |
| `IMPLEMENTATION_MAPPING_ROW_IGNORED` | An Implementation-mapping table row that is present but unparseable: wrong column count, malformed case ID, or placeholder cells mixed with real content. |
| `IMPLEMENTATION_MAPPING_PATH_MISSING` | On a specification that declares frontmatter mappings, a table row whose test path exists under no configured implementation source — a transposed or stale row. |

Closing a warning by weakening the artifact that raised it is not a repair — deleting the screen row that raised `SCREEN_BEHAVIOR_UNCLAIMED` closes the warning and keeps the gap. Several are legitimately permanent: an unproven platform, an IPC-only operation with no wire owner, a client-local entity with no schema owner, a degraded retrieval whose source stayed unreachable, a feature validated on paper before anyone builds it, a rule whose verification is genuinely impossible and recorded as such in `TEST-POLICY`, an artifact deliberately ruled `not-affected` in a change that has since closed, and a specification whose covering command declares no machine-readable report.

The six closure warnings above — one per declared-rule family, plus screen behavior — share one purpose: every identifier a live artifact declares must reach a verification case, a handoff, or an open question. A declared rule reaching none of the three is a commitment no execution can ever fail on. `generated/rule-coverage.md`, `generated/foundation-coverage.md` and `generated/screen-coverage.md` show the current placement per identifier.

`DESIGN_TOKENS_UNCOMMITTED` covers a commitment rather than an identifier: a live screen renders in *some* visual system, and with no `DT-*` row committed the system it renders in is the host default, recorded nowhere as a choice. It closes when a Product Evolution flow commits the tokens, or stands as the durable record while an open question citing `UX-RULES#design-tokens` defers the decision.

The three configuration warnings cover the dependency no document can name on its own. An `INT-*` artifact states that a credential boundary exists and is forbidden from naming the credential, so the concrete key names live only in the code — which is why `CONFIG_KEY_UNDECLARED` scans the configured sources and needs no prior declaration to fire: a repository that has never described its configuration still learns its own surface, and a key gating a product decision that reaches no artifact is the configuration form of an unowned obligation. `CONFIG_REQUIREMENT_UNSUPPLIED` is the machine-local half — the durable record that a declared key this machine lacks keeps some path unrunnable — and `CONFIG_DECLARATION_UNKNOWN` is its mirror, a requirement that outlived the code or the design that imposed it. The engine reads key *names* only, never a value, in the sources and in any environment file it consults. All three are warnings for the platform-evidence reason: a machine without production credentials must still be able to close a baseline.

The four consequence warnings — `IMPACT_UNCLASSIFIED`, `SPEC_EXECUTION_UNATTRIBUTED`, `DOCUMENTATION_DRIFT` and `CLAIM_WITHOUT_DEPENDENCY` — cover the other direction: not what a document promises, but what changing it put at risk. A change computes the artifacts it put in question, and each one takes a recorded decision through `impact classify` — `modify`, `verify-only`, `deprecate`, `stale-question` or `not-affected` with a concrete reason. What is reached only as a prerequisite of something the change created is not a decision and is never asked about. The remainder survives the baseline that left it: an artifact reached, undecided and untouched keeps its warning until a later change decides it or somebody edits it. `generated/change-impact/<CHG-ID>.md` shows the decision per artifact.

## Completion contract

- [x] Structural, semantic, and authority checks are distinct.
- [x] Active-content validation rejects placeholders and heading-only documents.
- [x] Shared patterns, fixed foundations, local IDs, references, and generated results are covered.
- [x] Validation observes contracts without creating product or execution evidence.
- [x] Errors and warnings are distinguished, and every warning is named with what it means.
