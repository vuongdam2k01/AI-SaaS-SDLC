export const FLOW_TYPES = ["genesis", "reassessment", "evolution", "reconciliation"] as const;

// Checkpoints inside a flow, in the order a flow reaches them. These are not
// lifecycle stages and never gate one another: they are the points at which the
// author may take the turn back, review what exists and decide what happens
// next. A flow that stops at a checkpoint stays open and is continued by
// invoking the same skill again.
export const FLOW_STAGES = ["behavior", "design", "tests", "implementation", "baseline"] as const;
export type FlowStage = (typeof FLOW_STAGES)[number];

export function stageIndex(stage: string): number {
  return FLOW_STAGES.indexOf(stage as FlowStage);
}
export const ARTIFACT_STATUSES = ["draft", "active", "deprecated", "retired", "superseded"] as const;
// Issues carry their own lifecycle. ARTIFACT-LIFECYCLE and issue.pattern.md both
// prescribe open -> resolved, so the engine must accept those two and reject the
// authored-artifact vocabulary for this type rather than forcing a closed issue
// to masquerade as `active`.
export const ISSUE_STATUSES = ["open", "resolved"] as const;
export const ALL_ARTIFACT_STATUSES = [...ARTIFACT_STATUSES, ...ISSUE_STATUSES] as const;
export const ADR_STATUSES = ["proposed", "accepted", "deprecated", "superseded"] as const;

export type FlowType = (typeof FLOW_TYPES)[number];
export type ArtifactStatus = (typeof ARTIFACT_STATUSES)[number] | (typeof ISSUE_STATUSES)[number];

export function statusesForArtifactType(artifactType: string): readonly string[] {
  return artifactType === "issue" ? ISSUE_STATUSES : ARTIFACT_STATUSES;
}

// A live artifact participates in the baseline and must satisfy its content
// contract. `resolved` stays live: a closed issue keeps its closure evidence.
export function isLiveStatus(status: string): boolean {
  return status === "active" || status === "open" || status === "resolved";
}

export interface CommandDefinition {
  id: string;
  cwd: string;
  command: string;
}

export interface ProjectConfig {
  schema_version: 1;
  project_id: string;
  research_mode: "public-web-only";
  implementation_sources: Array<{ id: string; path: string }>;
  verification: {
    unit: CommandDefinition[];
    integration: CommandDefinition[];
    system: CommandDefinition[];
  };
}

export interface ArtifactMeta {
  id: string;
  artifact_type: string;
  title: string;
  status: ArtifactStatus | string;
  created_by_change: string;
  depends_on: string[];
  decisions: string[];
  supersedes: string | null;
  writes_to: string[];
  implementation: string[];
  adr_status?: string;
  execution_id?: string;
}

export interface Artifact extends ArtifactMeta {
  file: string;
  body: string;
  hash: string;
  metadata_issues: string[];
}

export interface ArtifactGraphNode {
  id: string;
  type: string;
  status: string;
  file: string;
  depends_on: string[];
  decisions: string[];
  supersedes: string | null;
  writes_to: string[];
  implementation: string[];
}

export interface ArtifactGraph {
  schema_version: 1;
  nodes: ArtifactGraphNode[];
  edges: Array<{ from: string; to: string; relation: "depends_on" | "decision" | "writes_to" | "supersedes" }>;
}

export interface ActiveFlow {
  schema_version: 1;
  id: string;
  type: FlowType;
  input: string;
  started_at: string;
  base_baseline: string | null;
  change_id: string | null;
  stop_blocked_once: boolean;
  start_snapshot_hash: string;
  implementation_snapshot_hash: string;
  /** Where the author asked this turn to stop. Absent means run to baseline. */
  target_stage?: FlowStage;
  /** The furthest checkpoint the flow has recorded. */
  reached_stage?: FlowStage;
  baseline_created?: string;
  baseline_implementation_snapshot_hash?: string;
}

export interface CurrentState {
  schema_version: 1;
  project_id: string;
  active_baseline: string | null;
  evidence_revision: number;
  next_change: number;
  next_flow: number;
  next_execution: number;
  id_registry: Record<string, string>;
}

export interface BaselineManifest {
  schema_version: 1;
  id: string;
  evidence_revision: string;
  created_at: string;
  git_commit: string | null;
  flow_type: FlowType;
  flow_id: string;
  artifacts: Array<{
      id: string;
      title: string;
      file: string;
    hash: string;
    status: string;
    artifact_type: string;
    created_by_change: string;
    depends_on: string[];
    decisions: string[];
      supersedes: string | null;
      writes_to: string[];
      implementation: string[];
      adr_status?: string;
  }>;
  executions: string[];
  verification: Record<"unit" | "integration" | "system", "passed" | "failed" | "not-configured" | "not-run">;
}

export interface ValidationFinding {
  severity: "error" | "warning";
  code: string;
  message: string;
  file?: string;
}

export interface ValidationReport {
  valid: boolean;
  findings: ValidationFinding[];
  artifact_count: number;
}

export interface ExecutionRecord {
  schema_version: 1;
  id: string;
  flow_id: string;
  level: "unit" | "integration" | "system";
  command_id: string;
  command: string;
  cwd: string;
  started_at: string;
  ended_at: string;
  exit_code: number;
  output_hash: string;
  output_file: string;
  git_commit: string | null;
  source_snapshot_hash: string;
}

export interface ChangeRecord {
  schema_version: 1;
  id: string;
  flow_id: string;
  type: "evolution" | "reconciliation";
  input: string;
  status: "active" | "baselined" | "closed" | "cancelled";
  base_baseline: string | null;
  started_at: string;
  closed_at?: string;
  successor_baseline?: string;
  impact?: { direct: string[]; affected: string[]; stale: string[] };
}
