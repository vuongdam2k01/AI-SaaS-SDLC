export const APPROVAL_VERIFICATION_BODIES: Record<string, string> = {
  unit_test_backend: `# UT-API-APPROVAL-001 — Approval decision unit contract

## Purpose and boundary

- Unit under test: decideApprovalRequest authorization, validation, and transition orchestration.
- Isolation boundary: repository port and clock are controlled without replacing the rules under test.
- Behavior proven: ACCESS-002, BR-02, API V-01/V-02, and unchanged-state failures.
- Non-purpose: no database constraint, HTTP serialization, or actor journey is claimed.

## Target and references

| Reference type | Artifact and local IDs | Why authoritative |
|---|---|---|
| Behavior | FTR-APPROVAL-001#AC-01–AC-03; API-APPROVAL-001#P-01–P-03 | acceptance and processing contract |
| Source | implementation-unconfigured#decideApprovalRequest | mapping is honest until an implementation source is configured |

## Included behavior

- Happy-path rules: BH-01, BR-01, P-01–P-03.
- Boundary and validation rules: BR-02, V-01, V-02.
- Authorization branches: ACCESS-002 denial before protected read detail.
- Failure and unchanged-state rules: FL-01 and FL-02.

## Explicit exclusions

| Local ID | Excluded claim | Reason unit evidence is insufficient | Required handoff |
|---|---|---|---|
| EX-01 | transaction atomicity and unique decision constraint | repository boundary is controlled | IT-APPROVAL-001#TC-01 and TC-03 |
| EX-02 | visible actor journey | UI and HTTP surfaces are absent | ST-APPROVAL-001#TC-01 |

## Test data and isolation

- Input construction: fixed tenant, assigned actor, pending request version 1, and explicit approve/reject inputs.
- Controlled collaborators: repository port records calls while preserving success, conflict, and denial contracts.
- State reset: each case creates a fresh immutable request value and call recorder.
- Time/randomness/concurrency control: fixed clock; concurrency is handed to IT.
- Prohibited evidence: no stub may return success without exercising authorization and transition rules.

## Test cases

| Local ID | Reference IDs | Setup | Stimulus | Expected result | Unchanged-state assertion |
|---|---|---|---|---|---|
| TC-01 | FTR-APPROVAL-001#AC-01, API-APPROVAL-001#P-01–P-03 | assigned actor and pending version 1 | approve with expected version 1 | approved value and one repository commit request | input remains immutable; one commit only |
| TC-02 | FTR-APPROVAL-001#AC-02, API-APPROVAL-001#V-01 | reject with whitespace reason | call decision service | ERR-VALIDATION | repository mutation method is never called |
| TC-03 | FTR-APPROVAL-001#AC-03, ACCESS-002 | actor belongs to another tenant | call decision service | ERR-FORBIDDEN without request detail | no mutation and no decision history call |

## Implementation mapping

| Case IDs | Test path | Test name or symbol | Production symbol |
|---|---|---|---|
| TC-01–TC-03 | implementation-unconfigured | approval decision unit cases | decideApprovalRequest |

## Completion contract

Every case has authoritative references, exact stimulus and assertions, safe isolation, unchanged-state proof, and explicit IT/ST handoffs.
`,
  integration_test: `# IT-APPROVAL-001 — Approval API and store boundary

## Purpose and boundary

- Boundary proven: real decision handler, transaction adapter, and schema commit one terminal decision.
- Included participants: API processing implementation and approval-request data store.
- Excluded scenario scope: browser rendering and contributor submission journey.
- Required evidence: response, persisted request version/state, decision-row count, and rollback state.

## Integration boundary

| Participant | Real or controlled | Contract exercised | State observed |
|---|---|---|---|
| decideApprovalRequest handler | real | API-APPROVAL-001 P-01–P-03 | safe response and transaction request |
| approval database adapter/schema | real local test database | ENT-APPROVAL-001 INV-01/INV-02 and DBML | request row, version, and decision row |

## References and environment

| Reference | Local IDs or operation/schema names | Claim covered |
|---|---|---|
| FTR-APPROVAL-001 | AC-01–AC-03 | success, validation, denial, and conflict |
| API-APPROVAL-001 | decideApprovalRequest, V-01/V-02, P-01–P-03, S-01/S-02 | authorized atomic processing |
| ENT-APPROVAL-001 | ST-01–ST-03, INV-01/INV-02 | legal transition and one decision |
| SYSTEM-INVARIANTS | INV-001, INV-002 | tenant isolation and single-decision uniqueness at the real store boundary |
| UT-API-APPROVAL-001 | EX-01 | the unit exclusion this specification receives |

- Required configuration class: local disposable database with migrations; no network or secret.
- External dependency strategy: none; database boundary is real and local.
- Prohibited substitution: replacing the data adapter or constraint with an in-memory success stub invalidates the claim.

## Data setup and cleanup

- Initial state: tenant-a request assigned to approver-a, pending at version 1; tenant-b actor exists.
- Setup method: direct fixture insert is allowed because request submission is outside this boundary.
- Isolation key: unique tenant and request UUID per case.
- Cleanup: rollback per case or deterministic tenant-key deletion after assertions.
- Sensitive data rule: reserved synthetic identities and non-personal reason strings only.

## Test cases

| Local ID | Reference IDs | Setup | Stimulus | Expected cross-boundary result | State guarantee | Cleanup |
|---|---|---|---|---|---|---|
| TC-01 | FTR-APPROVAL-001#AC-01, INV-02, INV-002 | pending version 1 assigned to actor | POST approve at version 1 | approved response, version 2, exactly one matching decision row | committed atomically; no second decision row exists | rollback fixture transaction |
| TC-02 | FTR-APPROVAL-001#AC-03, ACCESS-002, INV-001 | tenant-b actor and tenant-a request | POST approve | ERR-FORBIDDEN and no exposed request body; row unchanged | tenant-a request keeps version 1 and empty history | delete isolated tenant fixtures |
| TC-03 | FTR-APPROVAL-001#AC-03, API-APPROVAL-001#V-02, INV-002, UT-API-APPROVAL-001#EX-01 | two decisions race with expected version 1 | release both commits concurrently against the real version check and unique constraint | one success and one ERR-DECISION-CONFLICT | exactly one state and version transition and one decision row after both settle | rollback fixture transaction |

## Implementation mapping

| Case IDs | Test path | Test name or symbol | Exercised boundary |
|---|---|---|---|
| TC-01–TC-03 | implementation-unconfigured | approval API integration cases | handler, transaction adapter, and approval schema |

## Completion contract

Two real participants, contract references, deterministic data, success/denial/race outcomes, cleanup, and exact cross-boundary observations are specified.
`,
  system_test: `# ST-APPROVAL-001 — Client decides a request

## Purpose and boundary

- Actor or system outcome proven: assigned client approver sees and makes one binding request decision.
- Scenario start and terminal states: authorized actor and pending request through approved/rejected or safely unchanged failure.
- Included surfaces: decision screen, API operation, and authoritative request state.
- Excluded technical proof: internal branch isolation and database constraint mechanics remain UT/IT claims.

## Scenario boundary

| Participant or surface | Role | Contract references | Observable evidence |
|---|---|---|---|
| assigned client approver and decision view | initiate and observe decision | UC-APPROVAL-001, SCR-APPROVAL-001 | enabled controls, announced terminal state, safe errors |
| decision API and request query | commit and expose authority | API-APPROVAL-001, ENT-APPROVAL-001 | response plus terminal state and audit history |

## References and environment

| Reference | Local IDs | Scenario claim |
|---|---|---|
| FTR-APPROVAL-001 | AC-01, AC-02, AC-03 | success, rejection validation, and safe denial/conflict |
| UC-APPROVAL-001 | M-01, M-02, A-01, X-01, X-02 | actor paths and guarantees |
| FLOW-APPROVAL-001 | S-01, S-02, D-01, C-01 | request-to-decision outcome |
| SCR-APPROVAL-001 | E-01, E-02, V-01, T-01, T-02 | visible interaction behavior |

- Starting configuration class: local test application with seeded tenants and no external service.
- Identity and access setup: assigned approver-a and unauthorized tenant-b actor.
- External-boundary treatment: none; notifications are outside the scenario.
- Evidence capture: terminal UI state, safe error text, request query, and decision-history query in an engine result.

## Data setup and cleanup

- Starting state: one pending request per case created through the supported submission setup path under ACCESS-001.
- Setup path: fixture invokes the product submission API because pending visibility depends on it.
- Isolation key: unique tenant slug and request UUID.
- Cleanup or expiry: delete fixture tenant through the test cleanup endpoint after assertions.
- Sensitive data rule: use synthetic agency, actor, and deliverable values only.

## Test cases

| Local ID | Reference IDs | Starting state | Actor actions or event | Observable outcome | Final state |
|---|---|---|---|---|---|
| TC-01 | FTR-APPROVAL-001#AC-01, UC-APPROVAL-001#M-01/M-02, SCR-APPROVAL-001#E-01/T-01 | assigned actor opens pending request | activate Approve and confirm | approved is announced; controls disabled; history names actor and time | approved version 2 with one decision |
| TC-02 | FTR-APPROVAL-001#AC-02, UC-APPROVAL-001#A-01, SCR-APPROVAL-001#V-01 | assigned actor opens pending request | activate Reject with whitespace reason | exact validation appears and focus returns to reason | request remains pending version 1 |
| TC-03 | FTR-APPROVAL-001#AC-03, UC-APPROVAL-001#X-01 | tenant-b actor has request URL | navigate to URL and attempt access | safe denied view contains no request details | tenant-a request remains pending |
| TC-04 | FTR-APPROVAL-001#AC-03, UC-APPROVAL-001#X-02, SCR-APPROVAL-001#E-02, UT-API-APPROVAL-001#EX-02 | screen held open after another actor decided the request | activate Reject on the stale screen | conflict message appears, then the terminal state reloads | first decision remains the only decision |

## Implementation mapping

| Case IDs | Test path | Scenario name | Surfaces exercised |
|---|---|---|---|
| TC-01–TC-04 | implementation-unconfigured | assigned approver decision journey | browser view, decision API, request/history query |

## Completion contract

Main, alternate, denial, validation, and stale-conflict paths trace to acceptance and assert both visible outcomes and authoritative final state.
`
};
