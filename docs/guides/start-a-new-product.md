# Start a new product

This is the first thing you do. You have a SaaS idea in your head and nothing written down. By the end you will have an evidence-grounded discovery and product-foundation baseline — the ground every later feature stands on.

## Use this when

- You are turning a raw idea into a documented product for the first time.
- Nothing has been baselined yet (no `BL-000`).

Genesis runs **exactly once** per product. After the first baseline exists, you never run it again — you use [Product Evolution](implement-a-feature.md) to add behavior and [Evidence Reassessment](reassess-evidence.md) to revisit the market.

## Before you run anything: set up the workspace

### 1. Install the plugin

Load a development checkout:

```bash
claude --plugin-dir .
```

Or install from the marketplace:

```text
/plugin marketplace add vuongdam2k01/AI-SaaS-SDLC
/plugin install ai-saas-sdlc@ai-saas-sdlc
```

### 2. Work in a *separate* documentation repository

The plugin keeps your product's living documentation in its own repository, distinct from your application code. Create an empty directory and start Claude Code inside it:

```bash
mkdir my-product-docs && cd my-product-docs
```

```bash
claude
```

You do **not** run `init` by hand — Genesis detects an uninitialized directory and calls the engine's `init` for you, copying the fixed skeleton (`00-system/` … `05-control/` plus the machine-owned `generated/`), pinning the pattern catalog into `00-system/patterns/`, writing a `sdlc.config.yaml` you can leave alone for now, and capturing your raw idea.

### 3. (Optional) You do not need your code yet

Genesis never edits application code. Pointing the docs at your codebase matters only later, for [implementing features](implement-a-feature.md). You can leave `sdlc.config.yaml` in documentation-only mode for now — see the [configuration reference](../configuration-reference.md) when you are ready, including the optional `areas` registry, which is worth deciding on early because the AREA segment of an ID cannot be renamed once it is baselined.

## The one command

```text
/ai-saas-sdlc:genesis <your raw idea, in your own words>
```

Say the idea the way you would to a colleague. Include any constraints you already know — geography, target customer, a hard privacy or compliance boundary, an explicit non-goal. You do **not** need a structured brief; the flow preserves your exact wording and separates fact from inference itself.

Example:

```text
/ai-saas-sdlc:genesis A tool that lets marketing agencies collect client approval on
social posts before they go live, so nothing publishes without sign-off. B2B, EU first,
must keep an audit trail of who approved what.
```

## What happens, step by step

You do not drive these steps — the skill does. Knowing them lets you follow along and steer at the one point where your input matters.

1. **Initialize** (if needed) — the engine lays down the skeleton and records `EVR`/`BL` state as empty.
2. **Extract the idea** — your words are split into explicit statements, constraints/non-goals, interpretations, assumptions and unknowns. A solution-free problem hypothesis is formed (actor, situation, job, current workaround, cost, trigger).
3. **Real public-web research** — the flow uses live `WebSearch` and `WebFetch` to inspect actual pages: the candidate segment, the problem and its workarounds, the five tiers of alternatives (direct, indirect, DIY, general-purpose, status quo), pricing, market/timing, and feasibility risks. Every material source becomes an attributable `EVD-*` entry in the evidence ledger. *If real web tools are unavailable, the flow stops and says so — it never substitutes guesses for research.*
4. **Synthesize discovery** — the evidence becomes the fixed discovery documents: `IDEA-DEFINITION`, `CUSTOMER-AND-PROBLEM`, `MARKET-LANDSCAPE`, `COMPETITIVE-AND-COMMERCIAL`, `FEASIBILITY-AND-RISK`, `OPPORTUNITY-DEFINITION`. Only the details that carry weight downstream are broken out into their own artifacts: `ICP-*`, `PERSONA-*`, `PROBLEM-*`, `COMPETITOR-*`.
5. **One consolidated decision point** — this is where you come in. If evidence and your input leave a genuinely material choice open — one that changes the selected segment, the opportunity boundary, the product promise, the access model, or a non-negotiable constraint — the flow asks **once**, with options, consequences and a recommendation. If the evidence already decides it, there is no artificial checkpoint.
6. **Form product foundations** — the selected opportunity becomes `PRODUCT-REQUIREMENTS`, `ACCESS-CONTROL`, `QUALITY-REQUIREMENTS` and `SYSTEM-INVARIANTS`. **No features, screens, APIs, entities or tests are created** — Genesis defines the foundation those will later depend on.
7. **Close** — the engine runs `refresh`, `validate`, `baseline create`, `flow close`, producing the first evidence revision **`EVR-001`** and product baseline **`BL-000`**.

## How to check it worked

When the skill finishes it prints a report: the selected customer/problem/opportunity, the key supporting and contradicting `EVD-*` IDs, any conditional detail artifacts, unresolved `QUESTIONS`, and — the signal you are looking for — **`EVR-001` and `BL-000` created, validation clean**.

Confirm it yourself:

```text
/ai-saas-sdlc:inspect-state
```

You want to see:

- **Active baseline `BL-000`** and **evidence revision `EVR-001`**.
- **No active flow** (Genesis closed cleanly).
- Discovery and product-foundation artifacts marked `active`.
- Validation **errors: 0**. Warnings such as open `QUESTIONS` are fine and expected — they are work owed, not failures.

If instead you see an *open* Genesis flow, the flow stopped on a blocker (most often: web research tools were unavailable). Read its final message — it tells you exactly what is missing — fix that, and re-run the same command to resume.

## Common variations

- **You already know a lot.** Put it all in the idea string. The more real constraints and non-goals you state, the fewer decision points the flow needs to raise.
- **Research turned up a contradiction to your assumption.** Good — that is the point. The flow records the contrary `EVD-*` and reflects it in the synthesis rather than hiding it. Read `OPPORTUNITY-DEFINITION` to see how the framing changed.
- **You want to give the project a specific ID.** Say it in the idea (e.g. "call this `approval-workflow`"). Otherwise a stable kebab-case ID is derived from the product itself, never from the folder name.

## What NOT to use this for

- **Adding a feature** → that is [Product Evolution](implement-a-feature.md). Genesis intentionally creates zero features.
- **Re-checking the market after launch** → that is [Evidence Reassessment](reassess-evidence.md).
- **Fixing a typo in a foundation doc** → that is an editorial edit; see [Inspect state and check results](inspect-and-check-results.md#editorial-edits-spelling-tone-formatting).

## Next

Once `BL-000` exists, the natural next event is your first feature:

```text
/ai-saas-sdlc:evolve-product <the first thing a user should be able to do>
```

→ [Implement a feature](implement-a-feature.md).
