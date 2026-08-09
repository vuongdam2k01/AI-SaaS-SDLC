---
id: {{ID}}
artifact_type: test_result
title: {{TITLE}}
status: active
created_by_change: {{CREATED_BY_CHANGE}}
depends_on: [TEST-POLICY]
decisions: []
implementation: []
supersedes:
---

# {{ID}} — {{TITLE}}

<!-- Contract: engine-owned immutable execution evidence. Purpose: project observed facts from one actual test execution. Non-purpose: test intent, normative design, manual status, or inferred evidence. Create only after the runner completes. ID is RESULT-<EXECUTION-ID>; path is 04-verification/results/<ID>.md. Authority: the runner owns raw output, source control owns code identity, and this result owns the immutable projection. Dependencies: TEST-POLICY, executed UT/IT/ST specs, source revision, and runner output. Consumers: change closure, issues, audits, and summaries. Lifecycle: active and immutable; later executions create new result IDs rather than editing this artifact. Completion is defined by the integrity contract below. -->

## Execution identity

- Execution ID: <engine-emitted immutable identifier>
- Started at: <timestamp with offset>
- Finished at: <timestamp with offset>
- Overall outcome: <passed / failed / errored / cancelled>

## Execution provenance

| Field | Engine-recorded value |
|---|---|
| Source revision | <immutable revision> |
| Change ID | <change ID> |
| Command | <exact command and arguments> |
| Working directory | <repository-relative path> |
| Toolchain | <runner and relevant versions> |
| Environment fingerprint | <non-secret reproducibility fields> |

## Aggregate result

| Metric | Value |
|---|---|
| Total | <integer> |
| Passed | <integer> |
| Failed | <integer> |
| Skipped | <integer> |
| Duration | <value and unit> |

## Case results

| Test spec ID | Case ID | Outcome | Duration | Evidence reference |
|---|---|---|---|---|
| <UT/IT/ST ID> | <TC ID> | <outcome> | <value and unit> | <bounded log/artifact reference> |

## Failures and evidence

| Test spec and case | Observed failure | Expected behavior | Diagnostic evidence | Related issue |
|---|---|---|---|---|
| <ID and TC> | <runner-observed fact> | <spec reference> | <sanitized excerpt or artifact reference> | <ISS ID or none> |

## Integrity contract

### Completion contract

- Generated only after the command actually completes.
- Values come from runner output; missing mappings remain explicit, never fabricated.
- Secrets and sensitive payloads are removed while preserving diagnostic meaning.
- Aggregate counts reconcile with case rows and overall outcome.
- The artifact is append-only evidence and must not be edited to change an outcome.
