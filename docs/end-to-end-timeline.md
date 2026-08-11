# End-to-End Timeline

The repository advances in response to external observations and explicit decisions. Four flows mutate state; Inspect State is read-only. There is no separate scaling stage or approval pipeline.

## t0: Install and initialize

Install the appropriate Claude or Codex adapter, then work from a separate documentation repository. Genesis calls `init` when needed. Initialization copies the fixed project skeleton, pins the installed pattern source to `00-system/patterns/`, captures the raw idea when supplied and creates empty engine state. No baseline exists yet.

## t1: Genesis

Input is the owner's raw idea and explicit constraints. The host preserves the idea, derives bounded research questions, performs real public-web search/page inspection and appends attributable `EVD-*` records. It synthesizes customer/problem, market, alternatives, commercial assumptions, feasibility and opportunity.

Only selected discovery details are instantiated from the pinned catalog. One consolidated interaction resolves material product choices that evidence and explicit input cannot decide. Product foundations become active; no feature, design or test artifact is pre-created.

```text
raw idea + inspected public sources
  -> discovery foundations and selected detail
  -> product requirements, access, quality and invariants
  -> validation
  -> EVR-001 + BL-000
```

## t2: First Product Evolution

Input is one semantic intent, such as allowing an agency to request approval for a content version. The flow creates `CHG-001`, forms observable FTR behavior and stable acceptance IDs, derives UC/FLOW paths and allocates only the design boundaries that exist.

```text
intent
  -> FTR
  -> UC and FLOW
  -> conditional SCR/CMP/SUB/API/ENT/INT/JOB/EVT/PLT and owning interface/schema files
  -> UT/IT/ST specifications
  -> mapped implementation and exact configured verification, when available
  -> refresh + validate + BL-001
```

New scalable artifacts start as pinned-pattern drafts. They become active only after their content contracts and references are complete. An ADR appears only for multiple viable, durable or expensive-to-reverse alternatives. Unconfigured test execution remains `not-configured` rather than an inferred pass.

## t3: Later feature or shared change

Another Evolution may add, refine, consolidate, break, deprecate or retire behavior. The engine compares the worktree with the current baseline and unions old/new relationship graphs. A shared access rule, invariant, component, subsystem, API, entity, integration, job, event, ADR or interface/schema contract-file change can therefore reach earlier features and their regression tests.

Only the affected closure changes. Permanent IDs and files remain when records are deprecated, retired or superseded. Selected UT/IT/ST commands run through the engine, and the successor baseline records the resulting state.

## tn: Evidence Reassessment

Input is one evidence question or changed public signal, not an instruction to redesign the product. The flow searches only the delta, appends current and contrary observations, and updates affected discovery synthesis.

```text
new source or stale claim
  -> new EVD records and scoped discovery revision
  -> optional ISS when product truth may be invalid
  -> new EVR, same BL identity
```

Choosing a product response is a later Evolution event.

## tn+failure: Reconciliation

Input is a concrete failed execution, inspected code drift, interface mismatch or specification contradiction. The flow reproduces or inspects it, creates/updates an issue, determines authority and repairs only the wrong side plus affected regression.

The engine retains the failed `EXEC-*`/`RESULT-*`. A repaired rerun receives a new identity. Once the issue, canonical contract, mapped implementation and selected regression agree, the flow creates a successor baseline.

## Any time: Inspect State

Inspect State reads state, validation, impact, test selection, projections and scoped canonical/control artifacts. It reports facts, inferences and unknowns without changing files or temporal state.

## Editorial edits and legal repetition

Spelling, tone and formatting may use `refresh --editorial` after deterministic checks prove the change is body-only and outside protected evidence/metadata/history. No flow, change, test run or baseline advance occurs.

Another mutation loop requires a new public source, changed source, explicit product decision, inspected file/code diff, execution result or concrete contradiction. Model self-review of unchanged model-authored prose is not evidence and cannot justify another loop.
