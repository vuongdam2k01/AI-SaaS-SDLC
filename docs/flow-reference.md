# Flow Reference

The public interface consists of five explicitly invoked skills. Four are temporal mutation flows; Inspect State is read-only. Engine commands are operations inside these interfaces, not extra lifecycle stages.

| Interface | Accepted event | Allowed mutation | Temporal result |
|---|---|---|---|
| Genesis | One raw SaaS idea before any baseline | Discovery, selected discovery details and product foundations | First evidence revision `EVR-001` and product baseline `BL-000` |
| Evidence Reassessment | One named evidence question, new signal, stale claim or contradiction | Evidence ledger, affected discovery synthesis, questions and issues | New `EVR-*`; current `BL-*` identity is retained |
| Product Evolution | One semantic addition, change, consolidation, breaking change, deprecation or retirement | Product behavior, conditional design, UT/IT/ST, mapped implementation and control records | `CHG-*` and successor `BL-*` |
| Reconciliation | One concrete failure, inspected drift or contract contradiction | Minimal authoritative repair, issue, regression specification and mapped implementation | `CHG-*` and successor `BL-*` |
| Inspect State | Optional artifact, change, baseline or project scope | None | Repeatable report over current state |

## Genesis

Genesis preserves the raw idea, separates explicit statements from inference and unknowns, performs real public-web search and page inspection, and records attributable `EVD-*` entries. It synthesizes the fixed discovery records and only the selected `ICP-*`, `PERSONA-*`, `PROBLEM-*` or `COMPETITOR-*` details needed downstream.

One consolidated interaction is used only when unresolved alternatives would materially change the selected opportunity, product promise, access model or non-negotiable constraint. Genesis activates the discovery and product foundations, then creates `EVR-001` and `BL-000`. It does not pre-create FTR, UC, FLOW, design or test artifacts.

## Evidence Reassessment

Reassessment scopes research to one existing claim or decision. New and contradictory observations are appended; historical evidence is not rewritten to appear continuously correct. Only affected discovery synthesis changes.

If current evidence may invalidate product truth, the flow creates or updates `ISS-*` naming the affected product/design/test IDs. Product behavior is not changed in the same flow. A later explicit product decision may start Product Evolution.

## Product Evolution

Evolution converts one semantic intent into observable FTR behavior and stable acceptance IDs, then derives the required UC/FLOW paths. It computes impact before and after conditional solution design so changes to access, invariants, shared CMP/SUB/API/ENT/INT/JOB/EVT contracts and interface/schema/transition contract files pull prior dependents and regression obligations into the closure.

Only boundaries that exist receive design artifacts. New scalable artifacts are instantiated from the pinned catalog. UT, IT and ST specifications are derived from behavior and affected regression. When implementation sources and verification commands are configured and access is permitted, the flow edits mapped paths and runs the exact declared commands through the engine. Otherwise execution remains honestly `not-configured`.

## Reconciliation

Reconciliation starts from an inspectable observation: failed execution, code or Git diff, payload/interface conflict, reproducible drift, explicit correction or exact contradiction. It records an issue, decides which claim domain is authoritative, repairs only the wrong side plus affected downstream relationships, and adds the lowest effective regression proof.

A choice of new or breaking product behavior leaves Reconciliation and becomes a separate Evolution. Public-evidence contradiction leaves it and becomes Reassessment. Failed and successful execution records remain in history.

## Inspect State

Inspect State runs only read operations: state, full validation, impact and test selection, plus scoped reads of generated projections and canonical records. It may report structural facts, semantic inferences and unknowns, but it never refreshes, verifies, migrates, opens/closes a flow or edits files.

## Closing, cancellation and editorial edits

A dirty mutation flow closes only after refresh, active validation and its required baseline operation succeed. A flow with no canonical or configured implementation-source change may close as a recorded cancellation; identifiers remain reserved. Post-baseline semantic drift must be incorporated into a successor baseline or reverted before close.

Spelling, tone and formatting are not mutation events. `refresh --editorial` may accept a body-only representation change when metadata, relationships, evidence, immutable records and machine-owned files are unchanged. It creates no change record and runs no tests.

Because an editorial change runs outside every flow, the session applying it has no skill context and cannot resolve the plugin root. `init` and every writing `refresh` record the resolved engine in `.ai-saas-sdlc/engine.json`:

```json
{ "schema_version": 1, "plugin_version": "1.0.0",
  "engine_path": "…/bin/ai-saas-sdlc",
  "editorial_command": "node \"…/bin/ai-saas-sdlc\" refresh --editorial" }
```

Run `editorial_command` verbatim. Never search the filesystem for another copy of the engine: a different copy may be a different version, and on a machine that has a source checkout it will silently be preferred over the installed package. Inspect State also prints this command whenever it names an editorial edit as the next valid action. The file holds a machine-local absolute path and `init` adds it to `.gitignore`.

There is no approval pipeline or automatic self-review loop. Re-entry requires a new or changed public source, explicit product decision, inspected file/code diff, execution result or concrete contradiction. Rereading unchanged prose is not a new event.
