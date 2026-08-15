# Fix a failure or mismatch

Something concrete is wrong: a configured test failed, the code has drifted from the docs, two contracts disagree, or a specification contradicts itself. Reconciliation repairs **one** such mismatch by deciding which side is authoritative, changing **only the wrong side**, and proving the fix with regression. It is a surgical repair flow — not a general review or cleanup.

## Use this when

You can point at the problem with real evidence — a path, an artifact ID, a command and its result, an error or payload, or an exact expected-vs-observed statement:

- A configured test or execution **failed**.
- An inspected **code or Git diff** shows the implementation no longer matches the docs — including the case the engine names for you: `validate` reporting **`IMPLEMENTATION_DRIFT`**, a mapped file whose content left the baseline behind while every artifact declaring it stayed put. That warning is this flow's recorded trigger; **`DOCUMENTATION_DRIFT`** is its mirror and an equally valid trigger — the artifact moved while every file it maps kept its baseline content, which is what a specification revised but never carried into code looks like from the outside. `IMPLEMENTATION_SYMBOL_MISSING` and `IMPLEMENTATION_MAPPING_PATH_MISSING` name the same class at the mapping-row level.
- An **interface/schema/provider contract conflict** — two sides expect different shapes. In a repository with sibling contract files, name the file that owns the disputed shape (`WIRE-*`, `SCHEMA-*` or `TRANSITIONS-*`); the repair converges through that owner instead of across the whole surface.
- A **governing artifact that is not actually governing** — for example a filled `TEST-POLICY` still marked `draft` while every verification specification depends on it. A draft foundation is not implementation authority and sits outside the content contracts, so the rules it states are checked nowhere; that gap is a real, inspectable mismatch and a legitimate reconciliation.
- A **reproducible user-visible drift** from documented behavior.
- An explicit **user correction** ("this is wrong, it should…").
- A specific **specification contradiction**.

Vague model doubt about unchanged prose is **rejected** — Reconciliation needs something inspectable.

When more than one repair is genuinely viable, the flow lays out the real alternatives with their evidence costs before choosing, and the successor ADR carries the credible losers rather than strawmen written to lose.

## Use something else when

- The behavior isn't broken, you are **choosing** to change it → [Product Evolution](implement-a-feature.md).
- The feature is fully specified and simply **not built yet** → [Implement per segment](implement-per-segment.md). Reconciliation repairs discovered nonconformance; it does not schedule planned construction, and a repository full of specified-but-unbuilt features is a queue for `implement`, not a queue for repairs.
- A **public-evidence** claim is contradicted → [Evidence Reassessment](reassess-evidence.md).
- You just want to look, not repair → [Inspect state](inspect-and-check-results.md).

## The one command

```text
/ai-saas-sdlc:reconcile <the concrete failure, drift, mismatch or contradiction>
```

Give it the evidence, not a vibe:

```text
/ai-saas-sdlc:reconcile IT-014 fails: publish endpoint returns 200 for a post with an
unresolved change request, but FLOW-007 and API-003 say it must return 409. Log:
../approval-web-app/logs/it-014.txt
```

## What happens, step by step

1. **Confirm footing and reproduce** — `state` requires an active baseline and no conflicting flow. The flow reads the expected canonical contract and **actually inspects** the cited result/log, code/diff or payload with real file/Git tools. It does not claim reproduction from a summary. If the code is outside your configured implementation sources or access wasn't granted, it says so and stops at that authority limit rather than guessing.
2. **Open the flow and the issue** — `flow start --type reconciliation` reserves a `CHG-*`; `artifact create --type issue` opens an **`ISS-*`** recording the observation and provenance, expected-vs-observed, the affected targets, and the initial closure.
3. **Decide authority — before any repair.** This is the heart of the flow. The default order:
   - active **product behavior** normally outranks code;
   - an accepted **interface/data/event contract** outranks accidental implementation;
   - an **accepted ADR is immutable** — a decision that must change requires a *successor* ADR, not an edit;
   - a genuinely *new* behavior requires Evolution; a *public-evidence* change requires Reassessment.
   If two sides are genuinely plausible authorities — or the repair would select new/breaking behavior — the flow asks you **once**, with the exact interpretations, the compatibility effect and a recommendation. It does not ask permission for mechanical fixes.
4. **Repair only the wrong side** — `impact` computes the closure from the issue's targets, then the flow changes **only** the wrong canonical artifact, *or* the mapped implementation/config, *or* the incorrect `UT/IT/ST` oracle/mapping — plus the affected downstream regression. It does **not** rewrite a correct specification to make a bug look compliant, touch evidence, or clean up unrelated docs.
5. **Prove it** — it adds a test for the concrete failure **at the lowest effective level**, keeps the old tests the impact selected, runs `tests select`, and (when commands are configured) `verify --all --execute` for real `RESULT-*`. A code/config-only repair keeps the `ISS-*` as its semantic trace, and the engine requires a **successful execution** before it will baseline.
6. **Close** — the `ISS-*` is updated with root cause, authoritative source, exact repair, closure and result IDs. Then `refresh` → `validate --active` → `baseline create` → `flow close`, producing a successor `BL-*`. **The repair must include a changed canonical artifact or a successful execution** — you cannot close a Reconciliation on nothing.

## How to check it worked

The closing report gives you: the observation and the reproduced/inspected evidence; the root cause and which side was authoritative; the `ISS-*` and the changed/affected IDs; any code/config paths repaired; the old and new regression tests selected; the real execution/`RESULT-*` IDs (or `not-configured`); and the successor baseline with any remaining limitation.

Verify:

```text
/ai-saas-sdlc:inspect-state ISS-00N
```

Confirm:

- The `ISS-*` is closed, and it names the **authoritative side** and the **exact repair** — not "fixed".
- Only the **wrong** side changed. If the log said the code was wrong, the *specification* should be unchanged (and vice versa). A correct spec quietly edited to match a bug is the failure mode this flow exists to prevent.
- The failed execution is **still in history**; the passing rerun has a **new** `EXEC-*`/`RESULT-*` ID. History is preserved, not overwritten.
- Validation **errors: 0** and the successor `BL-*` recorded.

## Notes and edge cases

- **The repair reveals you actually want new behavior.** Then it isn't a repair. The flow stops or cancels cleanly and hands the intent to [Product Evolution](implement-a-feature.md) — flows are never mixed.
- **No verification commands configured.** The flow states `not-configured` and records the remaining verification limitation inside the `ISS-*`; it never simulates a pass.
- **The same failure recurs.** That continues the *active* Reconciliation flow — it does not spawn a second issue for the same unresolved problem.

## What NOT to use this for

- Broad "let's clean up the docs" passes → not a repair; Reconciliation fixes one cited mismatch.
- Editing an accepted ADR → immutable; create a successor instead.
- Making a bug look compliant by relaxing a correct test or spec → explicitly disallowed.
