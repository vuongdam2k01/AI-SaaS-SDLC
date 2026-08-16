# Owner-Supplied Inputs

Status: draft

## Outcome

Give the pipeline a channel for what it cannot derive. Two capabilities are missing outright — a visual system a product can commit to, and a runtime configuration surface an owner can supply — and one rule is missing that would have made both absences visible: a flow may currently defer a commitment without leaving a debtor.

The evidence is a real initialized repository. `sayitalive` completed genesis, six evolutions and implementation, passed every validation, and shipped four screens rendered in browser-default styling. Nothing failed. `03-design/ux-rules.md:65` records the visual system as "Not yet committed … filled by the flow that commits it", and no such flow exists anywhere in the plugin.

## Diagnosis

The pipeline governs everything it can derive from evidence, decisions and contracts. It has no place to put what only the owner can supply. Three observed symptoms, one cause:

| Symptom | Owner input it needed | Channel that existed |
|---|---|---|
| Unstyled screens shipped through every gate | Aesthetic commitment | None — not even an open question |
| Every environment on the mock provider | Provider credential | None |
| Eight open questions, seven stale, one actionable | — | Ledger exists but cannot say who is blocked |

`product-evolution.md:150` already states the correct rule for a narrower case: an unowned client obligation must either get an artifact or a `QUESTIONS` row, and *"leaving the obligation unowned and unrecorded is not permitted."* The rule is right and its scope is too small.

## Decisions

- Patch the missing capability and the missing rule separately. The rule prevents recurrence; it does not create a place to record an answer. A question row saying "no visual system yet" is worthless while no contract can hold the answer.
- Owner input lands in exactly two destinations, never a third. A **judgment** (taste, provider choice, scope) becomes a `QST-*` closed by an `ADR-*`. An **environment fact** (a key is present, a device exists) is engine-observed and rendered as a projection, never authored, never flow-gated — it changes with the machine, not with the product.
- Add no flow, no skill and no lifecycle stage. Every delta is a content contract, a playbook question, an engine finding or a projection, consistent with the four-mutation-flow constraint.
- Findings are standing warnings and never block a baseline, following `PLATFORM_EVIDENCE_MISSING`: a commitment this machine cannot yet prove belongs in the evidence layer, not in a `draft` artifact.
- Do not remove mock-first execution. `Q-013` in the reference repository requires the default suite to pass with zero provider environment variables; the real path is an additional opt-in command, used to measure, not to replace.

## Phases

1. [Visual system as a committable artifact](phase-01-visual-system.md) — the missing capability
2. [Owner-supplied input channel](phase-02-owner-input-channel.md) — the missing rule and the ledger classification
3. [Runtime configuration coverage](phase-03-runtime-config.md) — environment facts, derived not authored
4. [Migration, tests and documentation](phase-04-migration-and-release.md) — catalog generation, existing repositories, release
5. [Solution-class selection](phase-05-solution-selection.md) — the hand-rolling bias: commodity infrastructure is adopted, and the question gets asked before the first line

## Dependencies

Phase 1 stands alone and is the only phase that repairs the observed defect; it can ship first. Phase 2 defines the deferral rule that Phase 1's new contract is the first consumer of, so its enforcement lands after Phase 1's contract exists. Phase 3 is independent of both and is the only phase touching `sdlc.config.yaml` schema. Phase 4 depends on all three.

## Applying to an existing repository

`patterns migrate` re-pins contracts and never edits an instance ([docs/command-reference.md:12](../../docs/command-reference.md)). After migrating, `validate` names what no longer satisfies the new shape, and repair happens inside an ordinary flow — which flow depends on what the repair needs:

- filling design tokens requires a new product commitment, so it is Product Evolution (`reconciliation.md:18` routes newly chosen behavior there explicitly);
- a purely structural contract change is repaired in whatever flow runs next;
- code found reading configuration no artifact declares is discovered nonconformance, so it is Reconciliation.

Accepted decision records and the original idea stay exempt from tightened contracts.

## Completion

Complete when a fresh genesis cannot reach a live screen without either committed design tokens or a question row naming the owner as blocked; when `config requirements` answers "what does this need from me" on a repository that has run no new flow; and when the open-question ledger distinguishes what waits on the owner from what waits on the world.
