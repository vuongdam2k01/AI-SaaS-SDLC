# Genesis Playbook

Genesis turns one raw SaaS idea into the first evidence revision and product-foundation baseline. It is one event-driven flow, not a sequence of validation stages or approval gates.

The host adapter supplies `ENGINE`, an absolute invocation equivalent to:

`node "<plugin-root>/bin/ai-saas-sdlc"`

## 1. Accepted input

Required:

- raw idea in the user's own words.

Optional, when already stated:

- geography/customer constraints;
- product surface or delivery constraints;
- security, privacy, regulatory or AI boundaries;
- commercial/technical preferences and explicit non-goals;
- configured implementation-source locations, although Genesis never edits them.

Do not require a structured brief. Preserve the raw idea verbatim and classify every added interpretation as inference or unknown.

## 2. Mandatory reads

Before research:

1. Detect initialization by checking `.ai-saas-sdlc/state/current.json` or running `ENGINE state --json` only when initialized.
2. If uninitialized, run `ENGINE init --idea "<raw idea>"`. Always pass `--project-id`: use the ID the user supplied, and otherwise derive a stable kebab-case identifier from the product the idea describes. Without it the engine falls back to the containing directory name, which produces a meaningless project identity such as `docs`. Never overwrite an existing initialized repository.
3. Read `sdlc.config.yaml`, `00-system/document-rules.md`, lifecycle/validation rules and discovery/product foundation files.
4. Read `01-discovery/original-idea.md`; replace the explicit initialization placeholder once only if the repository was initialized without idea text. Never rewrite captured input.
5. Confirm no baseline or active incompatible flow exists. Genesis is legal only before the first baseline.

## 3. Open the temporal flow

If a matching active Genesis flow already exists, resume its recorded input/artifacts and do not call `flow start` again. If another flow is active, stop and report it.

Run:

```text
ENGINE flow start --type genesis --input "<raw idea>" --json
```

Keep the returned flow ID. Genesis foundation files may keep `created_by_change: GENESIS` or use that flow ID as permitted by the engine. Do not create scalable FTR/UC/FLOW/design/test/control artifacts during Genesis.

## 4. Extract the idea before searching

Create a working intake model from the raw idea:

| Class | Meaning | Destination |
|---|---|---|
| Explicit statement | User actually said it | `IDEA-DEFINITION`, retaining wording |
| Constraint/non-goal | Boundary the product must honor | `IDEA-DEFINITION`, later foundation artifact |
| Interpretation | Reasonable reading not explicitly stated | Labeled inference |
| Assumption | Must be true for the idea to work | Research question or `QUESTIONS` |
| Unknown | Missing fact that may change direction | Material-question set or `QUESTIONS` |

Derive a solution-free problem hypothesis: actor, situation, job/outcome, current workaround, failure/cost, trigger/frequency and a condition that would disconfirm the framing. Keep the proposed solution separately; do not discard it.

## 5. Plan and perform real public-web research

Read and follow `resources/protocols/public-web-research.md`. Run `ENGINE research probe --json` first: at rung 0 use the host's actual search and URL-open/fetch tools; at rung 1 and above use the `ENGINE research` commands to the depth the protocol's *Instrument rungs* section requires, including the mandatory counter-evidence pass and `research map` before deep competitor profiling. Do not delegate Internet access to a fictional/custom research agent.

Use the smallest applicable question set that can decide:

- candidate segment and ICP boundary;
- problem/workaround and public pain signals;
- direct, indirect, DIY, general-purpose and status-quo alternatives;
- pricing/packaging and commercial constraints;
- market/category/geography/timing conditions;
- feasibility, data, integration, quality, compliance and operational risks.

For every material source, inspect the page itself and append an `EVD-*` entry to `EVIDENCE-LEDGER`. A page retrieved through `ENGINE research fetch` or `crawl` names its record with a `- Retrieval: RET-###` line in that entry — the engine-witnessed provenance validation checks. Record contrary evidence and coverage limitations. If real search/fetch tools are unavailable, stop and report that Genesis research is incomplete; never substitute model knowledge.

## 6. Transform evidence into canonical discovery

Update the singleton discovery documents using evidence IDs, not copied source prose:

| Input observations | Transformation | Canonical output |
|---|---|---|
| Raw idea, constraints, clarified interpretation | Separate stated facts, inferences, assumptions and unknowns | `IDEA-DEFINITION` |
| Public customer/workflow/problem signals | Cluster by situation/job/workaround/consequence; state sample limitations | `CUSTOMER-AND-PROBLEM` |
| Category/statistics/trends/regulation | Define narrow category, geography/time scope and uncertainty | `MARKET-LANDSCAPE` |
| Products/services/DIY/general tools/status quo | Normalize capabilities/pricing; separate supply from demand and identify product boundary | `COMPETITIVE-AND-COMMERCIAL` |
| Technical/provider/regulatory facts | Identify lethal and manageable constraints, unknowns and mitigations | `FEASIBILITY-AND-RISK` |
| All applicable discovery synthesis | Select opportunity, exclusions, differentiation, evidence strength and unresolved decisions | `OPPORTUNITY-DEFINITION` |

Mark these documents `active` only when they express the current bounded conclusion. An explicit evidence-backed “unknown” is valid content; vague placeholders are not.

`EVIDENCE-LEDGER` is filled the same way and leaves `draft` with them: the engine requires every discovery and product foundation — the ledger included — to be `active` before a Genesis baseline, and a ledger this flow filled with real `EVD-*` entries has no reason to stay draft. The same holds for the product foundations completed in the next section.

## 7. Allocate horizontal discovery artifacts conditionally

Create details only when they carry information referenced downstream:

- `ICP-*`: selected segment with defining/excluding attributes, trigger, current alternative, buyer/adoption path and evidence;
- `PERSONA-*`: a materially distinct role with goals, decisions, permissions, trust/information needs; label as inferred because no interviews occur;
- `PROBLEM-*`: a distinct selected problem requiring independent evidence/trace;
- `COMPETITOR-*`: a significant alternative compared deeply enough that a summary row is inadequate.

Instantiate each selected detail from the pinned pattern instead of copying a template by hand:

```text
ENGINE artifact create --type <ideal_customer_profile|persona|problem|competitor> --id <ID> --title "<title>" --json
```

Then complete the generated contract and relationships. Do not author a second pattern inside the instance directory.

Do not create named prospect lists, interviews, presell/landing/concierge kits or simulated people. Do not create one artifact per search result.

## 8. One consolidated material interaction

After the initial research synthesis, resolve all material product choices in one interaction. Ask only questions where alternatives would change selected segment/problem, opportunity boundary, commercial direction, product promise, access model or non-negotiable quality/invariant.

For each question provide:

- evidence-supported options;
- principal consequence/reversibility;
- recommendation and largest uncertainty.

When the evidence still supports two or more framings of the opportunity or beachhead — different segments, different problem boundaries, different commercial directions — each framing is presented as an explicit alternative with its own evidence cost inside this same interaction, per the divergence rule in `resources/protocols/solution-formation.md`: this is the pipeline's most leveraged decision, and converging on the first framing that fits is exactly the anchoring that rule prohibits.

If evidence and explicit input determine the answer, do not manufacture a checkpoint. Record non-blocking unknowns in `QUESTIONS`.

## 9. Form product foundations

Transform the selected opportunity into:

- `PRODUCT-REQUIREMENTS`: product goal, actors, scope/non-scope, capability boundaries, commercial assumptions and success/learning measures;
- `ACCESS-CONTROL`: initial roles/resources/actions/tenant boundaries, even if some are explicitly not applicable;
- `QUALITY-REQUIREMENTS`: only sourced or owner-confirmed quality, security, privacy, performance, reliability, accessibility and AI-behavior constraints;
- `SYSTEM-INVARIANTS`: cross-feature truths that must remain true across future evolution.

Do not create features, use cases, screens, APIs, entities, platform targets or tests. Genesis defines the foundation they will depend on; Product Evolution scales horizontally later.

## 10. Deterministic close sequence

Run in order:

```text
ENGINE refresh
ENGINE validate --active --json
ENGINE baseline create --json
ENGINE flow close --json
```

Fix only reported structural/reference/completion failures. Do not open an adversarial prose-review loop. The baseline command must produce `EVR-001` and `BL-000`.

## 11. Output contract

Report:

- selected customer/problem/opportunity and explicit exclusions;
- important supporting and contradicting `EVD-*` IDs;
- conditional detail artifacts created;
- unresolved `QUESTIONS` and evidence limitations;
- `EVR-001`, `BL-000` and validation state;
- next meaningful event, without automatically starting Evolution.

## 12. Stop and re-entry

Stop when the first baseline is created or when a concrete blocker prevents honest completion. Leave a blocked active flow resumable; do not fabricate evidence or mark drafts active to close it.

Legal re-entry observations are: a new public source, changed source, contradiction, explicit user scope decision or missing material answer. Researching unchanged questions or rereading unchanged documents is not a loop trigger. After `BL-000`, use Evidence Reassessment or Product Evolution; Genesis never runs again.

Editorial edits use `refresh --editorial` outside every semantic flow.
