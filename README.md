# AI SaaS SDLC

AI SaaS SDLC is a dual Claude Code and Codex plugin for turning a raw SaaS idea into an evidence-grounded, implementation-ready and continuously maintained documentation repository.

It is deliberately event-driven rather than stage-gated. Four mutation flows follow the product through time: Genesis, Evidence Reassessment, Product Evolution and Reconciliation. Inspect State reads without mutating, its one exception being the browsable HTML site it can render into the engine's own cache on request. There are no user interviews, outreach, presales, custom research agents, MCP requirements, runtime/deployment operations or automatic prose-review loops.

## What it produces

An initialized documentation repository separates five kinds of truth:

```text
00-system/       pinned authoring patterns and repository rules
01-discovery/    raw idea, attributable public evidence and market synthesis
02-product/      requirements, access, invariants, FTR, UC and FLOW behavior
03-design/       architecture, UX, SCR, CMP, SUB, API, ENT, INT, JOB, EVT and PLT design,
                 plus the interface, schema and transition contract files they own
04-verification/ actual UT, IT, ST specifications and execution-backed RESULT records
05-control/      unresolved questions, ISS repairs and immutable accepted ADR history
generated/       reproducible indexes, traceability, coverage and impact projections
```

Contract files are first-class artifacts, not attachments: `03-design/interfaces/*.yaml` become `WIRE-*`, `03-design/data/*.dbml` become `SCHEMA-*` and `03-design/*.mmd` become `TRANSITIONS-*`, hashed and baselined like everything else, with each operation, entity and screen naming its owning file once a family holds more than one. `generated/` holds the machine-owned views — traceability, artifact graph and index, rule and acceptance coverage, feature and implementation maps, stale artifacts, issue and decision indexes, and `platform-coverage.md` once the product declares a platform target.

Reusable patterns and live artifacts are different layers. Canonical pattern sources live in the plugin at `resources/artifact-patterns/`; initialization pins their exact snapshot to `00-system/patterns/`. `04-verification/` contains only real test specifications and results for the product. See [Pattern to Instance](docs/pattern-to-instance.md).

## Requirements

- Node.js 22 or newer
- Git
- Claude Code for the Claude plugin, or Codex for the Codex plugin

## Claude Code

Load a development checkout:

```bash
claude --plugin-dir .
```

Or install from the repository marketplace:

```text
/plugin marketplace add vuongdam2k01/AI-SaaS-SDLC
/plugin install ai-saas-sdlc@ai-saas-sdlc
```

Start Claude Code in a separate, centralized documentation repository and invoke one of:

```text
/ai-saas-sdlc:genesis <raw idea>
/ai-saas-sdlc:reassess-evidence <specific question or signal>
/ai-saas-sdlc:evolve-product <semantic product intent>
/ai-saas-sdlc:reconcile <concrete failure or mismatch>
/ai-saas-sdlc:inspect-state [scope]
```

All five skills require explicit user invocation. Research uses actual `WebSearch` and `WebFetch`; a compatible already-installed tool may substitute, but no integration is mandatory. Optionally, self-hosted SearXNG, Firecrawl and camofox-browser instruments can be configured through environment variables — the engine then performs retrieval itself and leaves immutable `QRY-*`/`RET-*` provenance records with hashed page bodies; unconfigured, nothing changes. See [research tools](docs/research-tools.md).

## Codex

The repository also contains `.codex-plugin/plugin.json` and five Codex-native adapters under `codex/skills/`. Claude's manual-only adapters live separately under `claude/skills/`. Neither directory sits at the repository root, so a Claude host loads exactly the five manual Claude skills and a Codex host loads exactly the five Codex skills. Both load the same playbooks, patterns, portable hooks and engine. Codex asks the user to review and trust bundled command hooks before running them. See [dual-host installation and use](docs/codex-installation.md).

## Guides

Task-oriented walkthroughs organized by what you are actually doing — starting a product, building a feature, changing behavior, reassessing the market, fixing a mismatch, checking state. Start at the [guides index](docs/guides/README.md), which routes each situation to the right skill and the exact command:

- [Start a new product](docs/guides/start-a-new-product.md) — install, the documentation-repository model, and Genesis.
- [Implement a feature](docs/guides/implement-a-feature.md) — Product Evolution end to end, checkpoint by checkpoint.
- [Evolve existing behavior](docs/guides/evolve-existing-behavior.md) — change, consolidate, break, deprecate or retire.
- [Reassess market evidence](docs/guides/reassess-evidence.md) — Evidence Reassessment on one concrete question.
- [Fix a failure or mismatch](docs/guides/reconcile-a-failure.md) — Reconciliation, authority-first repair.
- [Inspect state and check results](docs/guides/inspect-and-check-results.md) — verifying outcomes and editorial edits.

## Temporal flows

| Flow | Event and result |
|---|---|
| Genesis | Raw idea plus public-web observations become attributable discovery, product foundations, `EVR-001` and `BL-000`. No features are pre-created. |
| Evidence Reassessment | One concrete market question appends evidence and revises affected discovery synthesis. Invalidated product truth becomes an issue, never a silent feature mutation. |
| Product Evolution | An addition, change, consolidation, breaking change or retirement becomes FTR → UC/FLOW → conditional design → UT/IT/ST → verified successor baseline. Repeating this flow is horizontal scale. |
| Reconciliation | A failed test, inspected drift or contract contradiction determines authority, repairs the minimal impact closure, reruns regression and preserves the failed/successful history. |
| Inspect State | Shows baseline, active change, graph, stale artifacts, questions, issues and verification without writing. |

A loop is legal only after a new public source, changed source, explicit product decision, inspected file/code diff, execution result or concrete contradiction. Spelling, tone and formatting do not open a flow.

## Deterministic engine

The bundled executable handles structure and provenance; the model handles research, synthesis and design reasoning.

```text
ai-saas-sdlc init [--project-id <id>] [--idea <text>]
ai-saas-sdlc state [--json]
ai-saas-sdlc flow start --type <genesis|reassessment|evolution|reconciliation> [--input <text>] [--until <stage>]
ai-saas-sdlc flow checkpoint --stage <stage> [--until <stage>]
ai-saas-sdlc flow next [--json]
ai-saas-sdlc flow close
ai-saas-sdlc patterns list [--json]
ai-saas-sdlc artifact create --type <type> --id <ID> --title <title>
ai-saas-sdlc research probe [--json]
ai-saas-sdlc research search --query <text> [--pass <class>] [--time-range <r>]
ai-saas-sdlc research fetch --url <url> [--wait <ms>]
ai-saas-sdlc research map --url <url> [--search <term>] [--limit <n>]
ai-saas-sdlc research crawl --url <url> [--include <csv>] [--limit <n>]
ai-saas-sdlc research diff --ret <RET-id> [--against <RET-id>]
ai-saas-sdlc impact [--json]
ai-saas-sdlc validate [--active|--all] [--json]
ai-saas-sdlc tests select [--json]
ai-saas-sdlc verify [--unit|--integration|--system|--all] --execute
ai-saas-sdlc baseline create
ai-saas-sdlc refresh [--check|--editorial]
ai-saas-sdlc docs build [--out <dir>]
ai-saas-sdlc migrate [--check]
```

A flow passes five checkpoints — `behavior`, `design`, `tests`, `implementation`, `baseline` — and `--until <stage>` declares where one turn stops; `flow next` prints the exact command that continues it. `docs build` renders the current repository as a static HTML site under `.ai-saas-sdlc/cache/site/`: a projection for reading, never authority or evidence.

It validates permanent IDs, canonical paths, required sections/tables, local trace IDs, references, lifecycle, historical graph edges, immutable raw input and accepted ADRs, execution provenance and generated projections. It never performs a tone review or decides whether prose is “good enough.”

Verification runs only exact commands declared in `sdlc.config.yaml`. Testing levels remain exactly UT, IT and ST; security, privacy, performance, accessibility and AI behavior are viewpoints within those levels.

## Development and validation

```bash
npm ci
npm run check
claude plugin validate . --strict
npm run validate:manifests
```

The package checks both plugin manifests, all ten host skill adapters, the 24 pattern types, isolated Claude/Codex root resolution, path confinement and reproducible projections.

Further references: [how-to guides](docs/guides/README.md), [timeline](docs/end-to-end-timeline.md), [flow reference](docs/flow-reference.md), [artifact reference](docs/artifact-reference.md), [command reference](docs/command-reference.md), [configuration](docs/configuration-reference.md), [research tools](docs/research-tools.md) and [architecture](docs/system-architecture.md).
