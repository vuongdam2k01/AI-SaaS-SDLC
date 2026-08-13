---
id: EVIDENCE-LEDGER
artifact_type: evidence_ledger
title: Evidence ledger
status: draft
created_by_change: GENESIS
depends_on: [IDEA-ORIGINAL]
decisions: []
supersedes:
---

# Evidence ledger

<!-- Single source of truth for dated external or internal observations used by discovery artifacts. Do not store credentials, personal contact records, fabricated sources, or unsupported conclusions. -->

## Evidence records

| Evidence ID | Claim or observation | Source | Source type | Observed or published date | Retrieved date | Strength | Applicability |
|---|---|---|---|---|---|---|---|
<!-- Use EVD-001 onward. Source names link to the matching per-source section below. Source must be resolvable; record exact section/page where useful. Strength reflects source fitness for this claim, not reputation alone. -->

## Source quality rules

- Prefer primary, dated, directly observable sources for factual claims.
- Record authorship/provenance, publication/observation date, retrieval date, and scope.
- Note sample, method, commercial incentives, staleness, and conflicts when they affect interpretation.
- Quotations remain short; record the observation in neutral language.

## Claim mapping

| Claim ID or downstream artifact | Supporting evidence IDs | Counter-evidence IDs | Inference boundary | Confidence rationale |
|---|---|---|---|---|
<!-- A downstream claim may have multiple evidence rows; no evidence row automatically proves a broader claim. -->

## Contradictions and aging

| Topic | Conflicting evidence IDs | Nature of conflict | Applicability difference | Recheck condition |
|---|---|---|---|---|
<!-- Preserve contradictions. Supersede an evidence observation only when the source fact changes; never delete an inconvenient record. -->

## Completion contract

- [ ] Every material discovery claim maps to resolvable, dated evidence or is labeled inference/unknown.
- [ ] Source fitness, applicability, counter-evidence, and freshness are explicit.
- [ ] Evidence records state observations rather than recommendations.
- [ ] No source, date, measurement, or confidence has been fabricated.

<!-- Add one concrete section per source after this completion contract. The heading ID must match table references. Delete this commented example rather than activating it as evidence.

## EVD-001 — <concise source title>

- URL: https://<resolvable-source-host>/<source-path>
- Source type: <primary specification / dataset / research paper / public first-party page / other precise type>
- Author or publisher: <responsible party>
- Observed or published date: <YYYY-MM-DD or explicitly unknown>
- Retrieved date: <YYYY-MM-DD>
- Retrieval: <RET-### when the engine retrieved this page; omit the line for host-tool inspection>
- Applicable scope: <population, product/version, geography, and conditions>
- Relevant location: <section, page, table, or record identifier>
- Observation: <neutral fact supported by this source>
- Strength: <strong / moderate / weak with reason>
- Limitations: <method, sample, incentive, staleness, or missing context>
- Counter-evidence: <EVD IDs or none found>
-->
