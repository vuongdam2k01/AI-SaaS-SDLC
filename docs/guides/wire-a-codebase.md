# Wire a codebase

**When to use this:** your documentation repository has validated features and it is time for real code — a fresh build starting now, or an existing codebase this repository should govern. This guide is the seam between the two worlds: everything before it is documentation truth, everything after it is implementation the engine can map, execute and record.

**What this is not:** the plugin never initializes, clones, commits, pushes, deploys or operates an implementation repository. Creating the codebase is your act, outside the engine; wiring is what makes the engine able to see it.

## The three steps

### 1. Create or choose the codebase — outside the engine

Scaffold the application repository yourself, or have your coding agent do it as ordinary (non-plugin) work: pick the stack, run the generator, get the test harness to a state where its suites can run. A sibling directory works well:

```text
parent/
├── my-product-docs/     ← the documentation repository (this plugin's home)
└── my-product-app/      ← the codebase you just created
```

Two documents are worth reading before you pick anything: `ARCHITECTURE-OVERVIEW` (boundaries, runtime topology — the shape the code must serve) and the `QUALITY-REQUIREMENTS`/`SYSTEM-INVARIANTS` pair (what the stack must be able to guarantee). The docs constrain the stack; they do not name it — naming it is the next step's job.

### 2. Declare sources and commands

Edit `sdlc.config.yaml` in the documentation repository:

```yaml
implementation_sources:
  - id: app
    path: ../my-product-app
verification:
  unit:
    - id: app-unit
      cwd: ../my-product-app
      command: npm test
  integration:
    - id: app-integration
      cwd: ../my-product-app
      command: npm run test:integration
  system:
    - id: app-system
      cwd: ../my-product-app
      command: npm run test:system
```

The engine runs **only** these exact strings, never anything inferred. Each level's command should exist and exit zero on the fresh scaffold (an empty passing suite is a fine start) — every future evolution re-runs all of them as its regression contract.

Wiring changes what `validate` reports, deliberately: every active feature now carries `IMPLEMENTATION_MAPPING_MISSING` — the standing, honest record that it is specified but not yet implemented. **Nothing is blocked by this.** Warnings are the ledger of what is owed, and `generated/implementation-coverage.md` now shows the same state as a per-feature dashboard, with one `generated/implementation-plan/<FTR-ID>.md` work packet per feature.

### 3. Record the engineering profile — one evolution

The stack you chose is now a fact of the product, and facts of the product live in documents. Run one Product Evolution to fill the `Engineering profile` section of `ARCHITECTURE-OVERVIEW` (language/runtime, framework, package manager, repository layout map, test framework per level, migration tool, build entry points), commit `sdlc.config.yaml`'s new content in the same flow, and baseline. From here on an implementer reads the substrate there instead of inferring it per segment.

```text
/ai-saas-sdlc:evolve-product wire the codebase: record the engineering profile and verification commands
```

A stack choice that was genuinely contested — two viable options, expensive to reverse — additionally earns an `ADR-*` in the same flow; the profile records what is, the ADR records why.

## How to check it worked

- `ENGINE validate` shows **errors: 0**, plus one `IMPLEMENTATION_MAPPING_MISSING` per active feature — expected and healthy.
- `generated/implementation-coverage.md` exists and lists every feature as `unmapped`.
- `ENGINE flow next --json` now includes a `suggested_segment` — the feature the evidence says to implement first.

Then start building, one segment at a time: [Implement per segment](implement-per-segment.md).

## If the codebase predates the docs

The same three steps apply, plus one honest pass: features whose code already exists get their mappings recorded (an implement segment that mostly maps and verifies rather than writes), and drift the review discovers between that code and the documents becomes `ISS-*` records repaired through [Reconciliation](reconcile-a-failure.md) — one feature-sized slice per flow, never one heroic flow for everything.
