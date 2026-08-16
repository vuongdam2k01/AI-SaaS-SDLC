# Phase 3 — Runtime configuration coverage

Status: implemented, unreleased

Two decisions changed against the draft during implementation. The `generated/config-coverage.md` projection was dropped: supply state is machine-local, and a projection carrying it would differ between machines and raise `GENERATED_DRIFT`, which is an error — so the joined view is served by the `config requirements` command and the findings, neither of which is a committed file. A third finding, `CONFIG_DECLARATION_UNKNOWN`, was added to mirror `PLATFORM_DECLARATION_UNKNOWN`, catching a requirement that outlived the code or the design that imposed it.

## Outcome

At any point, without running a flow, the owner can ask what real configuration the product needs, what is supplied and what each missing item blocks. Configuration state is derived and observed, never authored.

## The defect, exactly

Grepping the plugin for the concept of an owner-supplied input — `owner must supply`, `owner provides`, `owner-supplied`, `ask the owner for` — returns nothing. The pipeline has no notion that something might come from outside it.

The consequence is visible in the reference repository. `QUALITY-REQUIREMENTS` `Q-010` names "Config audit + secret-scan test" as its verification method, but no artifact lists the configuration to audit. `INT-CREATION-001` `AU-01` states the rule — *"Provider API credential held by the control-plane-side adapter only"* — correctly and deliberately without naming a key, since `AU-02` forbids credential values in the document. So the design knows a credential boundary exists and nothing connects it to a concrete key.

Meanwhile the application reads five environment variables that no artifact declares:

| Key | Read at |
|---|---|
| `PORT` | `src/api/main.ts:12` |
| `CREATION_DATA_DIR` | `src/api/main.ts:13` |
| `CREATION_TEST_CONTROLS` | `src/api/main.ts:20` |
| `CREATION_STATIC_DIR` | `src/api/main.ts:36` |
| `CREATION_GATE_OPEN` | `src/core/creation/config.ts:29` |

The last one gates `REQ-009` new-project creation — a product access decision — and `ACCESS-CONTROL` does not know it exists. That is drift already present, independent of the provider question.

## Design

Configuration state is an **environment fact**, not a product decision: it changes with the machine, not with the product, so it must not require a flow and must not be authored. The plugin already handles a fact of exactly this shape — a platform target the design commits to that this machine cannot prove — as an engine-rendered projection plus a standing warning, never as a `draft` artifact. Follow that precedent exactly.

Requirements are derived from two sides and the gap between them is the report:

- **design side** — active `INT-*` authentication rows, and `PLT-*` local-store or permission rows, establish that a credential or setting boundary exists;
- **code side** — a scan of `implementation_sources` for `process.env.*` and `import.meta.env.*` yields concrete key names.

No new authored artifact. An earlier draft of this plan proposed a `RUNTIME-CONFIG` artifact; it is dropped, because `INT-*` already owns the secret boundary and a second document restating it is the drift `design-implementation.md:18` names.

## Changes

### 1. Declaration on commands

`sdlc.config.yaml` accepts exactly four optional keys today — `platforms`, `report`, `timeout_ms` per command, and `areas` at top level. Add `requires_config: [KEY]` per command, mirroring `platforms`, so a command needing a real provider is marked unrunnable when its key is absent rather than failing obscurely. This is a schema change and requires a `schema_version` bump — the most expensive item in this plan.

### 2. Projection

`generated/config-coverage.md` — engine-rendered, joining declared requirements, observed keys, supply status and the claims each unsupplied item blocks. Appears only once a requirement or a key exists, like `platform-coverage.md`, so no existing repository's file set changes without cause.

The engine checks **presence of a key name only**. It never reads a value, never copies one into a document or projection, and never writes an environment file. Supplying a value stays the owner's action, consistent with `AU-02` and `TP-13`.

### 3. Two findings

- `CONFIG_REQUIREMENT_UNSUPPLIED` — a design-declared boundary with no supplied key.
- `CONFIG_KEY_UNDECLARED` — code reads a key no artifact declares. This is what surfaces `CREATION_GATE_OPEN`.

Both standing warnings; neither blocks a baseline.

### 4. Inspector command

`ENGINE config requirements` — read-only, permitted in `inspect-state`, which currently allows only read operations plus `docs build`. Add it to the playbook's permitted list and to the skill adapter.

## Verification

- A repository with no `INT-*` and no env reads renders no projection and raises no finding.
- A key present in the environment flips status without any flow being run.
- No value ever appears in a projection, document or log.
- On `sayitalive` today: one unsupplied provider boundary from `INT-CREATION-001`, five undeclared keys.

## Notes

Mock-first execution stays. `Q-013` in the reference repository requires the default suite green with zero provider environment variables, and `TP-12` requires a substitute to preserve the collaborator contract. The real-provider path is an additional opt-in command declaring `requires_config`, used to measure `QST-005`, not to replace the mock.
