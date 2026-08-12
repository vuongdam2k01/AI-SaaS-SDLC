# Reassess market evidence

The world moves after you baseline. A competitor changes pricing, a regulation shifts, a claim you relied on months ago now looks stale, or someone hands you a signal that contradicts your discovery synthesis. Evidence Reassessment answers **one concrete evidence question** against current public sources — and, crucially, it does this **without silently changing product behavior**.

## Use this when

You have one of these, stated concretely:

- A specific question: *"Has Competitor X's pricing changed since we baselined?"*
- A new public signal or source you want to fold in.
- A time-sensitive discovery claim that may be stale.
- A concrete contradiction to your current discovery synthesis.

## Use something else when

- You just want to "research the market again" with no named decision or claim → **rejected**; give it a specific question first.
- You already know you want to change the product → that is [Product Evolution](implement-a-feature.md). Do not use reassessment to smuggle in a feature decision.
- A *test* failed or *code* drifted → [Reconciliation](reconcile-a-failure.md); that is not market evidence.

## What makes this flow different

It touches **only** the discovery/evidence side of the repository. It **advances the evidence revision `EVR-*` but keeps the same product baseline `BL-*` identity.** It never edits `PRODUCT-REQUIREMENTS`, features, design, ADRs or tests. If the new evidence suggests product truth is now invalid, it raises an **issue** naming the affected IDs — it does not change them.

## The one command

```text
/ai-saas-sdlc:reassess-evidence <the specific question or signal>
```

Example:

```text
/ai-saas-sdlc:reassess-evidence Competitor Acme just announced usage-based pricing — does
this change our commercial assumption that the market anchors on flat per-seat plans?
```

## What happens, step by step

1. **Confirm footing** — `state` requires an active baseline and no conflicting flow, then `flow start --type reassessment`.
2. **Read the current conclusion** — the flow reads the `EVIDENCE-LEDGER`, the discovery artifact(s) holding the questioned claim, and the related `ICP/PERSONA/PROBLEM/COMPETITOR` only when in scope. It also reads the **open questions**, and identifies which of them *this evidence could bear on* — those become part of the work, not background. A question the engine reports as `QUESTION_STALE` (open across three baselines) is in scope on the same terms: scope is decided by the evidence and by staleness, not by when the question was raised.
3. **Define the delta** — a tight plan: the claim being checked, what could have changed, the applicable segment/geography/version/time, which existing evidence still holds, and a stop condition. It does **not** re-run unrelated Genesis questions.
4. **Research only the delta** — live `WebSearch`/`WebFetch` on the actual pages. New observations become new `EVD-*` entries. **History is never rewritten**: a changed time-sensitive fact keeps the old entry and adds a successor with its current applicability. *If real web tools are unavailable, the flow stops honestly rather than claiming reassessment.*
5. **Write only affected synthesis** — depending on what it found: append supporting evidence; narrow a scope; add a successor for a changed fact; append contrary evidence and update uncertainty; or, if product truth may now be invalid, **create/update an `ISS-*`** naming the affected product/design/test IDs (without touching them). If evidence is inadequate, it records an explicit unknown.
6. **Resolve in-scope questions** — for every open question this evidence bears on, it reaches one of three outcomes and reports which: *resolved by the evidence* (with the `EVD-*` that answered it), *closed by a decision* (citing the `ADR-*` and what it no longer waits on), or *genuinely still open* (stating what evidence would close it and why this pass didn't produce it). Silently stepping over an in-scope question is not allowed.
7. **Close** — `refresh` → `validate --active` → `baseline create` (advances `EVR-*`, reuses `BL-*`) → `flow close`.

## How to check it worked

The closing report gives you: the exact question and scope; the new/superseded/contradicting `EVD-*` IDs; which discovery artifacts changed; whether an `ISS-*` was opened and the IDs it affects; every in-scope question with its outcome; the new `EVR-*` with the **unchanged** `BL-*`; and the evidence limits.

Verify:

```text
/ai-saas-sdlc:inspect-state
```

Confirm:

- **`EVR-*` advanced, `BL-*` unchanged** — the product baseline identity is the same; only evidence moved. This is the signature of a correct reassessment.
- Any new `ISS-*` is listed under unresolved control items with the product/design/test IDs it flags.
- Time-sensitive changes appear as **successor** evidence, with the historical entry still present.
- In-scope questions show their new status; `QUESTION_STALE` warnings should have shrunk if this pass addressed the old ones.

## Turning evidence into action

Reassessment deliberately stops at the evidence. If the new evidence means you *want* to change the product, that is a separate, explicit event:

- If it opened an `ISS-*` about invalid product truth, resolving that repair (when it is a mismatch to fix) is [Reconciliation](reconcile-a-failure.md).
- If you are *choosing* new or different behavior in response, that is [Product Evolution](implement-a-feature.md).

The report will name the next proposed intent, but it will not execute it for you — deciding to act is your call, made deliberately, not a side effect of research.

## What NOT to use this for

- Editing evidence history to look like it was always right → never; successors preserve the past.
- A full re-review of the whole ledger → reassessment answers **one** question with new sources; unrelated open questions stay untouched.
- Changing any product/design/test artifact → out of scope by design; it raises an issue instead.
