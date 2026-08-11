# Pattern-to-Instance Model

The plugin separates an authoring contract from the product records written with that contract. There are three layers, not two competing template sets.

## 1. Canonical source patterns

`resources/artifact-patterns/` is the versioned source library shipped by the plugin. Its `catalog.yaml` maps each scalable artifact type to:

- one pattern file;
- one permanent-ID regular expression;
- one canonical target path;
- required headings and tables;
- required local-ID namespaces.

The same catalog holds completion contracts for the fixed foundation documents copied from `resources/project-template/`. These source files are plugin inputs, not records about a consuming SaaS product.

## 2. Pinned consuming snapshot

`ai-saas-sdlc init` copies the source library into the new documentation repository at `00-system/patterns/`. It also writes `00-system/patterns/snapshot.json`, whose file count and catalog hash bind the snapshot to the copied files.

After initialization, pattern listing, artifact creation and active-content validation resolve this pinned snapshot. They do not silently switch to a newer plugin source library. Direct edits to the snapshot fail integrity validation; changing its contract requires an explicit migration or reinitialization, not an in-place edit.

## 3. Live instances

The consuming project's authored truth lives only under `01-discovery/` through `05-control/`:

```text
plugin source                    initialized documentation repository
resources/artifact-patterns/  -> 00-system/patterns/       pinned contract snapshot
resources/project-template/   -> fixed foundation files    live singleton records
00-system/patterns/            -> 01-05 scalable artifacts  live instances
live artifacts                -> generated/                derived projections
```

A pattern describes a reusable class. For example, `unit-test-backend.pattern.md` is an authoring contract; `04-verification/unit-tests/backend/UT-API-APPROVAL-001.md` is one product-specific test specification. The same contract also produces `UT-CORE-*` specifications for platform-neutral core logic. `generated/` contains reproducible views over live records and is never another authored source of truth.

## Creating a scalable instance

List the pinned catalog:

```bash
ai-saas-sdlc patterns list --json
```

Inside an active compatible mutation flow, create one draft:

```bash
ai-saas-sdlc artifact create \
  --type feature \
  --id FTR-APPROVAL-001 \
  --title "Request approval"
```

The engine:

1. loads and verifies the pinned snapshot;
2. checks that the active flow may create the requested type;
3. validates the permanent ID and canonical target path;
4. rejects unknown types, duplicate paths and unsafe targets;
5. substitutes identity metadata and writes one new `draft` without overwriting a file.

`test_result` appears in the catalog because its content has a contract, but `artifact create` rejects it. Only `verify --execute` may create `RESULT-EXEC-*` from a real execution record.

## Activation and content contracts

Drafts may remain incomplete. Validation applies the pinned content contract to every `active` scalable artifact and active foundation. It checks:

- required level-two sections exist and contain meaningful content;
- unchanged template bodies and unresolved placeholder markers are absent;
- required tables have the required columns and minimum completed rows;
- required local-ID namespaces are present;
- foundation type and path agree with the catalog;
- artifact metadata, canonical path, lifecycle and references satisfy the repository rules.

The engine deliberately does not score prose, tone, persuasiveness or product correctness. Those semantic claims must come from attributable evidence, explicit decisions, inspected implementation and execution results.

## Authority rule

Patterns define shape; live artifacts define product truth. Within live artifacts, authority stays narrow: `FTR-*` owns outcomes and acceptance criteria, `SCR-*` owns screen-local behavior, `API-*` owns processing and transaction semantics, the owning interface file owns wire contracts, and `ENT-*` owns domain meaning while its declared persistence authority — a schema file, a platform-target local store, or an explicit none — owns physical shape. Adjacent artifacts reference these authorities instead of duplicating them.
