# Command Reference

The deterministic engine operates on the current working directory. In a development checkout, use `node <plugin-root>/bin/ai-saas-sdlc`; an npm-linked checkout may also expose `ai-saas-sdlc`. Installed host adapters resolve the bundled executable from their own plugin root.

## Initialization and inspection

| Command | Options | Behavior |
|---|---|---|
| `init` | `--project-id <id>`, `--idea <text>` | Copies the project skeleton, pins the installed pattern catalog to `00-system/patterns/`, creates internal state and refreshes projections. Refuses an initialized repository, unsafe destinations and any overwrite. |
| `state` | `--json` | Returns current baseline/evidence state plus the active flow, if any. |
| `patterns list` | `--json` | Lists the consuming repository's verified pinned catalog. Before initialization only, it can list the plugin source catalog. |
| `impact` | `--json` | Compares canonical and fixed-contract hashes with the baseline and walks current plus historical reverse dependencies. |
| `tests select` | `--json` | Returns UT/IT/ST obligations derived from the affected closure and existing test dependencies. It does not execute tests. |

## Flow and artifact mutation

| Command | Options | Behavior |
|---|---|---|
| `flow start` | `--type <genesis\|reassessment\|evolution\|reconciliation>`, `--input <text>`, `--json` | Opens exactly one flow. Evolution and Reconciliation also reserve a `CHG-*`. Flow legality and starting snapshots are engine-enforced. |
| `artifact create` | `--type <catalog-type>`, `--id <ID>`, `--title <title>`, `--json` | Creates one new draft from the pinned pattern at its canonical path. Requires a compatible active flow, checks type/ID/path/title, refuses collisions and rejects `test_result`. |
| `refresh` | `--check`, `--editorial`, `--json` | Rebuilds generated projections, including `rule-coverage.md`. `--check` reports drift without writing. `--editorial` first accepts an eligible body-only representation change. The two flags cannot be combined. Any writing form also records the resolved engine at `.ai-saas-sdlc/engine.json`. |
| `baseline create` | `--json` | Runs validation and flow-specific completion, impact and verification rules; then records the required evidence/product baseline. Reassessment advances EVR while retaining the product baseline ID. |
| `flow close` | `--json` | Closes a baselined flow or records a clean cancellation. Rejects dirty work without the flow's baseline and changes made after that baseline. |

`artifact create` substitutes identity metadata only. It does not synthesize product content or activate the artifact. New `created_by_change` values are bound to the active `FLOW-*` or `CHG-*`.

## Validation and verification

| Command | Options | Behavior |
|---|---|---|
| `validate` | `--active`, `--all`, `--json` | Checks the initialized repository and generated drift. In schema v1, `--active` and `--all` are accepted playbook/CI intent flags over the same full deterministic report. Returns non-zero when any error exists. |
| `verify` | `--unit`, `--integration`, `--system`, `--all`, required `--execute`, `--json` | Runs exact commands from `sdlc.config.yaml` only during Evolution or Reconciliation. With no level flag, all three levels are selected. Every attempt reserves a new `EXEC-*` and renders `RESULT-EXEC-*`; failures remain in history and return non-zero. |
| `migrate` | `--check`, `--json` | Reports whether config/state schema differs from schema 1. Version 1 provides no predecessor transformation; a mismatch returns non-zero. |

Validation covers configuration, canonical type/path identity, metadata, permanent IDs, graph references and cycles, lifecycle and supersession, immutable input/ADR/terminal history, active content contracts, pinned-pattern integrity, internal state/change/execution schemas, execution/result binding, implementation mappings and generated synchronization. Baseline creation adds flow boundaries, coverage and required execution verdicts.

## Mutation safety

All mutating engine operations use a project-scoped lock. Managed writes are path-contained and symlink-aware. Internal records, pinned patterns, generated projections and result artifacts are engine-owned. JSON output is intended for host skills, hooks and CI; human-readable output is intentionally compact.
