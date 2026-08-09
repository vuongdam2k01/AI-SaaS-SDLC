# Reconciliation Protocol

Use this protocol only for a concrete mismatch among accepted documentation, interface contracts, configured implementation sources and execution evidence. “Review again” or model doubt about unchanged prose is not an input.

## Admissible observations

- failed UT/IT/ST execution with record/log;
- inspected implementation behavior or Git diff;
- OpenAPI/DBML/event/provider contract mismatch;
- reproducible user-visible behavior conflicting with an active feature/flow;
- explicit user correction of product intent;
- public evidence contradiction, which is routed to Evidence Reassessment before any product repair.

Capture exact file/ID/command/error/payload and expected versus observed behavior. If the mismatch cannot be located or reproduced/inspected, record the uncertainty in `QUESTIONS`; do not start an expansive repair.

## Intake and issue

Create or update one `ISS-*` containing:

- concrete observation and provenance;
- expected versus observed behavior;
- affected contract/code/result IDs and paths;
- authority determination and rationale;
- impact closure;
- minimal repair and regression evidence;
- closure state or remaining blocker.

The issue coordinates the repair; it does not replace the canonical contract.

Instantiate a new issue, successor ADR or regression specification through `ENGINE artifact create`; never hand-copy a pattern into an output directory.

## Authority matrix

| Conflict | Default authority | Exception requiring explicit decision |
|---|---|---|
| Code violates active feature/UC/FLOW/acceptance | Product contract | User declares intentional behavior change → Product Evolution |
| Detailed design conflicts with active product behavior | Product behavior | Durable product change is chosen → Evolution, not quiet design rewrite |
| Code and OpenAPI/DBML/event contract differ | Accepted external/data/event contract | Intentional breaking/migration decision → successor ADR/Evolution |
| Test conflicts with canonical acceptance/error/invariant | Canonical contract | Contract is proven wrong by user decision or newer authoritative source |
| Accepted ADR conflicts with implementation/design | Accepted ADR | Create successor ADR; never edit accepted body |
| Public evidence conflicts with discovery assumption | Evidence Reassessment | Product mutation waits for explicit Evolution intent |
| Implementation exposes a previously undocumented but correct invariant | Explicit user/system authority after inspection | Update canonical design in this reconciliation and add regression |

Never rewrite a correct specification to excuse a defect. Never rewrite correct code merely to preserve an obsolete contract; establish obsolescence first.

## Repair sequence

1. Inspect the active baseline, relevant artifacts, configured code and execution record.
2. Start the reconciliation flow and create/update `ISS-*` using its allocated change ID.
3. Determine authority and state it before editing either side.
4. Run impact analysis from the issue targets and mismatched contract/code.
5. Repair only the wrong side and necessary affected closure.
6. If accepted decision changes, create successor `ADR-*` with `supersedes`; update downstream decision references.
7. Update/add UT/IT/ST specifications for the failure and selected regression.
8. Implement inside configured roots only when explicitly permitted.
9. Execute exact configured commands through the engine; capture real `EXEC-*`/`RESULT-*` evidence.
10. Complete the issue resolution/closure section, refresh, validate, create successor baseline and close the flow.

Code/configuration-only repair is legal when a successful execution proves it. The issue remains the semantic trace. A repair with neither a changed canonical artifact nor successful execution cannot create a reconciliation baseline.

## Interaction

Ask the user once only when authority is genuinely ambiguous or the observed behavior implies a product/breaking decision. Present the two concrete interpretations, affected scope, compatibility cost and recommendation. Do not ask the user to approve mechanical fixes or every file edit.

If the answer selects new behavior rather than restoration, close/cancel the reconciliation as appropriate and start Product Evolution with that semantic intent. Do not smuggle evolution into repair.

## Boundaries and stop condition

- No evidence-ledger changes in Reconciliation.
- No Genesis rerun, broad documentation refresh or unrelated cleanup.
- No custom execution outside declared verification commands.
- No semantic self-review after the concrete mismatch is resolved.
- Editorial corrections bypass this flow.

Stop when the authoritative side and affected closure agree, selected regression has real execution evidence or honest `not-configured` status, the issue records remaining limitations, and a successor baseline is created.

Re-enter only on a new failed execution, inspected drift, contract conflict, explicit correction or regression. The same unchanged failure without new diagnostic information continues the existing flow; it does not open another issue/review cycle.
