# Shared artifact patterns and pinned snapshots

The files below this directory are the canonical scalable artifact contracts selected through `catalog.yaml`.

When a project is initialized or a change is created, the engine may copy the exact cataloged patterns into the project's `00-system/patterns/` directory. Those copies are pinned, hashed snapshots: they preserve the contract version used by that project or change and must not be edited by hand.

A pinned snapshot is reproducibility evidence. It does not create a second template authority or override an instantiated project artifact; the cataloged shared library remains the source used for future generation. `ai-saas-sdlc patterns migrate` is the one supported way to move an existing repository onto a newer generation of these contracts; it re-pins the snapshot and reports the contract delta, and never edits an instance.

## What a pattern is for

A pattern is not a form to fill in. It is the canonical model for one artifact type — the classifier that says how its content divides, the detail rule that says how far each part goes, the routing that says where excluded content lands, and the completion contract that says when it is done. Quality that lives in a model is decided once and inherited by every instance; quality that lives in an instance is decided again, differently, by whoever writes it.

That is why every substantive section is a table with local IDs rather than prose. An identified row can be cited, claimed by a verification case, handed to another level, or reported as unclaimed by `ENGINE validate`. A prose bullet can only be read and forgotten. Where a section is deliberately left as prose — discovery unknowns and falsifiers, an issue's resolution — the pattern says so in a comment and gives the reason.

## Detail level is derived from the consumer

Each pattern's contract comment carries a **Detail rule** sentence, and all of them are derived the same way: identify who reads the artifact to do work, identify what they already have open while doing it, and write only what they need and cannot get from what they already have. Three questions settle any specific case:

1. Does the consumer need it to do their work? If not, leave it out.
2. Can they read it from a document they already have open? If so, leave it out — a copy becomes a second authority and drifts.
3. If they derive it themselves, does everyone derive the same thing? If not, state the **constraint** rather than the value.

| Type | Consumer | Must decide without asking | Already has open | Detail rule follows |
|---|---|---|---|---|
| `ideal_customer_profile`, `persona`, `problem`, `competitor` | Whoever chooses what to build and for whom | Whether this segment or problem justifies scope | The evidence ledger | Cite evidence IDs; state applicable discriminators, not adjectives |
| `feature` | Use-case, design and verification authors | What behavior must be true and how it is accepted | This document | Observable conditions with stable IDs; no mechanism |
| `use_case`, `business_flow` | Design and system-test authors | What the actor does and what must hold across steps | The feature's acceptance rows | Reference acceptance IDs; describe observation, not rendering |
| `screen`, `component` | Client implementers and frontend test authors | What renders, what is refused, what must not change | Interface files, `UX-RULES`, `ERROR-CATALOG` | Conditions and exact responses; never restate wire fields or design-token values |
| `api_processing`, `entity`, `job`, `event`, `external_integration`, `subsystem` | Backend implementers and integration-test authors | Order, transaction, idempotency and failure semantics | The owning interface and schema files | Semantics and guarantees; never restate paths, columns or payload shapes |
| `platform_target` | Implementers and test authors on that platform | What the platform costs the product | Platform documentation | Constraint plus product consequence, with its observation date |
| `unit_test_*`, `integration_test`, `system_test` | Whoever writes the test code | Which data to construct, what to do, what to assert | Interface and schema files | The data *requirement*, not literal values; the call and its count |
| `test_result` | Anyone auditing what ran | Whether the evidence is real | The execution record | Recorded facts only; nothing authored |
| `issue`, `architectural_decision` | Whoever repairs, or whoever asks why later | The minimal correction, or the reason for the shape | The affected artifacts | Observed versus expected with its authority; decision with its rejected alternatives |

The method that turns these contracts into instances lives in `resources/protocols/` — `behavior-formation.md` and `solution-formation.md` for allocation, `test-derivation.md` for level allocation, and `test-case-derivation.md` for the traversal that produces a specification's cases.
