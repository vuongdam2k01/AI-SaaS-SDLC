# Development Roadmap

## Since 1.0.0

| Release | Direction |
|---|---|
| 1.9.0 | Documentation surface brought back level with the engine after five feature releases, and three defects the audit surfaced repaired: the decision pattern shipped frontmatter the engine rejects, the lifecycle contract taught states the engine has no notion of, and Genesis never activated the evidence ledger it fills. Every playbook, protocol, pinned system contract, reference doc and guide now states the current contract; a test instantiates every pattern so a broken pattern can never ship silently again |
| 1.8.1 | Certification-pass lessons written into the method: a foundation the flow fills is activated in that flow, a test seam weakening an invariant is recorded in `TEST-POLICY`, and the feature guide states observed per-stage cost |
| 1.8.0 | Rough edges from real-flow use filed down and a read-only projection added: `docs build` renders a static, dependency-free browsable site (a projection, never authority); a committed-but-unproven platform is documented as `active` with its unproven-ness in the evidence layer; `flow checkpoint` raises a stale target when a continued flow passes it; the evidence warnings and the evolution playbook are worded so the standing warning reads as the record and the `areas` registry is reachable from a flow |
| 1.7.0 | Platform dimension deepened instead of widened: the 1.5.0 candidate `generated/platform-coverage.md` projection ships, emitted only when platform targets exist; platform targets may declare a machine-checkable `host_os` token and `validate` reports `PLATFORM_EVIDENCE_CONTRADICTED` when every recorded execution declaring the target observed a different host; `verify` resynchronizes record-dependent projections; the baseline evidence predicate becomes one shared function |
| 1.6.0 | Authority surface opened beyond one service: sibling interface/schema/transition files are discovered as first-class contracts with declared per-file ownership and impact convergence, entities declare a persistence authority beyond relational DBML, the architecture overview owns runtime topology, and an opt-in `areas` registry makes ID namespacing checkable |
| 1.5.0 | Platform claims became checkable: verification commands declare the platform targets they evidence, executions record the declaration beside the observed host, and validate warns about live platforms nothing declares. Candidate follow-up: a `generated/platform-coverage.md` projection joining live targets, declaring commands, latest executions and hosts — emitted only when platform targets exist so existing repositories see no drift |
| 1.4.0 | Catalog opened beyond web products: `platform_target` owns platform constraints, permissions, distribution/update and local-data migration; `API-*` covers any invocable operation; platform variance is a viewpoint inside UT/IT/ST |

## 1.0.0 rebuild status

| Workstream | Delivered outcome | Status |
|---|---|---|
| Repository contract | Canonical source patterns separated from project skeleton; consuming repositories pin a verified snapshot | Complete |
| Dual-host packaging | Matching Claude/Codex manifests, five thin adapters per host and shared packaged resources/engine | Complete |
| Artifact contracts | 23 scalable catalog types at 1.0.0 (24 since 1.4.0's `platform_target`) plus active-content contracts for fixed foundations | Complete |
| Temporal interfaces | Genesis, Reassessment, Evolution, Reconciliation and read-only Inspect State playbooks | Complete |
| Deterministic engine | Artifact creation, flow boundaries, impact/history graph, content validation, verification provenance, baselines and projections | Complete |
| Host safeguards | Portable Claude/Codex hooks with documented trust and engine-enforcement boundary | Complete |
| Verification | UT/IT/ST derivation, configured command execution, immutable execution-backed results and package/host tests | Complete |
| Public documentation | Time model, artifact model, commands, configuration, architecture and dual-host use synchronized | Complete |

## Maintenance direction

Future work must follow observed repository usage and preserve the public contracts above. Compatible extensions may deepen pattern content, projections, migrations and host packaging when supported by tests and a changelog entry.

The following remain intentionally outside scope: runtime/deployment operations, repository creation or Git automation, interviews/outreach/presales, custom research agents, mandatory MCP integrations, additional test levels and automatic semantic prose-review loops.

No future phase is scheduled. Changes should be event-driven by a concrete defect, host change, schema migration need or evidenced usability gap.
