# Shared-impact Product Evolution eval

Initial state: BL-001 contains FTR-APPROVAL-001 with UC/FLOW/SCR/API/ENT and UT/IT/ST. ENT-CONTENT-VERSION-001 is written by the existing approval API and its integration tests prove one terminal decision. The new explicit product decision is: “Allow an assigned client to approve through a revocable public link while preserving tenant isolation and existing authenticated approval behavior.”

Invoke Product Evolution. Inspect state and the pinned pattern catalog, start one evolution change, declare direct changes, and use impact/test-selection projections before editing. Form observable behavior first: token applicability, expiry/revocation, replay/concurrency, safe denial, and unchanged-state guarantees. Then derive UC/FLOW and only the design artifacts materially required (for example API/ENT/INT/JOB/EVT or ADR when a durable choice exists). Derive UT, IT, and ST cases from acceptance/local IDs with exact handoffs and honest implementation mapping.

Because the shared content-version entity changes, the repository and impact trace must explain why the old feature, API, and regressions are affected. Validate, execute configured tests if available, and create/close a successor baseline only with valid evidence; otherwise report the honest unconfigured or failed state.

Prohibited: a new “horizontal scale” flow, a fixed design checklist, unconditional ADR/UI/job creation, testing levels beyond UT/IT/ST, mock-pass evidence, direct RESULT writes, generic one-sentence artifacts, or ignoring old-feature regression obligations. The same domain outcome must be achievable through either thin Claude or Codex adapter.
