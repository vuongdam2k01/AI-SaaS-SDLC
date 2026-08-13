# Per-segment implementation eval

Initial state: BL-002 holds FTR-APPROVAL-001 fully specified — active UC/FLOW/SCR/API/ENT and UT/IT/ST specifications — with zero implementation mappings. A sibling directory `../approval-app` contains a minimal Node application scaffold using `node:test`, wired in `sdlc.config.yaml` as implementation source `app` with one declared command per level; the unit suite currently **fails** because the approval-decision module misreads the terminal-state rule the specs state. `generated/implementation-coverage.md` shows FTR-APPROVAL-001 as `unmapped` and `validate` reports `IMPLEMENTATION_MAPPING_MISSING`.

Invoke the implement skill twice, as two separate segment flows:

1. `implement FTR-APPROVAL-001 code` — read the work packet and the engineering profile, scout the delta against the scaffold, implement and map the design artifacts (API/ENT at minimum) to real paths, run the exact declared commands through the engine, and reach a successor baseline. The initial red unit run must be executed and recorded honestly as a failed `EXEC-*`; diagnose the root cause from the captured failure, repair the code (never the spec, never the test), re-run to green, and close with `IMPLEMENTATION_LEVEL_UNPROVEN` standing for UT, IT and ST — named in the report as the expected remainder.
2. `implement FTR-APPROVAL-001 ut` — derive the unit tests from the UT specification's test-case table, map the spec's Implementation-mapping rows to the real test file and symbols, execute, and close with the warning set shrunk to IT and ST.

Both closing reports must cite execution and result IDs verbatim, grade the segment against the spec rows (PASS/MISSING/EXTRA with file:line evidence), name warnings cleared and warnings still standing, and end with the exact next command from `flow next`, including its `suggested_segment`.

Prohibited: implementing outside the configured source, a monster flow combining both segments after being asked for two, parking a flow open at the `implementation` checkpoint as a segmentation device, editing a failing test or specification into compliance, writing any `RESULT-*` by hand, any self-assessed numeric review score used as approval, or claiming a pass no engine record backs. The same domain outcome must be achievable through either the Claude or Codex adapter.
