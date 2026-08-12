# Project Changelog

See the root [CHANGELOG](../CHANGELOG.md) for the release summary. This contributor view records documentation-impact areas that must remain synchronized with implementation.

## 1.8.0 - 2026-08-12

| Area | Documentation impact |
|---|---|
| Read-only projection | `docs build` documented in the command reference, inspect guide and inspect-state playbook/skills as the one permitted Inspect State write; a projection, never authority or evidence |
| Platform method | Platform pattern and evolution playbook state that a committed-but-unproven platform is `active` with its unproven-ness in the evidence layer, never `draft` |
| Flow method | Evolution playbook and command reference document that a checkpoint past the recorded stop raises the target; continuation guidance says to pass `--until` when carrying a flow further |
| Namespace method | Evolution playbook suggests registering `areas` once IDs carry stable area segments |
| Validation wording | `PLATFORM_EVIDENCE_MISSING`/`PLATFORM_EVIDENCE_CONTRADICTED` messages and the inspect-guide table state the standing warning is the durable record |
| Guides | Feature guides print `continue FLOW-*` to match `flow next` output |
| Compatibility | Recorded the byte-frozen RESULT renderer, the message-text-only change on upgrade, and the no-migration doctrine for the pattern text |

## 1.7.0 - 2026-08-12

| Area | Documentation impact |
|---|---|
| Platform evidence | Documented the optional `host_os` frontmatter token on `PLT-*` with its declaration-not-observation doctrine and `PLATFORM_EVIDENCE_CONTRADICTED`; pattern contract comment, configuration reference, evolution playbook and feature guide updated |
| Projections | `generated/platform-coverage.md` documented in the command reference, inspect guide and inspect playbook as the joined targets/commands/executions/hosts view, emitted only when platform targets exist |
| Verification | `verify` documented as resynchronizing generated projections after completed runs |
| Validation | Command reference and inspect guide enumerate all eleven warnings |
| Compatibility | Recorded the byte-frozen RESULT renderer, the optional-everywhere `host_os` shape, the no-migration doctrine for the pattern text, and the one-time coverage drift for repositories that already hold platform targets |

## 1.6.0 - 2026-08-11

| Area | Documentation impact |
|---|---|
| Contract authorities | Interface/DBML/transition families documented as multi-file: sibling discovery, `WIRE-*`/`SCHEMA-*`/`TRANSITIONS-*` identities, `depends_on` ownership, per-file impact convergence and the add-file-first transition recipe |
| Data method | Entity pattern documents the `Persistence authority` line and the store-neutral `Store target` column; DBML documented as one file per database with non-relational and client-local stores declared on the entity; pinned catalog version 3 |
| Architecture method | `Runtime topology` documented as the architecture overview's required section owning runtime units, network boundaries and crossing contracts; subsystem pattern points at the new owner |
| Validation | Command reference and inspect guide enumerate all ten warnings, adding the three authority declarations and `AREA_UNREGISTERED` |
| Configuration | `areas` registry documented as the second optional schema-v1 key beside `platforms` |
| Compatibility | Recorded both skew directions: old engines see sibling files as unscanned and their declarations as broken references; new engines read existing repositories byte-identically |

## 1.5.0 - 2026-08-11

| Area | Documentation impact |
|---|---|
| Verification provenance | Documented `platforms` declarations on verification commands, the observed-host fields on execution records, and both in `RESULT-*` provenance |
| Validation | Documented `PLATFORM_EVIDENCE_MISSING` and `PLATFORM_DECLARATION_UNKNOWN`; command reference now enumerates all six warnings |
| Design method | OS entry points decomposed into UC/FLOW triggers, `PLT-*` capability rows and `SCR-*` surfaces; screens carry a form-factor rule; single-user products state OS-account/device boundaries |
| Guides | Adopted the how-to guide set into the repository and aligned its allocation table with the 24-type catalog |

## 1.4.0 - 2026-08-11

| Area | Documentation impact |
|---|---|
| Artifact contracts | Added `platform_target` (`PLT-*`) as the 24th scalable type and widened `unit_test_backend` to accept `UT-CORE-*` beside `UT-API-*` |
| Design authority | `API-*` documented as covering any invocable operation, with OpenAPI authoritative for HTTP only and the `API-*` document owning non-HTTP invocation contracts in full |
| Verification method | Platform variance documented as a viewpoint inside UT/IT/ST with per-platform execution limits recorded in `TEST-POLICY`; derivation rows added for platform constraints, permissions, update/migration and IPC boundaries |
| Validation | `CONTENT_CONTRACT_UNPINNED` documented as the error for a live artifact whose type the pinned catalog predates |
| Compatibility | Recorded that no pattern migration exists: existing repositories stay on their init-time catalog and the new type reaches new projects only |

## 1.0.0 - 2026-08-09

| Area | Documentation impact |
|---|---|
| Repository model | Defined canonical plugin source patterns, consuming `00-system/patterns/` snapshots and live `01`-`05` instances as separate layers |
| Artifact contracts | Documented 23 scalable types, fixed foundations, `artifact create`, active content validation and engine-only result creation |
| Temporal method | Documented four mutation flows, read-only Inspect State, legal re-entry events and non-gated editorial behavior |
| Dual-host package | Documented Claude marketplace/development loading, Codex local-plugin use and the ten thin adapters over shared resources |
| Enforcement | Defined Claude SessionStart/PreToolUse/Stop safeguards versus cross-host engine authority |
| State and provenance | Documented EVR/BL/CHG/FLOW identities, cancellation, historical graph closure, implementation snapshots and immutable execution-backed results |
| Commands/configuration | Synchronized CLI options, strict schema-v1 configuration, path boundaries and documentation-only verification behavior |
| Scope | Removed stale stage-gate, agent, interview, deployment and semantic self-review implications |
