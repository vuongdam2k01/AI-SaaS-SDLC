# Configuration Reference

`sdlc.config.yaml` belongs at the root of the centralized documentation repository. It is a fixed canonical contract (`SDLC-CONFIG`) and participates in baselines and impact analysis.

```yaml
schema_version: 1
project_id: approval-workflow
research_mode: public-web-only
implementation_sources:
  - id: web-app
    path: ../approval-web-app
verification:
  unit:
    - id: web-unit
      cwd: ../approval-web-app
      command: npm test -- --runInBand
  integration:
    - id: web-integration
      cwd: ../approval-web-app
      command: npm run test:integration
  system:
    - id: web-system
      cwd: ../approval-web-app
      command: npm run test:system
```

No additional top-level or nested keys are accepted in schema version 1.

## Core fields

| Field | Contract |
|---|---|
| `schema_version` | Must be integer `1`. |
| `project_id` | Stable lowercase letters, numbers and hyphens. |
| `research_mode` | Must be `public-web-only`. Real host search/page inspection is required for claimed evidence. |
| `implementation_sources` | Array of unique `{id, path}` mappings; IDs use lowercase letters, numbers and hyphens. |
| `verification` | Exactly `unit`, `integration` and `system`, each containing unique `{id, cwd, command}` entries. |

## Implementation-source boundary

An implementation source declares the only external source tree a Product Evolution or Reconciliation may map, inspect or edit. It does not make that source part of the documentation repository, and the host still needs user-authorized filesystem access.

Paths may be relative to the documentation repository or absolute. The engine verifies real-path containment and rejects symlink/junction escapes. It records configured source state when a flow starts and when a baseline is created, using Git state when available and a deterministic content snapshot otherwise. This lets close/cancellation detect source changes outside canonical documents.

The plugin never initializes, clones, commits, pushes, deploys or operates an implementation repository.

Artifact implementation links use `<source-id>:<relative-path>`:

```yaml
implementation:
  - web-app:src/approval/revoke-link.ts
```

The source ID must exist, the relative target must remain inside that source, and the mapped path must exist.

## Verification commands

The engine does not infer commands from package files or document prose. `verify --execute` runs only the exact strings declared under the selected UT, IT or ST level. A command's `cwd` must resolve to the documentation root or a configured implementation source.

Each execution records:

- non-reusable `EXEC-*` identity and active `FLOW-*`;
- level and configured command ID;
- exact command and configured working directory;
- start/end time and exit code;
- Git commit when available;
- pre-execution source snapshot hash;
- captured log path and digest.

The engine renders the matching `RESULT-EXEC-*` from that record. It never overwrites a failed attempt; a rerun receives a new execution/result ID. Baseline verification uses the latest applicable attempt for each declared command.

## Documentation-only mode

Keep `implementation_sources` and all verification command arrays empty when no implementation repository is in scope:

```yaml
implementation_sources: []
verification:
  unit: []
  integration: []
  system: []
```

Evolution still requires active FTR -> UC/FLOW -> UT/IT/ST specification coverage. Execution is reported as `not-configured`; no pass is inferred or fabricated.
