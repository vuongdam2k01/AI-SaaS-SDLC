---
id: ACCESS-CONTROL
artifact_type: access_control
title: Access control
status: draft
created_by_change: GENESIS
depends_on: [PRODUCT-REQUIREMENTS]
decisions: []
supersedes:
---

# Access control

<!-- Single product authority for who may perform which action on which resource under what condition. It does not own identity-provider mechanics, screen layout, or API code. Default deny applies when no rule grants access. -->

## Authority boundary

- Owns: subject/role semantics, resources, actions, conditional decisions, and denial behavior.
- Does not own: authentication protocol, credential storage, wire schema, or processing sequence.
- Downstream API, screen, job, and test artifacts reference ACCESS IDs rather than restating permission matrices.

## Roles and subjects

| Subject/role ID | Meaning | Membership source | Scope | Prohibited assumptions |
|---|---|---|---|---|
<!-- Use ROLE-* or SUBJECT-* IDs. Personas describe behavior and are not automatically authorization roles. -->

## Resources and actions

| Resource ID | Resource meaning | Owning entity/subsystem | Actions | Ownership/tenant key |
|---|---|---|---|---|
<!-- Use RES-* IDs and semantic actions; avoid transport method names. -->

## Access rules

| Access ID | Subject or role | Resource | Action | Condition | Decision | Denial behavior |
|---|---|---|---|---|---|---|
<!-- Use ACCESS-001 onward. Decision is allow/deny; conditions include ownership, tenant, state, or delegated scope. A single-user installed product states its boundary as the operating-system user account or device instead of a tenant; "not applicable, single-user product" with the device/account boundary named is a complete answer, not a gap. -->

## Denial behavior

- Default decision: deny unless one applicable rule explicitly allows.
- Existence disclosure: <!-- when denial must conceal resource existence -->
- Error authority: <!-- ERROR-CATALOG codes -->
- State guarantee: denial performs no protected read disclosure or mutation.
- Audit obligation: <!-- events/fields without sensitive payloads, if applicable -->

## Completion contract

- [ ] Roles/subjects are distinct from personas and have an authoritative membership source.
- [ ] Every product action/resource combination is allowed or deterministically denied.
- [ ] Tenant, ownership, state, and existence-disclosure rules are explicit.
- [ ] Screens, APIs, jobs, and tests reference ACCESS IDs and cover denial/no-state-change behavior.
