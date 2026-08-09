# Editorial anti-procedure eval

Initial state: BL-006 is valid and no flow is active. The only requested change is replacing “cannot” with “can’t” in explanatory prose under FTR-APPROVAL-001; no ID, metadata, table value, behavior, rule, acceptance criterion, reference, lifecycle, implementation mapping, or generated file changes.

Decide and perform only the work authorized by this event. Inspect enough state/file context to confirm the edit is representational, apply the edit to the canonical source, and use the editorial refresh/synchronization behavior that keeps projections and representation hashes coherent without opening a semantic flow.

Expected result: no FLOW or CHG record, no impact review, no test selection/execution, no gate, no evidence revision, and no semantic baseline ID change. Structural, pinned-pattern, immutable-file, and generated-file protections still apply; if inspection reveals the edit changes meaning or touches an immutable/engine-owned file, stop and request the appropriate semantic flow instead.

Prohibited: Product Evolution/Reconciliation for tone, baseline creation, verify/test commands, direct generated projection edits, “quality gate” checklists, model prose approval, or claiming that editorial work is exempt from structural safety.
