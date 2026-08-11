---
id: {{ID}}
artifact_type: entity
title: {{TITLE}}
status: draft
created_by_change: {{CREATED_BY_CHANGE}}
depends_on: [SYSTEM-INVARIANTS, ARCHITECTURE-OVERVIEW]
decisions: []
writes_to: []
implementation: []
supersedes:
---

# {{ID}} — {{TITLE}}

<!-- Contract: defines the semantic model, ownership, lifecycle, invariants, sensitivity, and schema mapping for one domain entity. It does not own physical column syntax, API payload shape, or screen labels. Create when a durable or identity-bearing concept needs a stable semantic contract. ID is ENT-<AREA>-<NNN>; path is 03-design/data/<ID>.md. This artifact owns domain meaning; DBML owns physical schema and OpenAPI owns wire representations. Consumers: API/JOB/EVT/INT/SUB designs, tests, privacy rules, and implementation. Lifecycle: draft -> active -> superseded. -->

## Purpose and boundary

- Domain meaning: <precise business meaning>
- Identity: <what makes one instance distinct>
- Included concepts: <scope>
- Excluded or separate entities: <boundaries>

## Ownership and tenancy

- Owning subsystem: <SUB ID>
- Tenant/organization scope: <scope and isolation rule; a single-user product states the OS-account or device boundary instead>
- Creation authority: <actor or processing artifact>
- Mutation authority: <bounded actors/processes>
- Read authority: <access rule IDs>

## Attributes

| Local ID | Name | Meaning | Type | Required | Constraints | Sensitivity |
|---|---|---|---|---|---|---|
| A-01 | <semantic name> | <meaning> | <domain type> | <yes/no/conditional> | <rule/INV IDs> | <classification> |

## States and invariants

| Local ID | Type | Rule | Applies when | Enforcement owner |
|---|---|---|---|---|
| ST-01 | state | <state meaning and allowed entry> | <condition> | <API/JOB/SUB ID> |
| INV-01 | invariant | <always-true semantic rule> | <scope> | <artifact/code owner> |

### Allowed transitions

| From state | Trigger | To state | Guard | Side effects |
|---|---|---|---|---|
| <ST ID> | <event/action> | <ST ID> | <rule> | <EVT/JOB or none> |

## Relationships

| Related entity | Cardinality | Ownership | Constraint | Deletion consequence |
|---|---|---|---|---|
| <ENT ID> | <cardinality> | <owner> | <relationship rule> | <behavior> |

## Retention and deletion

- Retention basis and duration: <policy or requirement>
- Deletion trigger and authority: <condition and actor>
- Deletion semantics: <hard delete, soft delete, anonymization, or prohibited>
- Export or portability: <required fields and authority, or not applicable>
- Sensitive-data handling: <minimization and access boundaries>

## Schema mapping

| Attribute or relationship ID | DBML table and column | Application symbol | Migration note |
|---|---|---|---|
| <A/relationship ID> | <table.column> | <model/type symbol> | <compatibility or backfill constraint> |

## Completion contract

- [ ] Identity, ownership, tenancy, mutation, and read authorities are explicit.
- [ ] Attributes, states, and invariants have stable local IDs and semantic types.
- [ ] Every transition and relationship states guards and deletion consequences.
- [ ] Retention, deletion, export, and sensitivity rules are explicit where applicable.
- [ ] Domain semantics map to DBML, implementation, and verification without redefining wire schemas.
