# Phase 2 — Owner-supplied input channel

Status: complete (released as 1.26.0)

Implemented with two deltas against this draft: `COMMITMENT_DEFERRED_UNOWNED` ships as the generalized deferral rule in the evolution playbook rather than a deterministic finding ("a commitment the flow reached and did not make" is a judgment no engine predicate can decide), and the material-interaction checkpoints are now explicitly bound to the host's interactive ask facility — the observed failure was never that the checkpoint text was missing, but that a session could scroll past it as prose and then implement; a non-interactive run records the choice as a `QST-*` with `Blocked on: owner-decision` instead of deciding.

## Outcome

Deferring a commitment leaves a debtor. The owner never searches for what the pipeline is waiting on, because every flow close and every inspection names it.

## The defect, exactly

`resources/flow-playbooks/product-evolution.md:150` already states the correct rule, for one narrow case:

> A client obligation that no artifact owns is an allocation gap, not a detail … either allocate the artifact that owns the surface producing it, or record the gap in `QUESTIONS` with the exact obligation, the artifacts that impose it, and the claim it blocks until it is closed. Leaving the obligation unowned and unrecorded is not permitted.

Line 148 states the sibling rule for unallocated boundaries — but only for boundaries "of one of these kinds", meaning the closed list of ten artifact types at lines 130–140. An aesthetic commitment is not on that list, so omitting it silently is legal.

The second half of the defect is that the ledger cannot say who is blocked. `catalog.yaml:356` gives `question_ledger` the columns `[Question ID, Question, Why it matters, Affected artifacts, Evidence needed, Resolution artifact, Status]`. `Evidence needed` carries the distinction in prose only, so nothing can compute it. On `sayitalive` this is not theoretical: `state --json` reports eight open questions with seven stale. Reading their evidence needs by hand, exactly one — `QST-004`, provider selection, open eight baselines — is answerable by the owner today; three await measurement, three await post-launch data, one awaits external corroboration. `QUESTION_STALE` fires on seven of eight and therefore distinguishes nothing.

## Changes

### 1. Widen the deferral rule

`resources/flow-playbooks/product-evolution.md` §7 and `genesis.md` §8 — generalize lines 148/150 from "a boundary of one of these kinds" and "a client obligation" to any commitment the flow reached and did not make, including one that requires an input only the owner can supply. Three legal outcomes, matching the shape `evidence-reassessment.md:78` already imposes on questions: make the commitment, allocate the artifact that owns it, or open a `QST-*` naming what is blocked. Closing a flow having done none of the three is the condition the finding below reports.

### 2. Classify who is blocked

`catalog.yaml` — add a `Blocked on` column to the `question_ledger` `Open questions` table, with a closed value domain:

| Value | Meaning | Owner can act today |
|---|---|---|
| `owner-decision` | a judgment only the owner can make | yes |
| `owner-environment` | a credential, account, or device only the owner can supply | yes |
| `measurement` | requires an instrumented run that has not happened | after setup |
| `post-launch` | requires real usage that does not exist yet | no |
| `external-evidence` | requires a source outside the product | no |

`resources/project-template/05-control/questions.md` and the question-ledger pattern take the same column, with the value domain stated as a table so it is citable rather than prose.

### 3. Age by class

`src/core/question-ledger.ts` — `QUESTION_STALE` currently fires at three baselines for every class. A `post-launch` question outliving three baselines means nothing; an `owner-decision` question outliving eight is a real debt. Give each class its own threshold, with `post-launch` and `external-evidence` exempt from staleness entirely — they are not forgotten, they are waiting on the world.

### 4. Two standing findings

- `QUESTION_AWAITING_OWNER` — at least one open question classified `owner-decision` or `owner-environment`. Standing warning; never blocks a baseline.
- `COMMITMENT_DEFERRED_UNOWNED` — a flow closed having deferred a commitment with no artifact and no question. This is the finding that would have caught the visual system.

### 5. Report it without being asked

`resources/flow-playbooks/inspect-state.md:88` already requires reporting the oldest open questions with their ages and what each blocks. Extend it to lead with the owner-blocked subset, separated from the rest, since that is the only part the reader can act on. The four mutation-flow playbooks report the same subset in their closing sections, so the owner sees it at every close without running anything.

## Verification

- A flow that defers a commitment without a question raises `COMMITMENT_DEFERRED_UNOWNED` and still closes its baseline.
- A ledger with only `post-launch` questions raises neither `QUESTION_AWAITING_OWNER` nor `QUESTION_STALE` at any age.
- On `sayitalive` after migration, the owner-blocked subset is exactly `QST-004` until Phase 1's question for the visual system is opened.

## Out of scope

Answering questions outside a flow. An answer still lands as an `EVD-*` with a source or an `ADR-*` with consequences — the friction is the provenance, and removing it would turn a typed guess into evidence, which `questions.md` forbids in its own aging section.
