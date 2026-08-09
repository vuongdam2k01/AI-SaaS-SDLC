# Phase 2 — Artifact Patterns and Seeded Foundations

## Context Links

- [Artifact inventory and quality contract](research/artifact-inventory-and-quality-contract.md)
- [AI-SDLC case-study findings](research/case-study-findings.md)

## Overview

Priority: critical  
Status: complete  
Replace all shallow templates and singleton stubs with usable information contracts generalized from the case study.

## Key Insights

The target is not maximum length. Each section must remove a concrete implementation ambiguity. Rich patterns need stable local IDs, tables, allocation rules, examples and trace joins; project-specific technology and ceremonial metadata should be excluded.

## Requirements

- Rebuild all 23 scalable patterns, not only FTR/SCR/API/testing.
- Rebuild 19 singleton/fixed project documents: eight discovery, four product, six design/fixed and test policy/questions.
- Preserve UT/IT/ST exactly; viewpoints are not extra levels.
- Each pattern states canonical authority and prevents duplication with adjacent artifacts.
- Each pattern includes conditional sections instead of forcing irrelevant content.
- Include one complete non-user project specimen under `tests/fixtures/complete-saas/` and/or `docs/examples/`; never seed its content as evidence into user repositories.

## Architecture

Patterns are contracts. Live artifacts instantiate them. A catalog binds each type to a target path and completion schema. Structured sections and table columns are machine-checkable; explanatory examples stay in HTML comments or dedicated sample fixtures so users do not mistake them for product facts.

## Related Code Files

Replace/create under:

- `resources/artifact-patterns/discovery/{competitor,ideal-customer-profile,persona,problem}.pattern.md`
- `resources/artifact-patterns/product/{feature,use-case,business-flow}.pattern.md`
- `resources/artifact-patterns/design/{screen,shared-component,subsystem,api-processing,domain-entity,external-integration,background-job,event}.pattern.md`
- `resources/artifact-patterns/verification/{unit-test-backend,unit-test-frontend,unit-test-job,integration-test,system-test,test-result}.pattern.md`
- `resources/artifact-patterns/control/{issue,architectural-decision}.pattern.md`
- `resources/project-template/01-discovery/*.md`
- `resources/project-template/02-product/*.md`
- `resources/project-template/03-design/**`
- `resources/project-template/04-verification/test-policy.md`
- `resources/project-template/05-control/questions.md`
- `resources/project-template/00-system/{document-rules,validation-rules,artifact-lifecycle,glossary}.md`

Create:

- `schemas/artifact-content-contracts/*.json` or one data-driven YAML/JSON catalog
- `docs/examples/approval-workflow-saas/**` or equivalent complete specimen
- template-contract unit tests and fixture snapshots

## Implementation Steps

1. Define common metadata plus artifact-specific section/table/local-ID contracts in a data file consumed by generation and validation.
2. Rebuild discovery patterns with evidence/counter-evidence, scope, inference and falsifier fields; no interview-shaped placeholders.
3. Rebuild FTR/UC/FLOW patterns so acceptance IDs, alternate/error paths and cross-feature interactions are independently traceable.
4. Rebuild SCR/CMP using the case-study semantic order and local IDs; add state/accessibility/unchanged-state coverage appropriate for SaaS.
5. Rebuild API with shared-rule reference, processing sequence, transaction/concurrency/idempotency, error mapping and reverse user-action mapping while OpenAPI owns wire schemas.
6. Rebuild ENT/INT/JOB/EVT/SUB with field-level/state/failure/version/budget contracts, using conditional AI sections only in SUB/quality requirements.
7. Rebuild UT/IT/ST with target/exclusion, trace, data, concrete case, unchanged-state assertion and lower→higher-level handoff. Rebuild RESULT as engine-only execution evidence.
8. Rebuild ADR/ISS with exact question/observation, authority, alternatives/impact, minimal repair and regression evidence.
9. Deepen singleton foundations so Genesis can synthesize a complete product basis without scalable features.
10. Produce a filled multi-feature sample showing all joins; label every source as fixture data, never real market evidence.

## Todo List

- [x] 23 scalable patterns meet the common quality bar.
- [x] All singleton/fixed documents have useful schemas.
- [x] Pattern catalog maps every type to exactly one target glob.
- [x] Complete sample demonstrates real depth and traceability.
- [x] No duplicate authority across pattern types.

## Success Criteria

- A fresh agent can fill each pattern without inventing its structure or wondering where adjacent information belongs.
- Every FTR acceptance criterion maps to behavior, conditional design and at least one UT/IT/ST as appropriate.
- Every UT exclusion that requires higher-level proof appears in an IT/ST handoff mapping.
- API, OpenAPI, ENT/schema, SCR/UX-rules and error-catalog authority boundaries are unambiguous.
- Empty headings, placeholder rows and generic prose cannot satisfy `active` completion.

## Risk Assessment

- Risk: reproducing fqe-docs length without value. Mitigation: every field must answer a named implementation/test question; remove project-specific fields.
- Risk: excessive universal requirements. Mitigation: explicit applicability predicates and `not-applicable` with reason only for conditional sections.
- Risk: duplicated examples become false facts. Mitigation: examples are comments/fixtures and stripped from instantiated artifacts.

## Security Considerations

Patterns must cover tenant isolation, authorization, sensitive-data classification, retention/deletion, secret boundaries and user-safe errors without fabricating compliance claims.

## Next Steps

Phase 3 defines how each flow transforms inputs into these artifacts.
