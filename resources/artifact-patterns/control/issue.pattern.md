---
id: {{ID}}
artifact_type: issue
title: {{TITLE}}
status: open
created_by_change: {{CREATED_BY_CHANGE}}
depends_on: []
decisions: []
implementation: []
supersedes:
---

# {{ID}} — {{TITLE}}

<!-- Contract: records one observed discrepancy against an identified authority and tracks its bounded correction and regression evidence. It is not a feature request, general question, informal note, or substitute for changing the authoritative artifact. Create when actual behavior/content differs from an explicit expected contract and closure spans one or more artifacts. ID is ISS-<AREA>-<NNN>; path is 05-control/issues/<ID>.md. This artifact owns observation, impact, resolution scope, and closure evidence; referenced artifacts own expected behavior. Consumers: affected artifacts, test specs/results, and change closure. Detail rule: the consumer is repairing a specific mismatch, so state the observed and expected behavior with the authority that defines the expectation, and keep the closure minimal rather than opening adjacent work. Lifecycle: open -> resolved; reopen on recurrence. -->

## Purpose and boundary

- Discrepancy class: <behavior / design / data / verification / traceability>
- First observed in: <artifact, path, or result ID>
- Included correction scope: <bounded scope>
- Excluded follow-up: <separate feature/question/decision>

## Observation

- Reproduction or inspection context: <minimum deterministic context>
- Actual: <observed fact, not inference>
- Expected: <precise expected behavior>
- Evidence: <RESULT ID, path/line, sanitized output, or data observation>

## Expected authority

| Authority artifact and local ID | Contract statement | Why authoritative | Ambiguity found |
|---|---|---|---|
| <artifact/local ID> | <expected rule> | <ownership boundary> | <none or exact ambiguity> |

## Impact and affected closure

- Severity basis: <effect and affected scope>
- Security/data impact: <explicit assessment>
- Workaround: <safe bounded workaround or none>

### Affected artifacts

| Artifact or path | Impact | Required change | Closure evidence |
|---|---|---|---|
| <ID/path> | <how affected> | <minimal correction> | <test/result/inspection evidence> |

## Resolution

<!-- Prose by design: this section is empty while the issue is open, so a required table with completed rows would make an open issue unactivatable. A remaining limitation that must outlive the issue belongs in TEST-POLICY or the owning artifact, where it keeps a citable identity. -->

- Root cause: <confirmed cause, separated from symptom>
- Corrected authority or implementation: <what changed and why>
- Compatibility consequence: <none or exact consequence>
- Remaining limitation: <none or bounded limitation>

## Regression evidence

| Verification ID and case | Before | After | Result artifact |
|---|---|---|---|
| <UT/IT/ST ID and TC> | <observed failing condition> | <expected passing condition> | <RESULT ID> |

## Lifecycle and closure contract

### Completion contract

- Open means the discrepancy or required affected-artifact work remains.
- Resolved requires root cause, all affected changes, regression spec, and actual result evidence.
- [ ] Actual and expected are reproducible and the expectation cites authority.
- [ ] All affected artifacts and compatibility/security/data impacts are assessed.
- [ ] The minimal correction updates authority and implementation consistently.
- [ ] Regression evidence uses actual engine-generated results; unresolved follow-up has its own ID.
