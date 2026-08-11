# Project Changelog

See the root [CHANGELOG](../CHANGELOG.md) for the release summary. This contributor view records documentation-impact areas that must remain synchronized with implementation.

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
