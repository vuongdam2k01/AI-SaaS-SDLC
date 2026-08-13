# Reconciliation Playbook

Reconciliation repairs one concrete documentation/interface/implementation/test mismatch by determining authority, changing only the wrong side and proving the affected regression. It is not a general review or cleanup flow.

The host adapter supplies `ENGINE = node "<plugin-root>/bin/ai-saas-sdlc"`.

## 1. Accepted input

At least one concrete observation:

- failed configured test/execution;
- inspected code or Git diff;
- interface/schema/provider-contract conflict;
- reproducible user-visible drift;
- explicit user correction;
- specific specification contradiction.

Require a path, artifact ID, command/result, error/payload or exact expected-versus-observed statement. Reject model doubt about unchanged prose. Route public-evidence contradiction to Evidence Reassessment; route a newly chosen behavior to Product Evolution. Route *planned* implementation of a fully specified feature to the implement skill — Reconciliation repairs discovered nonconformance, it does not schedule construction. Discovered nonconformance includes drift the implement flow's own review surfaces and records as an `ISS-*`: repairing that recorded contradiction here, one feature-sized slice per flow, is the sanctioned catch-up pattern for a codebase behind its documents.

## 2. Mandatory reads and observations

1. Run `ENGINE state --json`; require an active baseline and no incompatible active flow.
2. Read baseline manifest, relevant artifact graph/index entries and the expected canonical contract.
3. Inspect the cited result/log, code/diff or interface payload. Use real file/Git/read tools; do not claim reproduction from a summary alone.
4. Read existing related issue, accepted ADR and UT/IT/ST artifacts.
5. If code access is outside configured implementation sources or not granted, do not inspect/edit it; state the authority limitation.

## 3. Open the temporal flow

If this same mismatch already has an active Reconciliation flow, resume it and skip `flow start`. If a different flow is active, stop and report it; do not open a parallel repair.

Run:

```text
ENGINE flow start --type reconciliation --input "<failure or mismatch>" --json
```

Use the returned `CHG-*` for a new `ISS-*` and any other new repair artifacts.

Instantiate a new issue with:

```text
ENGINE artifact create --type issue --id <ISS-ID> --title "<title>" --json
```

## 4. Record and classify the mismatch

Follow `resources/protocols/reconciliation.md`. Create/update one `ISS-*` with:

- concrete observation/provenance;
- expected versus observed behavior;
- affected artifact/code/result targets;
- authority and rationale;
- initial affected closure.

Authority is decided before repair. Active product behavior normally outranks code; accepted interface/data/event contracts outrank accidental implementation; accepted ADR remains immutable; product change requires Evolution; public evidence change requires Reassessment.

## 5. One consolidated authority interaction

Ask the user only when two sources are genuinely plausible authorities or repair would select new/breaking product behavior. Present exact interpretations, compatibility effect, scope and recommendation in one interaction.

Do not ask for approval of mechanical fixes. If the answer chooses new product behavior, stop/cancel or complete the current record appropriately and hand the intent to Product Evolution rather than mixing flows.

## 6. Compute and repair the closure

Run `ENGINE impact --json` after `ISS-*` identifies its targets, then follow `resources/protocols/impact-analysis.md`.

Repair only:

- the wrong canonical artifact(s), or
- mapped implementation/configuration, or
- incorrect UT/IT/ST oracle/mapping,

plus affected downstream relationships/regression. Create a successor ADR when an accepted decision changes. Do not edit evidence ledger, regenerate discovery, rewrite unrelated docs or alter a correct specification to make a bug look compliant.

When the mismatch involves a contract file, name the file that actually owns the disputed shape. Interface, schema and transition families may hold sibling files with their own identities — `03-design/interfaces/*.yaml` as `WIRE-*`, `03-design/data/*.dbml` as `SCHEMA-*`, `03-design/*.mmd` as `TRANSITIONS-*` — and impact converges per owning file, so a repair scoped to one file must not be widened to the whole surface. A live `API-*`/`ENT-*`/`SCR-*` in a multi-file family that names no owner is reported as `WIRE_/SCHEMA_/TRANSITION_AUTHORITY_UNDECLARED`; repairing an undeclared ownership is a legitimate reconciliation when the missing declaration is the mismatch.

A foundation this flow substantively fills or corrects — `TEST-POLICY` above all — leaves `draft` in the same flow: satisfy its completion contract and set it `active`. A draft foundation is not implementation authority and sits outside the active-content contracts, so its rules are machine-checked nowhere, and the baseline draft-block only catches drafts the current change created.

Instantiate any new issue, successor ADR or test specification through `ENGINE artifact create`; do not copy pattern files manually.

For code/config-only repair, retain the issue as the semantic trace; the engine requires successful execution before baselining it.

## 7. Derive and execute regression

Follow `resources/protocols/test-derivation.md`:

- add a test for the concrete failure at the lowest effective level;
- retain old tests selected by impact;
- add IT/ST only when the boundary/journey is material;
- update implementation mappings.

Before appending a case to an existing `IT-*` or `ST-*`, check whether `ENGINE validate` already reports it as `SPEC_OVERSIZED`; split it first rather than growing the file the engine has already called oversized. When live `PLT-*` targets exist and this repair adds or changes a verification command, declare which targets each command evidences with `platforms: [PLT-...]` before executing — a repair that leaves the declaration stale reads as unproven platform evidence for the whole product, not just for the repair.

Run:

```text
ENGINE tests select --json
```

When any commands are configured, execute exact configured commands only:

```text
ENGINE verify --all --execute --json
```

Record real execution-backed `RESULT-*`; never author results. If no commands are configured, state `not-configured` and record the remaining verification limitation in `ISS-*`.

## 8. Close the issue and flow

Update the issue with root cause, authoritative source, exact repair, affected closure, execution/result IDs and any remaining limitation.

Run:

```text
ENGINE refresh
ENGINE validate --active --json
ENGINE baseline create --json
ENGINE flow close --json
```

The repair must include a changed canonical artifact or a successful execution. Fix only structural/reference/coverage failures; do not trigger semantic self-review.

## 9. Output contract

Report:

- observation and reproduced/inspected evidence;
- root cause and authoritative side;
- issue and changed/affected IDs;
- code/config paths repaired;
- selected old/new regression tests;
- real execution/result IDs or `not-configured`;
- successor baseline and remaining limitations.

## 10. Stop and re-entry

Stop when the mismatch is resolved across the authoritative contract, affected implementation and selected regression, with history preserved in the successor baseline.

Legal re-entry requires a new failed execution, new diagnostic observation, inspected drift, contract conflict or explicit correction. The same unresolved failure continues this active flow; it does not spawn repeated review issues. Editorial edits bypass Reconciliation.
