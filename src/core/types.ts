export const FLOW_TYPES = ["genesis", "reassessment", "evolution", "reconciliation"] as const;
export const ARTIFACT_STATUSES = ["draft", "active", "deprecated", "retired", "superseded"] as const;
export const ADR_STATUSES = ["proposed", "accepted", "deprecated", "superseded"] as const;

export type FlowType = (typeof FLOW_TYPES)[number];
export type ArtifactStatus = (typeof ARTIFACT_STATUSES)[number];

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
