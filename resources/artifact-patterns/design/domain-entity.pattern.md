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

<!-- Contract: defines the semantic model, ownership, lifecycle, invariants, sensitivity, and schema mapping for one domain entity. It does not own physical column syntax, API payload shape, or screen labels. Create when a durable or identity-bearing concept needs a stable semantic contract. ID is ENT-<AREA>-<NNN>; path is 03-design/data/<ID>.md. This artifact owns domain meaning and declares its persistence authority: the owning schema file owns physical shape for relational storage, a PLT-* local-data row owns a client-local store, an explicit none records ephemeral or derived state, and interface files own wire representations. Consumers: API/JOB/EVT/INT/SUB designs, tests, privacy rules, and implementation. Detail rule: the consumer is writing processing and persistence with the schema authority open, so state domain meaning, lifecycle and invariants, and leave column types, indexes and physical shape to the declared persistence authority. Lifecycle: draft -> active -> superseded. -->

## Purpose and boundary

- Domain meaning: <precise business meaning>
- Identity: <what makes one instance distinct>
- Included concepts: <scope>
- Excluded or separate entities: <boundaries>

## Ownership and tenancy

| Local ID | Concern | Rule | Observable consequence |
|---|---|---|---|
| OW-01 | owning subsystem | <SUB ID> | <who may be observed writing> |
| OW-02 | tenant or organization scope | <scope and isolation rule; a single-user product states the OS-account or device boundary instead> | <cross-boundary read a case proves impossible> |
| OW-03 | creation authority | <actor or processing artifact> | <observable when another actor attempts creation> |
| OW-04 | mutation authority | <bounded actors/processes> | <observable when an unauthorized writer attempts mutation> |
| OW-05 | read authority | <access rule IDs> | <denied read behavior> |
<!-- Isolation rows are the entity's security surface: each one states what a case proves cannot happen, not only who is allowed. -->

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

| Local ID | From state | Trigger | To state | Guard | Side effects |
|---|---|---|---|---|---|
| T-01 | <ST ID> | <event/action> | <ST ID> | <rule> | <EVT/JOB or none> |
<!-- A transition absent from this table is forbidden; a verification case may assert the rejection directly by its T ID. -->

## Relationships

| Local ID | Related entity | Cardinality | Ownership | Constraint | Deletion consequence |
|---|---|---|---|---|---|
| REL-01 | <ENT ID> | <cardinality> | <owner> | <relationship rule> | <behavior> |

## Retention and deletion

| Local ID | Concern | Rule | Observable consequence |
|---|---|---|---|
| RT-01 | retention basis and duration | <policy or requirement> | <observable after the retention bound> |
| RT-02 | deletion trigger and authority | <condition and actor> | <observable when another actor attempts deletion> |
| RT-03 | deletion semantics | <hard delete, soft delete, anonymization, or prohibited> | <what remains readable afterwards> |
| RT-04 | export or portability | <required fields and authority, or not applicable> | <fields an export must contain> |
| RT-05 | sensitive-data handling | <minimization and access boundaries> | <fields a case asserts absent outside the boundary> |
<!-- Keep one row per concern that applies; state an explicit not-applicable rule rather than deleting a row. -->

## Schema mapping

- Persistence authority: <PHYSICAL-SCHEMA, SCHEMA-... node, PLT-...#M-NN local store, or none — reason>

| Attribute or relationship ID | Store target | Application symbol | Migration note |
|---|---|---|---|
| <A or REL ID> | <table.column, collection.field, key pattern, or store path> | <model/type symbol> | <compatibility or backfill constraint> |

## Completion contract

- [ ] Identity, ownership, tenancy, mutation, and read authorities are explicit.
- [ ] Attributes, states, and invariants have stable local IDs and semantic types.
- [ ] Every transition and relationship states guards and deletion consequences.
- [ ] Retention, deletion, export, and sensitivity rules are explicit where applicable.
- [ ] Domain semantics map to the declared persistence authority, implementation, and verification without redefining wire schemas.
