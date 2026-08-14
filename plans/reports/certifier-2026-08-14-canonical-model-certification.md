# Canonical-model certification — release 1.19.0

Date: 2026-08-14. Trigger: the author asked for the whole 1.19.0 improvement set to be tested.

Method, in order: (1) the full deterministic suite, (2) a real-binary drive of every new capability on repositories built from an empty directory through `bin/ai-saas-sdlc`, (3) **adversarial red-proofs** of the two highest-risk claims — each new check deliberately broken, observed failing, then restored and observed passing, (4) packaging and strict host validation. Fixture bodies come from `tests/fixtures/complete-saas/*-content.ts`; **every engine state transition ran through the packaged binary**, never through `src/`.

## Part I — What the red-proofs found

A check that passes the first time proves nothing until it has been seen failing. Two claims were broken on purpose.

| # | Claim under test | Result |
|---|---|---|
| P1 | An accepted, baselined ADR is exempt from a contract that tightens after it was sealed | **Found a vacuous test.** The first version of the check asserted no error on `ADR-APPROVAL-001` — but `addApprovalFeature` never materializes an ADR, so the assertion held against an artifact that did not exist. Disabling the exemption left the check green. Fixed by materializing the ADR with `adr_status: accepted`, baselining it, and asserting the manifest actually sealed it before the tightening. Re-proved: exemption off → `CONTENT_TABLE_MISSING` on the sealed ADR; exemption on → clean, while the mutable screen still fails the same tightened contract. |
| P2 | `declaredScreenIds` reads the Local-ID column of the Actions and Validation tables, not the body, so a cross-reference to another screen cannot register as a declaration | Replacing it with a body-wide regex produced `['E-01','E-02','E-09','V-01']` against an expected `['E-01','E-02','V-01']` — `E-09` leaking in from the prose cross-reference `SCR-B-002#E-09`, exactly the false positive the column read exists to prevent. Restored and green. |

Two tooling artifacts were encountered and are recorded so a later reader does not mistake them for defects: a `\b` written through a shell heredoc reached the file as a literal `0x08` backspace, and the same escape through `node -e` did likewise. Both corrupted the regex under test into one matching nothing, producing a red result for the wrong reason. The proof was redone with a backslash-free regex (`/[EV]-[0-9][0-9]/`) before it was believed.

## Part II — Real-binary certification

All checks passed. Repositories built from an empty directory; every transition through `node <plugin>/bin/ai-saas-sdlc`.

**Generation 5 reaches real instances (2 checks).** `patterns list --json` reported version `5` over 24 types. All 19 semantically creatable types instantiated through `artifact create`; `test_result` was refused, as only an execution may produce one. Every created instance carried the identified tables its type now declares — `AX-` on screen and component, `TX-` on API processing, `CC-` on job, `EM-`/`DL-`/`EP-` on event, `AU-`/`RL-`/`OB-` on integration, `OW-`/`T-`/`REL-`/`RT-` on entity, `B-` on subsystem, `G-` on use case, `EE-` on flow, `DEC-`/`FC-` on decision, `EX-` on all three unit families, the State-guarantee column on integration tests — and every one carried its consumer-derived `Detail rule`.

**Closure warnings across a whole flow (2 checks).** On the complete approval closure, all five closure warnings were silent and both projections rendered with real data (`SCR-APPROVAL-001#E-01`, `ACCESS-001`); `refresh --check` reported synchronized. Adding one unclaimed action produced exactly one `SCREEN_BEHAVIOR_UNCLAIMED` naming `SCR-APPROVAL-001#E-03`, at severity `warning`: `validate` still exited 0 and `baseline create` still succeeded — the no-new-gates doctrine holding under a real repository. Routing that behavior to an open question in qualified form cleared the warning without a case being written, proving the three-destination closure is genuinely three destinations and not one. Separately, adding `ACCESS-003` to the access foundation raised exactly one `ACCESS_UNVERIFIED`, which cleared when a system test claimed it.

**The `00-system` layer (4 checks).** A fresh repository reported no `SYSTEM_DOCUMENT_INCOMPLETE`. Gutting the Content-rules section produced warnings while `validate` still exited 0. Deleting `glossary.md` produced a warning naming the restore path. None of the four documents appeared in `artifact-index.md`, confirming they carry contracts without becoming artifacts — the property that let this layer be closed without moving any existing repository's counts or generated views.

**`patterns migrate` (5 checks).** Against a repository pinned back to generation 4 with an extra pinned file, `--check` reported `4 -> 5` across all three sections and wrote nothing. The real run re-pinned to 5, deleted the stale pinned file, verified its own new snapshot, and printed the system-document consequence explicitly. A hand edit without re-pinning was refused with `snapshot was modified` rather than silently overwritten. `validate` after migration exited 0.

**Contract tightened after a baseline (1 check, red-proved).** With both `architectural_decision` and `screen` given a new required table, the sealed ADR produced no error while the live screen produced `CONTENT_TABLE_MISSING`. The exemption is narrow: it protects only what immutability forbids repairing.

**Shipped-surface consistency (3 checks).** `test-case-derivation.md` is cited from all three places that derive cases. The warning table in the shipped template declares exactly 27 codes and contains all six added this release. The version is identical across `package.json`, both plugin manifests, both marketplace fields and the CLI literal.

## Part III — Deterministic suite and packaging

| Gate | Result |
|---|---|
| `npm run check` | 261 tests / 40 files — typecheck, lint, build, vitest, Codex validation, package check |
| `npm run validate:manifests` | strict Claude plugin and marketplace validation, both passed |
| Package check | 6 Claude skills, 4 agents, 6 Codex skills, 24 patterns, 9 schemas, 52 metadata files; includes an isolated init/validate/refresh/hooks run in a path containing spaces |
| Bundle integrity | `bin/` and `dist/` rebuilt twice to identical digests, in sync with `src/` |

## Part IV — Disposition of the certification checks

The one-off drive was trimmed to the coverage no unit test holds and kept as `tests/packaged-lifecycle.test.ts` (6 checks, ~21 s): generation-5 tables in binary-created instances, the closure lifecycle end to end, the sealed-record exemption, and the shipped-surface consistency checks. The checks that merely re-proved `content-contracts`, `system-documents`, `closure-coverage` and `pattern-migration` through a second path were dropped rather than carried as duplication.

## Part V — Honest limits

- The certification exercises **structural** quality: that declared identifiers reach a destination, that contracts hold, that warnings never gate. It cannot show that a specification's cases are the *right* cases, that a chosen fixture value exposes the defect it should, or that the source design is correct. Those remain judgement, and the `spec-derivation` eval — which requires a model run and is not part of deterministic CI — is where they are graded.
- `SYSTEM_DOCUMENT_INCOMPLETE` did not fire after migration in the smoke repository, because that repository was initialized from the current template and its documents already satisfy the new contracts. The warning is correct to be silent there; a repository whose documents genuinely lag is the case it exists for, and that case is covered in `tests/system-documents.test.ts` rather than by the migration drive.
- Two behavioral claims are asserted by documentation and not executed anywhere: that the derivation protocol produces reproducible case sets between authors, and that the consumer-derived detail rules change what an author writes. Both are model behavior; the evals are the only instrument that can test them, and they require a captured run.
