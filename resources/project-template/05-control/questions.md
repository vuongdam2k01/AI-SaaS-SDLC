---
id: QUESTIONS
artifact_type: question_ledger
title: Open question ledger
status: draft
created_by_change: GENESIS
depends_on: [IDEA-ORIGINAL]
decisions: []
supersedes:
---

# Open question ledger

<!-- Tracks material unknowns until evidence or an authoritative artifact resolves them. It is not a task list, issue tracker, decision record, or informal discussion history. -->

## Authority boundary

- Questions use QST-001 onward and state why the unknown changes an artifact or decision.
- The ledger owns question state, not the eventual fact or decision; resolution links the owning evidence/artifact/ADR.
- A discrepancy against a known expectation belongs in ISS, while a durable architectural choice belongs in ADR.

## Open questions

| Question ID | Question | Why it matters | Affected artifacts | Evidence needed | Resolution artifact | Status |
|---|---|---|---|---|---|---|
<!-- Status is open/resolved. An active ledger requires at least one concrete row; if no questions exist, retain draft with an explicit empty-state comment. -->

## Resolution recording

| Question ID | Resolution summary | Evidence/decision IDs | Affected changes | Resolved by change |
|---|---|---|---|---|
<!-- A summary aids navigation but cannot replace the linked authority. Reopen only when the same question/authority remains; create a new ID when meaning changes. -->
<!-- Two closures are legal and both belong here. Evidence answered it: cite the EVD-* IDs. A decision made it moot: cite the ADR-* and state in the summary what the decision deliberately no longer waits on. A question closed by a decision is closed, not abandoned; a question left open because nobody returned to it is neither. -->

## Aging and impact

- Review signal: a referenced source ages, an affected artifact changes, or the question blocks a concrete authority.
- The engine measures age in baselines and reports `QUESTION_STALE` once a question has outlived the work that raised it; Evidence Reassessment must then resolve it, close it by decision, or state why it stays open.
- Impact classification: identify which facts remain unsafe to assert while open.
- Stale questions remain visible until resolved or explicitly superseded; never delete unresolved history.
- Open questions cannot be treated as evidence, assumptions, requirements, or accepted decisions.

## Completion contract

- [ ] Each row asks one answerable question with material impact and evidence need.
- [ ] Affected artifacts and unsafe-to-assert claims are explicit.
- [ ] Resolved rows link the authoritative evidence/artifact/ADR and affected changes.
- [ ] Issues, decisions, tasks, and informal discussion are kept out of this ledger.
