# Evidence Reassessment Playbook

Evidence Reassessment answers one concrete market/product evidence question against the current baseline. It advances the evidence revision while preserving product behavior and the active baseline ID.

The host adapter supplies `ENGINE = node "<plugin-root>/bin/ai-saas-sdlc"`.

## 1. Accepted input

Required, one of:

- a specific question such as “Has the competitor's pricing changed?”;
- a new public signal/source;
- a time-sensitive discovery claim that may be stale;
- a concrete contradiction to current discovery synthesis.

Reject “research the market again” without a named decision or claim. Do not use reassessment to smuggle in a feature decision.

## 2. Mandatory reads

1. Run `ENGINE state --json`; require an active baseline and no incompatible active flow.
2. Read `generated/baseline-manifest.json`, `EVIDENCE-LEDGER` and the discovery artifact(s) containing the questioned claim.
3. Read related `ICP-*`, `PERSONA-*`, `PROBLEM-*`, `COMPETITOR-*`, `QUESTIONS` and open `ISS-*` only when their IDs or content are in scope.
4. Identify the existing conclusion, its evidence IDs, applicability, observation dates and downstream product assumptions.
5. Read the stale questions. `ENGINE state --json` reports every open `QST-*` with how many baselines it has been open, and `ENGINE validate` reports `QUESTION_STALE` for each one the product has moved past. Those in this flow's scope are part of its work, not background.

## 3. Open the temporal flow

If the same reassessment is already active, resume it and skip `flow start`. If another flow/question is active, stop and report it instead of opening parallel work.

Run:

```text
ENGINE flow start --type reassessment --input "<question or signal>" --json
```

Keep the flow ID for new discovery/control artifact metadata.

## 4. Define the evidence delta

Write a compact internal delta plan:

- claim/decision being checked;
- what could have changed;
- applicable segment/geography/version/time;
- existing evidence that remains current;
- source classes needed to resolve the delta;
- stop condition.

Do not rerun unrelated Genesis questions. Reuse current evidence by ID rather than fetching it again unless freshness is the question.

## 5. Perform real research

Follow `resources/protocols/public-web-research.md` using the host's actual web search and page-open/fetch tools.

Search only the delta. Inspect source pages, append new `EVD-*` entries, and preserve contradictory facts. For changed time-sensitive facts, keep the historical entry and declare the successor/current applicability; never rewrite evidence history to look continuously correct.

If no real host web tools are available, stop without claiming reassessment occurred.

## 6. Transform and write

Update only affected discovery synthesis:

| Finding | Required write |
|---|---|
| New source supports existing scoped conclusion | Append evidence; update dates/limitations only where useful |
| New source qualifies scope | Append evidence and narrow segment/geography/version/time conclusion |
| Time-sensitive fact changed | Append successor evidence and update current competitor/market/commercial synthesis |
| Reliable contradiction | Append contrary evidence, update affected synthesis and uncertainty |
| Active product assumption may now be invalid | Create/update `ISS-*` naming affected product/design/test IDs; do not mutate them |
| No adequate evidence | Record explicit unknown/coverage limit in affected discovery/`QUESTIONS` |

Legal direct artifact types are discovery details, `QUESTIONS` and `ISS-*`. Do not edit `PRODUCT-REQUIREMENTS`, FTR/UC/FLOW, design, ADR or verification artifacts in this flow.

### Stale questions in scope

For every stale question this flow's evidence touches, reach one of three outcomes before closing. Leaving it untouched is not one of them.

| Outcome | Required write |
|---|---|
| The evidence answers it | Move the row to *Resolution recording* with the `EVD-*` IDs that answered it and set its status to `resolved` |
| A decision has made it moot | Move the row to *Resolution recording* citing the `ADR-*` in the evidence/decision column, and say in one line what the decision no longer waits on. A question can be closed by a choice as legitimately as by a fact |
| It genuinely remains open | Leave it open and state what evidence would close it and why this reassessment did not produce it |

A question the flow silently steps over is a debt the ledger records and nothing schedules. Report each outcome in section 9. Do not close a question by weakening it into something the current evidence happens to answer.

When a new detail or issue is warranted, instantiate it through the pinned catalog:

```text
ENGINE artifact create --type <ideal_customer_profile|persona|problem|competitor|issue> --id <ID> --title "<title>" --json
```

Do not copy pattern files manually.

## 7. Conditional interaction

Usually no user interaction is necessary: evidence is not a preference. Use at most one consolidated interaction if scope/geography/time applicability is genuinely ambiguous and alternatives would produce materially different conclusions. Do not ask the user to approve every source or wording change.

If the user chooses a product response to the evidence, record that as the next proposed Product Evolution intent; do not execute it inside Reassessment.

## 8. Deterministic close sequence

Run:

```text
ENGINE refresh
ENGINE validate --active --json
ENGINE baseline create --json
ENGINE flow close --json
```

`baseline create` advances `EVR-*` but reuses the existing `BL-*` ID. Fix structural errors only; do not ask a model to review unchanged prose.

## 9. Output contract

Report:

- exact question and scope;
- new/superseded/contradicting `EVD-*` IDs;
- discovery artifacts changed;
- whether an `ISS-*` was opened and affected IDs;
- every stale question in scope with its outcome: resolved by evidence, closed by a decision, or still open with what would close it;
- new `EVR-*` and unchanged active `BL-*`;
- evidence limits and whether a separately chosen Evolution is warranted.

## 10. Stop and re-entry

Stop when the named decision is supported, contradicted, qualified or explicitly unresolved and the evidence revision is baselined.

Legal re-entry requires a new/changed source, a newly stale time-sensitive fact, concrete contradiction, explicit scope decision or a new decision question. More searching for the same unchanged question after the stop condition is not progress.

Editorial changes bypass this flow. Product behavior changes require Product Evolution.
