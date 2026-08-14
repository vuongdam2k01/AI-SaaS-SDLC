---
id: {{ID}}
artifact_type: ideal_customer_profile
title: {{TITLE}}
status: draft
created_by_change: {{CREATED_BY_CHANGE}}
depends_on: [IDEA-DEFINITION, EVIDENCE-LEDGER]
decisions: []
supersedes:
---

# {{ID}} — {{TITLE}}

<!-- Contract: describes one evidence-backed customer segment, not an invented individual, market total, product scope, or sales plan. Create only when a materially distinct segment changes needs, constraints, buying context, or applicability. ID is ICP-<SEGMENT>; path is 01-discovery/customer-segments/<ID>.md. This artifact owns segment boundaries and segment-level needs; cited evidence remains authoritative in EVIDENCE-LEDGER. Upstream: idea definition and evidence. Consumers: personas, problems, opportunity definition, features, and use cases. Detail rule: the consumer is deciding who to build for and reads the evidence ledger beside this document, so cite evidence IDs rather than restating sources, and state discriminators an outsider could apply rather than adjectives only the author can score. Lifecycle: draft -> active -> superseded. Active requires every completion item below. Replace angle-bracket guidance; examples belong only in comments. -->

## Purpose and boundary

- Segment purpose: <why this segment deserves separate treatment>
- Included: <observable inclusion conditions>
- Excluded: <nearby segments and why they differ>
- Non-purpose: <claims this profile must not make>

## Segment definition

| Dimension | Definition | Observable discriminator | Evidence IDs |
|---|---|---|---|
| Organization or user context | <context> | <testable discriminator> | <EV IDs> |
| Operating scale | <scale> | <testable discriminator> | <EV IDs> |
| Adoption context | <context> | <testable discriminator> | <EV IDs> |

## Context and constraints

| Context | Current condition | Constraint | Consequence for product |
|---|---|---|---|
| <where work occurs> | <current reality> | <hard or soft constraint> | <design implication> |

## Needs and outcomes

| Need | Trigger | Desired observable outcome | Priority basis | Related problem IDs |
|---|---|---|---|---|
| <need> | <when it occurs> | <measurable outcome> | <evidence-based rationale> | <PROBLEM IDs> |

## Evidence and uncertainty

### Evidence register

| Local ID | Claim supported | Evidence-ledger IDs | Strength | Counter-evidence | Last observed |
|---|---|---|---|---|---|
| EV-01 | <claim> | <evidence IDs> | <strong / moderate / weak> | <conflicting signal or none found> | <date> |

- Inferences: <clearly label deductions that are not direct observations>
- Unknowns: <questions that could alter the segment boundary>
- Falsifiers: <observations that would invalidate the profile>
<!-- Prose by design. These are consumed by a human deciding what to research next, not by a downstream artifact citing an ID; the evidence register above carries every claim that must stay traceable. -->

## Applicability

- Applies when: <deterministic conditions>
- Does not apply when: <deterministic conditions>
- Re-evaluate when: <market, evidence, or product condition>

## Completion contract

- [ ] Included and excluded populations are testable, not demographic shorthand.
- [ ] Every material need and constraint cites evidence-ledger IDs.
- [ ] Counter-evidence, uncertainty, and falsifiers are explicit.
- [ ] Related personas and problems use this profile ID consistently.
- [ ] No product behavior, interface design, or commercial fact is asserted here.
