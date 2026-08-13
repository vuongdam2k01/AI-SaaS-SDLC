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
  /** Live platform_target IDs this command produces execution evidence for. */
  platforms?: string[];
  /**
   * Where the command writes its machine-readable test report, relative to
   * its cwd. Declared, the engine parses it after every run and records
   * per-case results; undeclared, case counts honestly stay unreported.
   */
  report?: { path: string; format: "junit" | "tap" };
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
  /** Optional registered AREA segments; live IDs outside it warn AREA_UNREGISTERED. */
  areas?: string[];
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
  /**
   * On platform_target artifacts only: the process.platform value under which
   * evidence records for this target are expected to be observed. A declaration
   * like every other — an iOS target legitimately declares darwin. Optional so
   * that every artifact written before this field existed stays valid.
   */
  host_os?: string;
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
  /**
   * The declared input class of an evolution flow. `implementation` marks a
   * flow whose intent is bringing code into conformance with already-specified
   * behavior rather than changing behavior; it only routes guidance and is
   * never a gate or a lifecycle state.
   */
  intent?: "implementation";
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
  /**
   * Baseline at which each currently open question was first seen open.
   *
   * Age has to be measured somewhere, and the ledger table cannot hold it
   * without a required new column that would invalidate every repository
   * written before this field existed. Optional so that state written by an
   * earlier version still loads.
   */
  question_first_baseline?: Record<string, string>;
  /**
   * Counters for engine-owned retrieval provenance (RET-* and QRY-* records).
   * Optional so that state written before research instruments existed still
   * loads; absent means 1, exactly like a repository that never retrieved.
   */
  next_retrieval?: number;
  next_query?: number;
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
  /**
   * Content hash per mapped implementation path at baseline time, present
   * only when implementation sources are configured. The reference point the
   * IMPLEMENTATION_DRIFT warning compares against; absent on older baselines,
   * which therefore observe nothing.
   */
  implementation_hashes?: Record<string, string>;
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
  /** Copied verbatim from the command definition at execution time: the declaration. */
  platforms?: string[];
  /** Observed on the machine that ran the command: the fact. */
  host?: { os: string; release: string; arch: string; node: string };
  /** The command exceeded the machine-local time budget and was killed. */
  timed_out?: boolean;
  /** The captured log was cut at the machine-local byte budget. */
  output_truncated?: boolean;
  /** The command never ran (missing binary, bad cwd) — an environment failure, not a test failure. */
  spawn_error?: boolean;
  /** Parsed from the command's declared report file; absent when none is declared. */
  report?: { path: string; format: "junit" | "tap"; hash: string; total: number; passed: number; failed: number; skipped: number };
  /** A declared report the engine could not read or parse; the run's outcome is unaffected. */
  report_error?: string;
  /** Per-case results joined to specification rows at execution time; null joins mean no unambiguous row matched. */
  cases?: Array<{ name: string; status: "passed" | "failed" | "skipped"; time_ms: number | null; spec_id: string | null; case_ids: string[] | null }>;
}

/**
 * One engine-performed page retrieval. The record is the engine's own
 * observation of the fetch — status, timing, digest of the stored body — so
 * evidence citing it rests on provenance the engine witnessed, mirroring how
 * ExecutionRecord backs RESULT artifacts. Failed retrievals write records too
 * (`ok: false`, no body): degradation must be derivable from committed
 * records alone, never from the environment of the machine validating.
 */
export interface RetrievalRecord {
  schema_version: 1;
  id: string;
  flow_id: string;
  url: string;
  instrument: "firecrawl" | "camofox";
  via: "fetch" | "crawl";
  ok: boolean;
  /**
   * Highest instrument tier configured on the machine when the record was
   * written: 1 searxng, 2 firecrawl, 3 camofox. Stamped so validation can
   * reason about what was available without ever reading live environment.
   */
  capability_rung: 1 | 2 | 3;
  started_at: string;
  ended_at: string;
  git_commit: string | null;
  /** Present exactly when ok: the stored page body and its provenance. */
  body_file?: string;
  body_hash?: string;
  body_bytes?: number;
  truncated?: boolean;
  /** Firecrawl API generation observed at retrieval time. */
  api_version?: "v1" | "v2";
  status_code?: number;
  title?: string;
  resolved_url?: string;
  /** Seed URL of the crawl this page came from; present exactly when via is crawl. */
  crawl_seed?: string;
  wait_ms?: number;
  /** Camofox only: the rung-2 failure this retrieval escalated from. */
  escalation?: { from: "firecrawl"; reason: string };
  /** Present exactly when not ok. */
  error?: string;
}

/**
 * One engine-performed discovery pass — a SearXNG search or a Firecrawl site
 * map. Query records make the protocol's "record the query" instruction a
 * durable machine fact and preserve per-engine failure so an empty result set
 * is never mistaken for a silent market.
 */
export interface QueryRecord {
  schema_version: 1;
  id: string;
  flow_id: string;
  kind: "search" | "map";
  instrument: "searxng" | "firecrawl";
  ok: boolean;
  capability_rung: 1 | 2 | 3;
  query: string;
  started_at: string;
  ended_at: string;
  git_commit: string | null;
  /** Seed URL; present exactly when kind is map. */
  url?: string;
  /** Search pass class from the research protocol; search only. */
  pass?: "authority" | "official" | "discussion" | "counter" | "freshness";
  engines?: string[];
  categories?: string;
  language?: string;
  pageno?: number;
  time_range?: "day" | "month" | "year";
  limit?: number;
  api_version?: "v1" | "v2";
  /** Present exactly when ok; capped by policy, count preserved separately. */
  results?: Array<{ url: string; title?: string; engine?: string; score?: number; published?: string }>;
  result_count?: number;
  /** SearXNG upstream engines that failed this query — engine failure is not market silence. */
  unresponsive_engines?: string[];
  /** Present exactly when not ok. */
  error?: string;
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
