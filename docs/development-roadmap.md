# Development Roadmap

## Since 1.0.0

| Release | Direction |
|---|---|
| 1.4.0 | Catalog opened beyond web products: `platform_target` owns platform constraints, permissions, distribution/update and local-data migration; `API-*` covers any invocable operation; platform variance is a viewpoint inside UT/IT/ST |

## 1.0.0 rebuild status

| Workstream | Delivered outcome | Status |
|---|---|---|
| Repository contract | Canonical source patterns separated from project skeleton; consuming repositories pin a verified snapshot | Complete |
| Dual-host packaging | Matching Claude/Codex manifests, five thin adapters per host and shared packaged resources/engine | Complete |
| Artifact contracts | 23 scalable catalog types plus active-content contracts for fixed foundations | Complete |
| Temporal interfaces | Genesis, Reassessment, Evolution, Reconciliation and read-only Inspect State playbooks | Complete |
| Deterministic engine | Artifact creation, flow boundaries, impact/history graph, content validation, verification provenance, baselines and projections | Complete |
| Host safeguards | Portable Claude/Codex hooks with documented trust and engine-enforcement boundary | Complete |
| Verification | UT/IT/ST derivation, configured command execution, immutable execution-backed results and package/host tests | Complete |
| Public documentation | Time model, artifact model, commands, configuration, architecture and dual-host use synchronized | Complete |

## Maintenance direction

Future work must follow observed repository usage and preserve the public contracts above. Compatible extensions may deepen pattern content, projections, migrations and host packaging when supported by tests and a changelog entry.

The following remain intentionally outside scope: runtime/deployment operations, repository creation or Git automation, interviews/outreach/presales, custom research agents, mandatory MCP integrations, additional test levels and automatic semantic prose-review loops.

No future phase is scheduled. Changes should be event-driven by a concrete defect, host change, schema migration need or evidenced usability gap.
