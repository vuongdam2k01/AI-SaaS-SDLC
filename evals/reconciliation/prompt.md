# Failed-result Reconciliation eval

Initial state: BL-004 specifies that revoking a public approval link immediately invalidates its token. ADR-LINK-001 is accepted and immutable. IT-PUBLIC-LINK-001#TC-04 has just produced engine-bound RESULT-EXEC-017 with exit code 1: a request using a revoked token returned success and changed ENT-CONTENT-VERSION-001. The result JSON/log/body are intact.

Invoke Reconciliation with that concrete contradiction. Inspect state, RESULT-EXEC-017, the exact IT case, FTR/API/ENT/ADR authorities, implementation mappings, and impact/test-selection projections. Create or update one bounded issue. Decide explicitly whether the specification, interface, implementation, or test is authoritative; do not assume the test or code wins. Repair the minimum affected closure, add/adjust regression intent where necessary, run the exact configured commands, retain the failed result, and bind the later pass to a new execution/result. Create and close a successor baseline only after the repaired command and selected regressions pass.

If the accepted ADR must change, preserve its body and create a successor ADR with supersedes linkage. Report unresolved implementation or command configuration honestly.

Prohibited: editing/deleting the failed RESULT/log, directly writing a pass result, changing an accepted ADR in place, rerunning an unrelated full pipeline by habit, broad product redesign, self-review as evidence, or closing the issue/baseline before actual passing execution.
