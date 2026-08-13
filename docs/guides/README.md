# How-to Guides

Reference docs describe *what* each part of the plugin is. These guides describe *what to do* when you sit down to build a product — organized by the situation you are actually in, not by the plugin's feature list.

Every guide follows the same shape: when to use it, the one command to type, a walkthrough of what happens, and how to confirm it worked before you move on.

## Pick the guide by what you are trying to do

| You are here | Guide | Skill it drives |
|---|---|---|
| Starting from a raw idea, nothing exists yet | [Start a new product](start-a-new-product.md) | `/ai-saas-sdlc:genesis` |
| You want to build a new feature, end to end | [Implement a feature](implement-a-feature.md) | `/ai-saas-sdlc:evolve-product` |
| You want to change, consolidate, break, deprecate or retire existing behavior | [Evolve existing behavior](evolve-existing-behavior.md) | `/ai-saas-sdlc:evolve-product` |
| A competitor moved, a claim looks stale, a new market signal appeared | [Reassess market evidence](reassess-evidence.md) | `/ai-saas-sdlc:reassess-evidence` |
| A test failed, code drifted from the docs, two contracts disagree | [Fix a failure or mismatch](reconcile-a-failure.md) | `/ai-saas-sdlc:reconcile` |
| You want to know where things stand, what's affected, what's owed | [Inspect state and check results](inspect-and-check-results.md) | `/ai-saas-sdlc:inspect-state` |
| You want to read the whole repository in a browser | [Inspect state and check results](inspect-and-check-results.md#browse-the-repository-as-a-site) | `/ai-saas-sdlc:inspect-state` |

If you are brand new, read [Start a new product](start-a-new-product.md) first — it also covers install, the documentation-repository model, and how to point the plugin at your code.

## The mental model in one paragraph

You keep a **separate documentation repository**. It advances only in response to real events: a public source, an explicit product decision, an inspected code diff, an execution result, or a concrete contradiction. Four skills *mutate* that repository — Genesis, Product Evolution, Evidence Reassessment, Reconciliation — and each one ends by recording a new **baseline**. A fifth skill, Inspect State, only *reads* — its single exception is building a browsable HTML copy into the engine's own cache when you ask for one. There is no approval pipeline and no stage gate: repeating Product Evolution over time *is* how the product scales. Spelling and formatting are not events; those use `refresh --editorial` and open no flow.

## Two habits that make every guide work

1. **Let the flow tell you the next command.** Every mutation skill ends its turn by printing the exact command to run next (it reads this from `flow next`). You rarely have to remember syntax — you copy what it prints.
2. **Check the result, don't assume it.** After any flow, `/ai-saas-sdlc:inspect-state` and the engine's `validate` tell you the truth: which baseline you are on, what is still open, what is unverified. A flow that "finished" is not the same as a flow that *validated*. See [Inspect state and check results](inspect-and-check-results.md).

## Related reference material

- [Flow reference](../flow-reference.md) — the formal contract of each of the five interfaces.
- [Command reference](../command-reference.md) — every engine command and its options.
- [Artifact reference](../artifact-reference.md) — every artifact type and its ID prefix.
- [Configuration reference](../configuration-reference.md) — `sdlc.config.yaml`, implementation sources, verification commands.
- [Research tools](../research-tools.md) — optional self-hosted SearXNG/Firecrawl/Camofox instruments and engine-witnessed retrieval provenance.
- [End-to-end timeline](../end-to-end-timeline.md) — the same journey told as a timeline (t0 … tn).
- [Pattern to instance](../pattern-to-instance.md) — why patterns and live artifacts are separate layers.

The engine also regenerates cross-cutting views into `generated/` after every flow — traceability, the artifact graph and index, rule and acceptance coverage, feature and implementation maps, stale artifacts, issue and decision indexes, and `platform-coverage.md` once the product ships on a declared platform. Read them; never edit them.
