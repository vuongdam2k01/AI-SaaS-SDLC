---
id: {{ID}}
artifact_type: platform_target
title: {{TITLE}}
status: draft
created_by_change: {{CREATED_BY_CHANGE}}
depends_on: [PRODUCT-REQUIREMENTS, QUALITY-REQUIREMENTS, ARCHITECTURE-OVERVIEW]
decisions: []
implementation: []
supersedes:
---

# {{ID}} — {{TITLE}}

<!-- Contract: specifies the product-visible consequences of shipping on one distributed platform or channel, such as a desktop operating system, a mobile operating system, a store listing, or a web install channel. It owns platform constraints and their product consequences, operating-system capabilities and permissions with denial behavior, user-visible distribution and update behavior, local data stores with cross-version rules, and platform-conditional verification consequences. It does not own build pipelines, signing, release automation, deployment or runtime operations, and it does not restate behavior that FTR, UC, SCR, API or INT artifacts already own. Create one per platform or channel whose constraints, permissions, update behavior or local data differ materially; a platform with no distinct consequence needs no artifact. A platform the design commits to is active even when the running machine cannot yet prove it: carry the unproven-ness in the evidence layer — no verification command declares it, TEST-POLICY records why, and the standing PLATFORM_EVIDENCE_MISSING warning is that record — never by leaving the artifact draft, because a draft artifact created by the open change blocks that change's own baseline. ID is PLT-<AREA>-<NNN>; path is 03-design/platforms/<ID>.md. Upstream: PRODUCT-REQUIREMENTS, QUALITY-REQUIREMENTS, ARCHITECTURE-OVERVIEW, ACCESS-CONTROL, SYSTEM-INVARIANTS, affected FTR/UC and decisions. Consumers: screens, API/JOB/INT design, IT and ST specifications, and implementation. Detail rule: the consumer is implementing and verifying platform-conditional behavior, so state the constraint and its product consequence with its source, and leave build, signing and distribution procedure out entirely. Lifecycle: draft -> active -> superseded. -->

## Purpose and boundary

- Platform or channel: <operating system, store, or install channel and edition>
- Why this target is distinct: <constraint, permission, update or local-data behavior that differs here>
- Included scope: <features and surfaces shipped on this target>
- Excluded responsibilities: <build, signing and deployment procedure; behavior owned by FTR/SCR/API/INT>

## Platform constraints

| Local ID | Constraint | Authority or source | Product consequence | Applies when |
|---|---|---|---|---|
| C-01 | <minimum OS or runtime version, sandbox rule, store policy> | <platform or store document and observed date> | <behavior the product must adopt or forgo> | <versions, editions or regions affected> |

## Capabilities and permissions

| Local ID | Capability or permission | Purpose | Request timing | Denial or revocation behavior | Feature or access references |
|---|---|---|---|---|---|
| P-01 | <notifications, filesystem, camera, location, background execution, global shortcut, file association, deep link> | <FTR outcome it serves> | <install, first use, or explicit user action> | <observable degraded behavior when denied, revoked, or already held by another application> | <FTR/AC/ACCESS IDs> |

## Distribution and update behavior

| Local ID | Concern | Behavior | User-visible consequence | Failure or rollback behavior |
|---|---|---|---|---|
| D-01 | <acquire and install, update, or rollback> | <channel and mechanism as the user experiences it> | <restart requirement, version skew, staged availability> | <what the user observes and can do when it fails> |
<!-- One row per concern the user can observe. Acquisition, update and rollback each deserve their own row when their behavior differs. -->

## Local data and migration

| Local ID | Store | Data and sensitivity | Lifetime and scope | Cross-version rule | Loss or corruption behavior |
|---|---|---|---|---|---|
| M-01 | <store name, or none> | <what is kept and its classification> | <per user, device or install; survives update or not> | <migration or compatibility rule across shipped versions> | <recovery behavior or explicitly declared loss> |

## Verification consequences

| Local ID | Upstream IDs | Platform-conditional claim | Observed at | Evidence expectation |
|---|---|---|---|---|
| V-01 | <AC/BR/QR/INV IDs> | <how the claim changes or must still hold on this platform> | <boundary or surface where the difference is observable> | <per-platform execution evidence required> |
<!-- Cite upstream acceptance, rule, quality and invariant IDs only. Downstream UT/IT/ST specifications claim these consequences later and are never named here; a specification that does not exist yet cannot be referenced. When verification commands exist, evidence for this target is declared by adding platforms: [<this ID>] to the commands that exercise it; ENGINE validate reports PLATFORM_EVIDENCE_MISSING while no command declares it. The optional frontmatter field host_os declares the process.platform token evidence records for this target are expected to be observed under (win32, darwin, linux; an iOS target exercised from macOS machines declares darwin). It is a human claim like the platforms declaration itself and is never merged with the recorded host: when every recorded execution declaring this target observed a different host os, validate reports PLATFORM_EVIDENCE_CONTRADICTED as a standing warning. Once any platform target exists, generated/platform-coverage.md joins targets, declaring commands, latest executions and observed hosts into one reviewable view. -->

## Traceability

- Upstream requirements and quality budgets: <PRODUCT-REQUIREMENTS and QR IDs>
- Affected features and journeys: <FTR/UC/FLOW IDs>
- Constrained design artifacts: <SCR/API/ENT/INT/JOB IDs this target limits or changes>
- Decisions: <ADR IDs, or none with reason>

## Completion contract

- [ ] Every constraint, permission, distribution concern, local store and verification consequence has a stable local ID.
- [ ] Every permission states a product purpose and a deterministic denial or revocation behavior.
- [ ] Update and rollback behavior is stated as the user experiences it, without build or deployment procedure.
- [ ] Local data declares sensitivity, lifetime and a cross-version rule or an explicit loss statement.
- [ ] Verification consequences cite upstream acceptance, rule, quality or invariant IDs only.
