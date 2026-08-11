# Evolve existing behavior

Adding a feature is only one shape of Product Evolution. The same skill handles every later change to behavior that already exists: refining it, consolidating two things into one, making a breaking change, deprecating a rule, or retiring a whole capability. **There is no separate "scale" or "refactor" flow** — repeating Product Evolution over time *is* how the product grows and changes.

Read [Implement a feature](implement-a-feature.md) first for the checkpoint mechanics (`--until behavior|design|tests|implementation|baseline`); this guide focuses on what is different for each non-additive shape.

## Use this when

The behavior exists and you are **choosing** to change it. If instead the behavior is *wrong* relative to a contract, a test or the code — that is a defect, and it belongs in [Reconciliation](reconcile-a-failure.md).

## The five shapes

You still run one command:

```text
/ai-saas-sdlc:evolve-product <semantic intent>
```

What changes is the intent and how the flow treats existing IDs.

### 1. Compatible refinement

You are improving behavior without breaking anyone.

> *"Reviewers should also be able to leave an optional comment when they approve, not just when they request changes."*

- The flow **updates the current** `FTR-*`/`UC-*`/`FLOW-*` in place and adds acceptance criteria; it does not allocate new permanent IDs for something that is the same behavior refined.
- Impact usually stays local. Tests are extended, not replaced.

### 2. Consolidation

Two overlapping behaviors should become one.

> *"Merge 'request changes' and 'reject' into a single 'send back with reason' action."*

- Expect supersession: the surviving artifact absorbs the behavior; the replaced ones move to `superseded`, keeping their IDs and history.
- Impact is usually wider than it looks — anything that referenced either original is in the closure. Review the `impact` output carefully at the design checkpoint.

### 3. Breaking change

You are knowingly changing a contract in a way that is not backward-compatible.

> *"The publish API must now reject any post that has an unresolved change request — callers that used to get a 200 will get a 409."*

- State the compatibility consequence explicitly in your intent. The flow records current-vs-desired behavior and the breaking consequence, and pulls every dependent of the changed `API-*`/`EVT-*`/`ENT-*` contract into regression.
- A breaking contract change is the kind of durable, expensive-to-reverse decision that legitimately earns an `ADR-*`. Expect one, and expect the report to explain why the threshold was met.
- A client obligation the change introduces (a new required field, an idempotency key, the identity of a superseded record) must be **owned by an artifact** or recorded in `QUESTIONS` as an allocation gap. The flow will not leave a new caller obligation unowned and silent.

### 4. Deprecation — pick the right instrument

Deprecation has two instruments, and using the wrong one states something false about the product:

- **Whole-artifact status** — set an artifact `deprecated`, later `retired`, **only when it has stopped being the authority for anything**. A retired artifact is immutable and nothing live may depend on it, so retire it only *after* its dependents have moved off it.
- **Rule-level deprecation** — when part of the artifact survives, leave the artifact `active` and deprecate the specific `BR-*` inside it: mark the change that deprecated the rule, its named replacement, and the condition under which it is removed.

Marking a whole feature `deprecated` because one of its rules was replaced claims the rest of it is going away too. Apply the same test to `UC-*`/`FLOW-*`: fully replaced → `superseded`; partly replaced → edited, not retired.

Whichever instrument you use, **every deprecation needs a stated removal condition.** A deprecation with no removal condition is an annotation, not a decision — and the closing report is required to state which artifacts changed status and which carry a rule-level deprecation, each with its removal condition.

### 5. Retirement

A capability is going away entirely.

> *"We are dropping the standalone 'schedule preview' screen; it is folded into the composer."*

- **IDs and files are preserved**, not deleted. The artifact and its dependents/tests are deprecated then retired, with history intact.
- Retire in dependency order: dependents move first, then the artifact retires once nothing live points at it.

## How to check it worked

Same as any Evolution — but pay attention to the parts specific to changing existing behavior:

```text
/ai-saas-sdlc:inspect-state <the changed FTR/API/ENT ID>
```

Confirm:

- **Old features pulled into regression** appear in the closure and their `UT/IT/ST` were re-selected and (if configured) re-executed. A shared-contract change that *didn't* reach its dependents is a red flag — look again at the `impact` output.
- **Supersession/deprecation is recorded, not faked**: superseded artifacts still carry their IDs and history; deprecated rules carry a replacement and a removal condition.
- The closing report's **explicit statements**: which boundaries were named but not allocated (and why), which artifacts changed status vs. carry a rule-level deprecation, and which ADRs were created or superseded and why they met the threshold.
- Validation **errors: 0**; a lingering `RULE_UNVERIFIED` or `QUESTION_STALE` warning tells you what is still owed.

## What NOT to use this for

- **A behavior that is broken, not being redesigned** → [Reconciliation](reconcile-a-failure.md).
- **"Should we even keep supporting this?" driven by a market signal** → [Evidence Reassessment](reassess-evidence.md) to establish the evidence, then Evolution to act on it.
- **Renaming for clarity, fixing wording** → editorial edit; see [Inspect state and check results](inspect-and-check-results.md#editorial-edits-spelling-tone-formatting).
