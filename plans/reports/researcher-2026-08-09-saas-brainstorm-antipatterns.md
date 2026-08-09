# SaaS-idea-brainstorm: workflow and anti-pattern audit

Date: 2026-08-09  
Scope: `C:\Users\vuong.dam\Desktop\beo\SaaS-idea-brainstorm`, compared where relevant with the current `AI-SaaS-SDLC`.  
Method: direct inspection of skills, normative template skills, legacy templates, agents, hooks, scripts, process documentation, tests and current AI-SaaS-SDLC contracts. No implementation files changed.

## Conclusion

`SaaS-idea-brainstorm` contains strong research discipline and unusually detailed implementation-blueprint content. Its failure is not lack of rigor. Its failure is that rigor is implemented as a large procedural state machine whose control record often costs more than the product decision being protected.

The useful core is:

1. preserve the original idea and distinguish user statements, AI interpretations, assumptions and sourced evidence;
2. research alternatives broadly, including DIY, general-purpose tools and the rational status quo;
3. normalize time-sensitive competitor facts and retain source limitations and contradictory evidence;
4. convert research into a selected customer/problem/opportunity boundary;
5. make implementation artifacts field-level, state-aware, failure-aware and cross-referenced;
6. use explicit stop conditions for research and require a new observation before repeating work.

The parts that must not be transferred are:

- ten mandatory gates and an adversarial model review at every gate;
- mandatory human interviews, prospect lists, presales, outreach and concierge work;
- self-review loops over unchanged model-authored prose;
- ceremonies and duplicate audit representations for routine decisions;
- copied packs plus current baselines plus cycle mirrors as parallel truths;
- templates that duplicate the normative template skills;
- fixed artifact production when the product does not require the artifact.

The current `AI-SaaS-SDLC` correctly rejects the interview/outreach/gate machinery, but it over-corrects into under-specification. Its current skills, protocols and templates name the right categories but do not provide enough operational method, field semantics or worked completion rules to reliably produce build-ready documents.

## 1. Actual temporal workflow

### Intake and framing

`new-idea` creates a workspace, immutable raw idea, state index, decision log, founder charter and private area, asks checkpoint and integration-audit questions, then invokes stage 0 (`skills/new-idea/SKILL.md:11-40`).

Stage 0 performs six substantial tasks before the first gate:

- classifies every intake statement as source-stated, evidence-backed, interpretation, assumption or unknown;
- asks all blocking framing questions;
- separates the problem from the proposed solution;
- fills a nine-cell Lean Canvas;
- classifies market type, market shape and regulatory exposure;
- selects a beachhead, requires a target of 20 publicly identifiable tier-4/5 prospects, constructs an assumption map, Test Cards and dated kill criteria.

Evidence: `skills/stage-0-framing/SKILL.md:9-75`; the target prospect bar is at `skills/stage-0-framing/SKILL.md:45-54` and contractually enforced in `skills/method-rules-gate-contracts/SKILL.md:13`.

It then runs gate F. Stage 1 may begin after task 0.1, so this section is a DAG rather than a strict queue (`README.md:86-109`).

### Competitive research

Stage 1 spawns two custom agents: competitor scanning and review/community mining. It produces a five-tier map, detailed competitor profiles, negative-review clusters, source registry, raw agent reports and market verdict. Facts are normalized by currency, tax, billing period, edition, locale, observation date and capability state (`skills/stage-1-competitive/SKILL.md:9-27`).

The five tiers are genuinely useful: direct, indirect, DIY, general-purpose AI/tooling and do-nothing/status quo. The agent instructions correctly warn that status quo must describe the rational current behavior, not merely say “do nothing” (`agents/competitor-scanner.md:40-57`).

Stage 1 ends at gate C.

### Market validation

Stage 2 contains three sequential gates (`skills/stage-2-validate/SKILL.md:7-64`):

- V1: preregister and hash a sampling frame, mine public discussions and/or conduct interviews, build the evidence ledger and calculate past-behavior prevalence;
- V2: generate 2–3 solution directions, perform a direct-model gap test, build mocks and landing kit, record every session and select a winning direction;
- V3: build a presell kit and obtain real-money commitments or accept the gate as open.

The default public-web miner is real, but the artifact and gate model still assumes human validation as the higher-value path. V1 contractually requires behavioral evidence; stage 0 requires reachable named prospects; V2 session accounting and V3 money commitments remain core concepts. This does not match an AI-only, one-sided research scope.

### Feasibility and value verification

Stage 3 runs in parallel with stage 2 when feasibility is deadly, always for AI-core products (`README.md:96`; `skills/stage-3-verify/SKILL.md:7-26`). It creates a real-data spike, run contract, error analysis batches, failure taxonomy, eval harness, promise scope, unit-economics analysis and possibly a concierge kit.

Its strongest contribution is error-analysis-first: inspect representative outputs before inventing eval criteria. Its costliest form allows repeated 10–20 trace batches, potentially approaching 100 traces, followed by a merge and a saturation rule (`skills/stage-3-verify/SKILL.md:22`). This is appropriate only when an actual AI subsystem exists and representative data is available; it is unsuitable as a mandatory Genesis activity.

R1 checks buildability/quality/cost. R2 checks whether delivered work creates the promised result.

### Positioning, scope lock and implementation blueprint

Stage 4 constructs a positioning thesis from evidence and ends at P. Stage 5 creates the core loop, measurable aha event, explicit cut list, technical design contract, condensed decision table, event plan, Definition of Done and self-contained MVP pack. Before LOCK it finalizes the founder charter, copies documents into the pack, then runs a cold-start agent test.

Stage 6 refines the pack into a detailed blueprint and ends at BP. It creates feature specs, field-level schema, UX, API/integration contracts, NFRs, test plan, build order, and conditional subsystem/interaction documents. It then runs a deterministic validator, copies the pack and blueprint to a temporary directory, runs a second cold-start agent, persists a hash-matched report, and only then invokes the BP gate (`skills/stage-6-blueprint/SKILL.md:209-232`).

### Post-lock maintenance

After LOCK/BP, scope artifacts are immutable. Product departure is appended to a drift inbox, then `reconcile` opens a transaction, records reality observations, compares them to projections/evidence, routes impacted claims, publishes versioned baselines and manifests, and signs validation runs (`skills/reconcile/SKILL.md:11-51`).

A specification defect after BP becomes an immutable amendment plus amendment-log row; a product-scope change becomes drift/reconciliation (`skills/amend-blueprint/SKILL.md:24-84`). A pack-predicate change creates a child cycle with its own gates and state (`README.md:117-125`).

This history-preservation principle is useful. The cycle-wide replay of the discovery gate machinery is not.

## 2. Why the process consumes excessive tokens and time

### Instruction context is already very large before project artifacts are read

Approximate repository instruction size, calculated directly from current files:

| Group | Files | Lines | Approximate tokens |
|---|---:|---:|---:|
| `skills/` | 35 | 3,885 | 95,291 |
| `scripts/` | 23 | 6,252 | 81,186 |
| `hooks/` | 5 | 1,111 | 14,737 |
| `agents/` | 5 | 370 | 10,321 |
| `templates/` | 17 | 1,545 | 18,316 |

These are total repository figures, not a claim that every file is loaded in one prompt. However, representative load bundles are already expensive before any idea artifact or web source enters context:

| Operation | Approximate instruction context |
|---|---:|
| New idea + method/state + stage-0 templates | 19,783 tokens |
| Minimum gate check + method + gate contracts | 23,030 tokens |
| BP gate bundle | 27,268 tokens |
| Stage 6 + template/method/BP contract | 21,574 tokens |

This explains the observed behavior: a large part of every turn is spent reloading the constitution and proving procedural compliance rather than resolving the product question.

### Every gate creates several representations of the same decision

A normal gate attempt can require all of the following:

1. state gate status;
2. required artifacts and their statuses;
3. threshold snapshot and revision chain;
4. gate-input manifest;
5. private verbatim gatekeeper report;
6. redacted audit-trail copy;
7. decision-log verdict row;
8. founder-charter playback/update;
9. optional deviation/override ceremony;
10. cold-start report for LOCK or BP.

This is directly specified in `skills/gate-check/SKILL.md:115-159` and `:161-190`. The integrity goal is legitimate; the number of separately authored representations is not.

The gate workflow runs formal checks, an adversarial model, then a user decision for F, C, V1, V2, V3, R1, R2, P, LOCK and BP (`README.md:98-111`). Even a formal failure invokes the gatekeeper in advisory mode (`skills/gate-check/SKILL.md:144`). Therefore an incomplete stage can still pay the full semantic-review cost.

### The system knows it has a non-convergent self-review problem, but mitigates rather than removes it

The gatekeeper defaults to FAIL when uncertain (`agents/gatekeeper.md:62-66`). Round 2 is restricted to round-1 blocker fingerprints, and round 2 can pass with deviation if no material blocker remains (`skills/gate-check/SKILL.md:148-151`). The rule explicitly says it exists because repeated gatekeeper rounds were opening new wording/editorial findings indefinitely.

This is evidence that the architecture itself produced the loop. Fingerprints and review-scope freeze bound the damage, but the lean solution is to stop running semantic adversarial review as a mandatory lifecycle operation. A model rereading unchanged model-authored prose is not a new observation.

### Research and audit data are repeatedly projected

Competitive research can exist as raw private agent report, source-registry row, evidence-ledger row, competitor profile, competitive-map row, review-mining cluster, provisional journal row and final market-verdict row. This is not a pure normalization pipeline because several representations restate claim content.

Gate review repeats the same finding in a private report, tracked audit trail, verdict row, state status and sometimes a pack copy (`README.md:184-210`; `skills/gate-check/SKILL.md:153-159`).

Post-LOCK adds the frozen pack, current-baseline versions, drift inbox, reconcile intake, claim register, JSON manifest, Markdown manifest view and validation-run artifacts (`skills/reconcile/SKILL.md:39-47`).

### The MVP pack copies content instead of remaining a manifest over canonical sources

The repository explicitly describes `mvp-pack/` as “copies, not references” (`README.md:197-200`). The pack then travels beside the blueprint, while post-LOCK truth moves into current baselines. This creates three time-dependent reading surfaces:

- frozen discovery/scope pack;
- locked blueprint plus amendments;
- current-baseline plus reconcile history.

History is valuable, but copying canonical prose creates reconciliation work by construction. A manifest/baseline can freeze exact hashes without duplicating every source document.

### Conditional complexity becomes universal orchestration complexity

The method supports single-sided, multi-sided, headless, regulated, AI-core, graphics, ledger and agentic products. The stage-6 template handles these through conditional sections, which is good. The gate and state model carries much of their machinery even when not applicable, which is not.

For example, gate-check always resolves cycle and drift boundaries (`skills/gate-check/SKILL.md:111-113`), loads general gate logic, creates a manifest and performs semantic review. A simple first feature therefore pays infrastructure designed for multi-cycle regulated products.

## 3. Redundant or low-value artifacts

### Strongly redundant

| Artifact combination | Problem | Lean replacement |
|---|---|---|
| `templates/0-*.md` through `templates/6-*.md` plus `skills/stage-*-templates/SKILL.md` | Two template families describe the same stages. The README declares skills normative (`README.md:283`), leaving the top-level templates as a stale competing representation. | One canonical template per artifact type, stored as an installed resource and used to instantiate real files. |
| Private gatekeeper report + redacted audit trail + verdict row + state status | One finding is authored/serialized four times. | Deterministic validation result plus one issue/decision record only when material. |
| MVP pack copies + source artifacts + baseline/current baseline | Same product truth exists in multiple prose copies. | Canonical artifacts + immutable baseline manifest/hash; generated read-order/index views only. |
| Founder charter playback at every gate + decision log | Preferences and decisions are repeatedly replayed even when unchanged. | Ask only unresolved material decisions; store durable product decisions in ADR/product artifacts and founder constraints in one short canonical document. |
| Assumption map + kill criteria + carry-forward + feasibility risk + evidence-quality report | The same uncertainty/status is projected across several narrative files. | Evidence ledger + question/issue register + opportunity synthesis; generated coverage can expose unresolved assumptions. |
| Raw research report + source registry + evidence ledger + research synthesis | Raw provenance is useful, but claims and source descriptions are copied too many times. | Evidence ledger is canonical; source cache/raw capture is machine-owned; synthesis references evidence IDs. |
| Condensed ADR table in scope lock + blueprint decision register | Durable decisions have two authored homes. | Real `ADR-*` only when decision criteria are met; ordinary design choices remain in their owning design artifact. |

### Vague or non-actionable for the target scope

- A nine-cell Lean Canvas creates plausible prose for channels, unfair advantage and costs before evidence exists. Useful as a private thinking aid, not required product truth.
- “Why this founder”, taste notes and repeated founder-charter playback may help coaching, but do not directly close an implementation dependency.
- A mandatory list of 20 named prospects measures outreach reach, not whether public-web research can define a viable software requirement.
- Interview, landing, presell and concierge kits are executable market experiments. They are out of the explicitly chosen AI-only research boundary.
- A copy test and money-commitment gate cannot be honestly satisfied through one-sided AI research. Keeping them as gates guarantees OPEN/deferred/override ceremony rather than better information.
- Cold-start agents are valuable as occasional scenario simulations, but their model-authored verdict is not objective evidence. Mandatory reruns after each change recreate the semantic self-review loop.

## 4. Content worth retaining

### Intake and idea clarification

Retain the distinction between:

- the user's exact idea;
- what the user explicitly stated;
- AI interpretation;
- unverified assumption;
- sourced evidence;
- unknown that materially blocks a decision.

The stage-0 template demonstrates this with a precise table and separates blocking from non-blocking questions (`skills/stage-0-framing-templates/SKILL.md:26-58`). Current `original-idea.md` and `idea-definition.md` do not yet provide this complete provenance discipline.

Retain problem framing fields: actor, situation, desired outcome, current workaround, failure/cost, trigger/frequency and disconfirmation condition. Drop the requirement to complete a whole Lean Canvas before research.

### Public-web market research

Retain:

- focused decision questions;
- primary source preference;
- source date, geography, segment, limitations and contrary evidence;
- alternatives across direct, indirect, DIY, general-purpose and rational status quo;
- competitor pricing normalization and capability maturity;
- public complaints/workaround signals labeled anecdotal;
- source deduplication and a finite research budget;
- explicit “unknown” when the web does not support a conclusion.

`competitor-scanner` is particularly good on source normalization, supply-versus-demand separation and rational status quo (`agents/competitor-scanner.md:40-57`). `research_budget.per_task` gives each task maximum rounds/new sources and a saturation stop (`skills/method-rules-state-schema/SKILL.md:48,90`; `agents/competitor-scanner.md:18-38`).

Do not retain named-prospect quotas, interactive evidence grades, sampling ceremonies or human-validation thresholds.

### Opportunity formation

Retain a compact synthesis that answers:

- selected segment/ICP and exclusions;
- job/problem/current alternative;
- evidence supporting and contradicting it;
- buyer/adoption path inferred from public information;
- competitive gap and differentiation boundary;
- commercial model hypotheses and pricing anchors;
- feasibility, regulatory and operational risk;
- opportunity decision, explicit non-goals and remaining questions.

This is the useful outcome of stages 0–4. It should become the input to product requirements, not a ten-gate validation claim.

### Build-ready specification quality

The stage-6 template is substantially stronger than the current AI-SaaS-SDLC templates. Useful patterns include:

- declared ID vocabulary and exact joins across feature, AC, field, screen, error, event, transition, invariant, job and eval IDs (`skills/stage-6-blueprint-templates/SKILL.md:26-48`);
- feature `touches` and subsystem `uses` declarations;
- Given/When/Then acceptance criteria with stable IDs;
- field type, limits, default and user-visible invalid behavior;
- explicit success, empty, loading, error, queued, running, cancelled and partial states when applicable;
- required edge-case answers for duplicates, permissions, dependency failure, retry/idempotency, concurrency, locale/time/money;
- UX surface inventory, first-run-to-aha flow and accessibility floor;
- API errors joined to feature state rows and lifecycle policy for non-UI interfaces;
- integration authentication, webhooks, retry, failure/degradation and sandbox plan;
- NFR numbers traced to evidence or explicit owner decision;
- test coverage joined to AC/invariant/eval IDs rather than restating them;
- multi-writer conflict domains, jobs and global invariants;
- conditional subsystem specs for real non-CRUD cores, including quality/cost budgets, pinning, degradation and eval bindings.

These are content contracts, not procedures. They should be retained and adapted into the canonical FTR/UC/FLOW/SCR/CMP/SUB/API/ENT/INT/JOB/EVT/ADR/UT/IT/ST template family.

## 5. Current AI-SaaS-SDLC comparison

### What the current design gets right

- Four temporal flows rather than ten stage gates.
- No interviews, outreach, presales, custom research agents or mandatory integrations.
- Web research only through actual search/fetch tools.
- One Evidence Reassessment question at a time.
- One Evolution flow for every feature addition/change/retirement.
- Dependency-graph impact and regression selection.
- Exactly UT, IT and ST; other concerns are viewpoints.
- Structural Stop check only, with one block and no prose/tone review.
- Immutable original idea, accepted ADR and execution-backed results.
- Git/baseline time axis rather than copied stage packs.

These rules directly avoid the dominant SaaS-idea-brainstorm failure mode.

### What is currently inadequate

The current implementation is too skeletal to realize those flows reliably:

1. Skills are only 13–19 lines. `genesis` says “complete the eight discovery artifacts” but does not specify the transformations, ordering, evidence-to-synthesis mechanics, conditional branches, or completion criteria needed to do so (`skills/genesis/SKILL.md:13-21`).
2. Protocols are short checklists rather than executable methods. For example, public-web research has no query plan record, source selection/normalization matrix, research budget, saturation rule, source update policy, or explicit required synthesis joins.
3. Current scalable templates are mostly frontmatter, headings and one sentence. The feature template has one example AC; it lacks typed behavior tables, actor/permission cases, alternate/error-flow identifiers, state transitions, quantitative constraints, data access detail and a test-derivation matrix.
4. Singleton discovery files such as `market-landscape.md` and `evidence-ledger.md` are similarly thin. They do not define a durable row schema rich enough to support competitor normalization, source independence, claim direction, retrieval time, applicability and downstream decisions.
5. `00-system/templates/verification/` and `04-verification/` are not duplicate output layers in intent: the first should contain factory contracts; the second should contain instantiated UT/IT/ST artifacts and execution results. However, the repository does not make that distinction obvious, and the engine has no public “instantiate from template” operation. Skills merely instruct the model to create files. Therefore the template-to-instance relationship is conceptual rather than mechanically guaranteed.
6. No realistic complete fixture demonstrates raw idea → researched discovery → product foundation → first feature → conditional design → UT/IT/ST → baseline. Deterministic engine tests cannot substitute for artifact-content quality evaluation.

The correction is not to import the old procedural gates. It is to make each artifact contract deep enough that one pass can produce useful content and deterministic tooling can verify the relationships.

## 6. Concrete safeguards for a lean but complete AI-SaaS-SDLC

### Flow-entry rule

Only five user-facing entries remain:

- Genesis;
- Evidence Reassessment;
- Product Evolution;
- Reconciliation;
- read-only Inspect State.

No stage skill, template skill, gate skill or review agent may become another user-visible lifecycle.

### Legal loop trigger

A flow may repeat work only after one of:

- a newly fetched public source;
- a source materially changed since its recorded observation;
- a concrete contradiction;
- an explicit user product decision;
- an inspected code/file diff;
- an execution result;
- a failed structural/reference/contract check.

The following are not legal triggers:

- the model rereading unchanged prose;
- spelling, tone or formatting;
- a reviewer expressing a different preference;
- missing optional content that the applicability rules marked not applicable;
- desire for “more confidence” without a named decision question.

### Research budget and stopping

Every Genesis/Reassessment records one small query plan:

- decision/question;
- required evidence dimensions;
- preferred source classes;
- geography/time boundary;
- maximum search rounds or new sources;
- stop reason.

Stop when the decision is supportable, contradicted, explicitly unknown, or when two consecutive useful sources add no material decision-changing information. This retains the old research-budget insight without making it a gate ceremony.

### Evidence model

One canonical evidence entry should contain:

- permanent ID;
- source URL/title/publisher;
- published and accessed dates;
- source class and independence/root-source key;
- exact claim/observation;
- supports/contradicts/qualifies;
- affected research question and downstream artifact IDs;
- segment, geography and time applicability;
- confidence and limitations;
- supersession/current-source status.

Research syntheses reference evidence IDs. Raw fetch/cache content is machine-owned and does not become another authored truth layer.

### Template contract depth

Every real template must provide:

1. purpose and non-purpose;
2. applicability/creation condition;
3. ID and file pattern;
4. exact upstream/downstream relationships;
5. field/table schemas with allowed values and semantics;
6. required normal, alternate, failure and degradation content;
7. concrete trace points to code/tests where relevant;
8. lifecycle and supersession rules;
9. objective completion checks;
10. at least one small worked example for ambiguous structures.

A list of headings is not a template contract.

### Template versus instance layout

Keep a single canonical template library under `00-system/templates/`, but rename/document it as a factory contract layer. Keep actual instances in `01-discovery` through `05-control`. The engine should expose deterministic artifact creation, for example:

`ai-saas-sdlc artifact create --type feature --id FTR-BILLING-001 --title "..."`

That operation should select exactly one template, substitute identity/frontmatter, write to the canonical directory and refuse collisions. The content remains model/user-authored; the shape and placement become deterministic.

### Review and validation separation

- Deterministic validation may block: schema, missing required field/table, illegal ID/path, broken reference, lifecycle violation, unsupported status, fabricated result, protected file or graph inconsistency.
- Semantic uncertainty becomes `QUESTIONS` or `ISS-*`; it does not automatically rerun the flow.
- User review happens once per consolidated set of material product decisions, not once per artifact or gate.
- Optional scenario simulation may be explicitly requested before a major baseline. It is diagnostic and cannot pass/fail a baseline by itself.

### Canonical-time rule

- Canonical documents remain in layers 01–05.
- A baseline is an immutable manifest over exact identities, relationships and hashes.
- Generated indices/coverage/traceability are projections.
- Do not create a prose-copy MVP pack.
- Do not create cycle mirrors. Evolution creates successor artifacts/baselines; a major product pivot may supersede the product/opportunity foundation while retaining history.

## 7. Acceptance scenarios the redesigned content must pass

1. A vague raw idea can produce a source-attributable customer/problem/market/competitive/commercial/feasibility opportunity definition without interviews, fake personas or arbitrary gate counts.
2. Research ends with an explicit decision and limitations, not merely a collection of URLs.
3. Reassessing one pricing assumption updates evidence and affected synthesis only; no feature or design is silently changed.
4. Adding the first feature produces stable FTR acceptance IDs, necessary UC/FLOW, conditional design artifacts, and derived UT/IT/ST with resolved references.
5. A CRUD feature does not create SUB/JOB/EVT/ADR merely to complete a checklist.
6. An AI-core feature creates a real subsystem contract covering input/output, quality, latency/cost budget, pinning, degradation, evaluation and human-control behavior.
7. A feature writing a shared entity/API reaches all old dependents and selects their regression tests.
8. An accepted ADR is superseded by a successor; history remains readable and downstream impact updates.
9. A one-word tone edit creates no flow, semantic review, test run or baseline invalidation.
10. No flow repeats without a new admissible observation.
11. A fresh coding session can implement a representative multi-feature fixture without inventing product behavior, validation/error states, domain constraints, interface behavior or test oracles.
12. Template instances can be mechanically traced to exactly one template and canonical directory.

## Final recommendation

Do not reuse SaaS-idea-brainstorm’s orchestration, gatekeeper or state-machine design. Reuse its best information schemas and failure-awareness selectively.

The target is not “fewer documents.” The target is one canonical home per decision, conditional horizontal artifacts, deep templates, deterministic relationship checks, and only four temporal mutation flows. This produces more useful specification content with less procedural work.

Unresolved questions: none for this audit.
