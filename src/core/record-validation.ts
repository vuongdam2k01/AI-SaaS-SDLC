import { FLOW_TYPES, statusesForArtifactType } from "./types.js";
import type { ActiveFlow, BaselineManifest, ChangeRecord, ExecutionRecord } from "./types.js";

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function artifactIds(value: unknown): value is string[] {
  return strings(value) && value.every((item) => /^[A-Z][A-Z0-9-]*$/.test(item)) && new Set(value).size === value.length;
}

function exactKeys(value: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function id(value: unknown, prefix: string): boolean {
  return typeof value === "string" && new RegExp(`^${prefix}-[0-9]{3,}$`).test(value);
}

function dateTime(value: unknown): boolean {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function isActiveFlow(value: unknown): value is ActiveFlow {
  if (!record(value) || !exactKeys(value, ["schema_version", "id", "type", "input", "started_at", "base_baseline", "change_id", "stop_blocked_once", "start_snapshot_hash", "implementation_snapshot_hash", "baseline_created", "baseline_implementation_snapshot_hash"])) return false;
  const semantic = value.type === "evolution" || value.type === "reconciliation";
  const baseValid = value.type === "genesis" ? value.base_baseline === null : id(value.base_baseline, "BL");
  return value.schema_version === 1
    && id(value.id, "FLOW")
    && FLOW_TYPES.includes(value.type as ActiveFlow["type"])
    && typeof value.input === "string"
    && dateTime(value.started_at)
    && baseValid
    && (value.change_id === null || id(value.change_id, "CHG"))
    && (semantic ? value.change_id !== null : value.change_id === null)
    && typeof value.stop_blocked_once === "boolean"
    && typeof value.start_snapshot_hash === "string" && /^[a-f0-9]{64}$/.test(value.start_snapshot_hash)
    && typeof value.implementation_snapshot_hash === "string" && /^[a-f0-9]{64}$/.test(value.implementation_snapshot_hash)
    && (value.baseline_created === undefined || id(value.baseline_created, "BL"))
    && (value.baseline_implementation_snapshot_hash === undefined || typeof value.baseline_implementation_snapshot_hash === "string" && /^[a-f0-9]{64}$/.test(value.baseline_implementation_snapshot_hash))
    && (value.baseline_created === undefined ? value.baseline_implementation_snapshot_hash === undefined : value.baseline_implementation_snapshot_hash !== undefined);
}

export function isExecutionRecord(value: unknown): value is ExecutionRecord {
  if (!record(value) || !exactKeys(value, ["schema_version", "id", "flow_id", "level", "command_id", "command", "cwd", "started_at", "ended_at", "exit_code", "output_hash", "output_file", "git_commit", "source_snapshot_hash"])) return false;
  return value.schema_version === 1
    && id(value.id, "EXEC")
    && id(value.flow_id, "FLOW")
    && ["unit", "integration", "system"].includes(String(value.level))
    && typeof value.command_id === "string" && /^[a-z0-9][a-z0-9-]*$/.test(value.command_id)
    && [value.command, value.cwd, value.output_file].every((item) => typeof item === "string" && item.length > 0)
    && dateTime(value.started_at) && dateTime(value.ended_at)
    && Number.isInteger(value.exit_code)
    && typeof value.output_hash === "string" && /^[a-f0-9]{64}$/.test(value.output_hash)
    && (value.git_commit === null || typeof value.git_commit === "string")
    && typeof value.source_snapshot_hash === "string" && /^[a-f0-9]{64}$/.test(value.source_snapshot_hash);
}

export function isChangeRecord(value: unknown): value is ChangeRecord {
  if (!record(value) || !exactKeys(value, ["schema_version", "id", "flow_id", "type", "input", "status", "base_baseline", "started_at", "closed_at", "successor_baseline", "impact"])) return false;
  const impact = value.impact;
  const impactValid = impact === undefined || (record(impact) && exactKeys(impact, ["direct", "affected", "stale"]) && artifactIds(impact.direct) && artifactIds(impact.affected) && artifactIds(impact.stale));
  const lifecycleValid = value.status === "active"
    ? value.closed_at === undefined && value.successor_baseline === undefined && value.impact === undefined
    : value.status === "baselined"
      ? value.closed_at === undefined && id(value.successor_baseline, "BL") && impact !== undefined
      : value.status === "closed"
        ? dateTime(value.closed_at) && id(value.successor_baseline, "BL") && impact !== undefined
        : value.status === "cancelled" && dateTime(value.closed_at) && value.successor_baseline === undefined && value.impact === undefined;
  return value.schema_version === 1
    && id(value.id, "CHG")
    && id(value.flow_id, "FLOW")
    && (value.type === "evolution" || value.type === "reconciliation")
    && typeof value.input === "string"
    && ["active", "baselined", "closed", "cancelled"].includes(String(value.status))
    && id(value.base_baseline, "BL")
    && dateTime(value.started_at)
    && (value.closed_at === undefined || dateTime(value.closed_at))
    && (value.successor_baseline === undefined || id(value.successor_baseline, "BL"))
    && impactValid
    && lifecycleValid;
}

export function isBaselineManifest(value: unknown): value is BaselineManifest {
  if (!record(value) || !exactKeys(value, ["schema_version", "id", "evidence_revision", "created_at", "git_commit", "flow_type", "flow_id", "artifacts", "executions", "verification"]) || !Array.isArray(value.artifacts) || !strings(value.executions) || !record(value.verification)) return false;
  const verification = value.verification;
  const verdicts = ["passed", "failed", "not-configured", "not-run"];
  const baselineArtifactIds = value.artifacts.filter(record).map((item) => item.id);
  const artifactFiles = value.artifacts.filter(record).map((item) => item.file);
  return value.schema_version === 1
    && id(value.id, "BL")
    && id(value.evidence_revision, "EVR")
    && dateTime(value.created_at)
    && (value.git_commit === null || typeof value.git_commit === "string")
    && FLOW_TYPES.includes(value.flow_type as BaselineManifest["flow_type"])
    && id(value.flow_id, "FLOW")
    && value.artifacts.every((item) => record(item)
      && exactKeys(item, ["id", "title", "file", "hash", "status", "artifact_type", "created_by_change", "depends_on", "decisions", "supersedes", "writes_to", "implementation", "adr_status"])
      && typeof item.id === "string" && /^[A-Z][A-Z0-9-]*$/.test(item.id)
      && typeof item.title === "string" && item.title.length > 0
      && typeof item.file === "string" && item.file.length > 0 && !item.file.startsWith("/") && !item.file.includes("..")
      && typeof item.hash === "string" && /^[a-f0-9]{64}$/.test(item.hash)
      && typeof item.status === "string" && typeof item.artifact_type === "string"
      && statusesForArtifactType(item.artifact_type).includes(item.status)
      && item.artifact_type.length > 0
      && typeof item.created_by_change === "string" && /^(?:INIT|GENESIS|FLOW-[0-9]{3,}|CHG-[0-9]{3,})$/.test(item.created_by_change)
      && artifactIds(item.depends_on) && artifactIds(item.decisions) && artifactIds(item.writes_to) && strings(item.implementation)
      && (item.supersedes === null || (typeof item.supersedes === "string" && /^[A-Z][A-Z0-9-]*$/.test(item.supersedes)))
      && (item.adr_status === undefined || ["proposed", "accepted", "deprecated", "superseded"].includes(String(item.adr_status))))
    && new Set(baselineArtifactIds).size === baselineArtifactIds.length
    && new Set(artifactFiles).size === artifactFiles.length
    && value.executions.every((execution) => id(execution, "EXEC"))
    && new Set(value.executions).size === value.executions.length
    && exactKeys(verification, ["unit", "integration", "system"])
    && ["unit", "integration", "system"].every((level) => verdicts.includes(String(verification[level])));
}
