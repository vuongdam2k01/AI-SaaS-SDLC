---
id: UX-RULES
artifact_type: ux_rules
title: Shared UX rules
status: draft
created_by_change: GENESIS
depends_on: [PRODUCT-REQUIREMENTS, ACCESS-CONTROL, QUALITY-REQUIREMENTS]
decisions: []
supersedes:
---

# Shared UX rules

<!-- Owns interaction, feedback, accessibility, and content rules shared across screens/components. Screen-specific fields/actions/transitions stay in SCR; reusable behavior stays in CMP; error codes stay in ERROR-CATALOG. -->

## Authority boundary

- Shared rules use UX-001 onward and apply only under their stated conditions.
- A screen may add local detail but may not contradict an active UX rule without an accepted ADR and explicit applicability boundary.
- Visual styling alone is insufficient; rules describe observable and semantic behavior.

## Interaction rules

| UX rule ID | Rule | Applicability | Rationale | Verification |
|---|---|---|---|---|
<!-- Cover action availability, destructive confirmation, focus, keyboard use, progressive disclosure, and state preservation where applicable. -->

## Feedback and error behavior

| UX rule ID | Trigger | Feedback timing/location | Recovery behavior | Error authority |
|---|---|---|---|---|
<!-- Define loading, empty, success, validation, denial, conflict, retryable, and terminal states without duplicating exact catalog messages. -->

## Accessibility rules

| UX rule ID | Requirement | Applicable controls/surfaces | Semantic evidence | Quality reference |
|---|---|---|---|---|
<!-- Include name/role/value, focus order/restoration, keyboard, announcements, contrast/motion, and error association as required. -->

## Content rules

| Local ID | Rule | Applies to | Observable consequence |
|---|---|---|---|
| CR-01 | Labels name the user's object or action using glossary terms. | <controls and headings> | <string a case can assert> |
| CR-02 | Instructions state what is required before an action, not hidden after failure. | <forms and destructive actions> | <text visible before the action> |
| CR-03 | User-safe messages explain the condition and valid next action without exposing protected details. | <error and denial surfaces> | <what the message must and must not contain> |
| CR-04 | Dates, times, numbers, currencies, and units state format and context, avoiding ambiguous abbreviations. | <every formatted value> | <rendered format a case can assert> |
<!-- Screens and tests cite these rows by ID rather than restating them; an implementation writing its own string where a row applies is drift. -->

## Design tokens

| Token | Value | Applies to | Accessibility note |
|---|---|---|---|
<!-- The product's visual commitment, made in Product Evolution like any other product commitment. Rows use DT-01 onward: semantic palette (primary, on-primary, background, surface, border, destructive, state colors for success/warning/error), spacing scale, typography (families, sizes, weights), radius/elevation where they carry meaning. Screens and components cite these rows by DT ID rather than restating them; an implementation writing its own value where a row applies is drift, and a choice no row governs is the implementer's to make and record here once it becomes shared. Note contrast decisions explicitly (e.g. "adjusted for 4.5:1 on surface"); purely decorative choices with no semantic weight stay out. While a live screen exists with no DT row and no open question citing UX-RULES#design-tokens, DESIGN_TOKENS_UNCOMMITTED stands as the durable record of the missing commitment. -->

## Completion contract

- [ ] Shared interaction rules have stable IDs, applicability, rationale, and verification.
- [ ] Loading/empty/success/error/denial behavior and recovery are deterministic where applicable.
- [ ] Accessibility rules are semantic and observable, not generic conformance claims.
- [ ] SCR/CMP/test artifacts reference UX IDs rather than duplicate shared rules.
- [ ] Design tokens are committed with DT IDs, or the commitment is deferred through an open question citing UX-RULES#design-tokens.
