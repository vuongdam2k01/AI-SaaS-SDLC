import { readFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import type { Artifact, ValidationFinding, ValidationReport } from "./types.js";
import { ADR_STATUSES, ARTIFACT_STATUSES } from "./types.js";
import { buildGraph, topologicalOrder } from "./graph.js";
import { loadConfig } from "./config.js";
import { loadCurrentState, pathExists } from "./state.js";
import { projectPaths } from "./paths.js";
import { assertSafeManagedPath, isRealPathWithin, isWithin } from "./paths.js";
import type { BaselineManifest } from "./types.js";
import { readJson } from "./utils.js";
import { isBaselineManifest } from "./record-validation.js";
import { validateInternalRecords } from "./internal-validation.js";
import { CANONICAL_MARKDOWN, CANONICAL_TYPES, FIXED_TYPES, SCALABLE_LOCATIONS } from "./artifact-contracts.js";
import { validateActiveArtifactContent } from "./content-contracts.js";

const requiredFiles = [
  ...Object.keys(CANONICAL_MARKDOWN),
  "03-design/interfaces/openapi.yaml",
  "03-design/data/schema.dbml",
  "03-design/screen-transitions.mmd",
];

const fixedIdentities: Record<string, [string, string]> = {
  engine_configuration: ["SDLC-CONFIG", "sdlc.config.yaml"],
  openapi_contract: ["OPENAPI-CONTRACT", "03-design/interfaces/openapi.yaml"],
  physical_schema: ["PHYSICAL-SCHEMA", "03-design/data/schema.dbml"],
  screen_transitions: ["SCREEN-TRANSITIONS", "03-design/screen-transitions.mmd"]
};

export async function validateProject(root: string, artifacts: Artifact[]): Promise<ValidationReport> {
  const findings: ValidationFinding[] = [];
  let config: Awaited<ReturnType<typeof loadConfig>> | null = null;
  try { config = await loadConfig(root); } catch (error) {
    findings.push({ severity: "error", code: "CONFIG_INVALID", message: String(error) });
  }
  for (const file of requiredFiles) {
    if (!(await pathExists(path.join(root, file)))) findings.push({ severity: "error", code: "REQUIRED_FILE_MISSING", message: `Required file is missing: ${file}`, file });
  }
  if (config) {
    for (const source of config.implementation_sources) {
      const sourceRoot = path.resolve(root, source.path);
      if (!(await pathExists(sourceRoot))) findings.push({ severity: "error", code: "IMPLEMENTATION_SOURCE_MISSING", message: `Configured implementation source is missing: ${source.id} (${source.path})` });
    }
  }
  const byId = new Map<string, Artifact>();
  for (const artifact of artifacts) {
    for (const issue of artifact.metadata_issues) findings.push({ severity: "error", code: "FRONTMATTER_SCHEMA", message: issue, file: artifact.file });
    for (const field of ["id", "artifact_type", "title", "status", "created_by_change"] as const) {
      if (!artifact[field]) findings.push({ severity: "error", code: "METADATA_REQUIRED", message: `Missing ${field}`, file: artifact.file });
    }
    if (!/^(?:INIT|GENESIS|FLOW-[0-9]{3,}|CHG-[0-9]{3,})$/.test(artifact.created_by_change)) findings.push({ severity: "error", code: "CREATION_ID_INVALID", message: `Invalid creation identity: ${artifact.created_by_change}`, file: artifact.file });
    if (!/^[A-Z][A-Z0-9-]*$/.test(artifact.id)) findings.push({ severity: "error", code: "ID_INVALID", message: `Invalid artifact ID: ${artifact.id}`, file: artifact.file });
    if (!ARTIFACT_STATUSES.includes(artifact.status as (typeof ARTIFACT_STATUSES)[number])) findings.push({ severity: "error", code: "STATUS_INVALID", message: `Invalid status: ${artifact.status}`, file: artifact.file });
    if (byId.has(artifact.id)) findings.push({ severity: "error", code: "ID_DUPLICATE", message: `Duplicate artifact ID: ${artifact.id}`, file: artifact.file });
    else byId.set(artifact.id, artifact);
    const canonical = CANONICAL_MARKDOWN[artifact.file as keyof typeof CANONICAL_MARKDOWN];
    if (canonical && (artifact.id !== canonical[0] || artifact.artifact_type !== canonical[1])) findings.push({ severity: "error", code: "CANONICAL_IDENTITY_INVALID", message: `${artifact.file} must be ${canonical[0]} with type ${canonical[1]}`, file: artifact.file });
    else if (!canonical && CANONICAL_TYPES.has(artifact.artifact_type)) findings.push({ severity: "error", code: "CANONICAL_LOCATION_INVALID", message: `${artifact.artifact_type} is a singleton canonical type and cannot appear at ${artifact.file}`, file: artifact.file });
    else if (SCALABLE_LOCATIONS[artifact.artifact_type] && !SCALABLE_LOCATIONS[artifact.artifact_type]!.test(artifact.file)) findings.push({ severity: "error", code: "ARTIFACT_LOCATION_INVALID", message: `${artifact.artifact_type} cannot appear at ${artifact.file}`, file: artifact.file });
    else if (SCALABLE_LOCATIONS[artifact.artifact_type] && path.basename(artifact.file, ".md") !== artifact.id) findings.push({ severity: "error", code: "ARTIFACT_FILENAME_MISMATCH", message: `${artifact.id} must use the matching filename ${artifact.id}.md`, file: artifact.file });
    else if (FIXED_TYPES.has(artifact.artifact_type)) {
      const fixed = fixedIdentities[artifact.artifact_type];
      if (!fixed || artifact.id !== fixed[0] || artifact.file !== fixed[1]) findings.push({ severity: "error", code: "FIXED_IDENTITY_INVALID", message: `${artifact.artifact_type} has an invalid fixed identity`, file: artifact.file });
    } else if (!SCALABLE_LOCATIONS[artifact.artifact_type] && !canonical) findings.push({ severity: "error", code: "ARTIFACT_TYPE_UNKNOWN", message: `Unknown artifact type: ${artifact.artifact_type}`, file: artifact.file });
    if (artifact.artifact_type === "architectural_decision" && (!artifact.adr_status || !ADR_STATUSES.includes(artifact.adr_status as (typeof ADR_STATUSES)[number]))) {
      findings.push({ severity: "error", code: "ADR_STATUS_INVALID", message: "ADR requires adr_status: proposed|accepted|deprecated|superseded", file: artifact.file });
    }
  }
  for (const type of CANONICAL_TYPES) {
    const matches = artifacts.filter((artifact) => artifact.artifact_type === type);
    if (matches.length !== 1) findings.push({ severity: "error", code: "CANONICAL_SINGLETON", message: `Expected exactly one ${type}; found ${matches.length}` });
  }
  for (const artifact of artifacts) {
    for (const reference of [...artifact.depends_on, ...artifact.decisions, ...artifact.writes_to]) {
      if (!byId.has(reference)) findings.push({ severity: "error", code: "REFERENCE_BROKEN", message: `${artifact.id} references missing ${reference}`, file: artifact.file });
    }
    for (const decision of artifact.decisions) {
      const target = byId.get(decision);
      if (target && target.artifact_type !== "architectural_decision") findings.push({ severity: "error", code: "DECISION_TYPE_INVALID", message: `${artifact.id} decision ${decision} is not an ADR`, file: artifact.file });
    }
    if (artifact.supersedes && !byId.has(artifact.supersedes)) findings.push({ severity: "error", code: "SUPERSEDES_BROKEN", message: `${artifact.id} supersedes missing ${artifact.supersedes}`, file: artifact.file });
    if (artifact.supersedes === artifact.id) findings.push({ severity: "error", code: "SUPERSEDES_SELF", message: `${artifact.id} cannot supersede itself`, file: artifact.file });
    if (artifact.supersedes) {
      const previous = byId.get(artifact.supersedes);
      if (previous && previous.artifact_type !== artifact.artifact_type) findings.push({ severity: "error", code: "SUPERSEDES_TYPE_INVALID", message: `${artifact.id} cannot supersede a different artifact type`, file: artifact.file });
    }
    for (const reference of [...artifact.depends_on, ...artifact.writes_to]) {
      const upstream = byId.get(reference);
      if (upstream && (upstream.status === "retired" || upstream.status === "superseded") && (artifact.status === "active" || artifact.status === "draft")) {
        findings.push({ severity: "error", code: "LIFECYCLE_DEPENDENCY", message: `${artifact.id} is ${artifact.status} but depends on ${upstream.status} ${reference}`, file: artifact.file });
      }
    }
    if (config) {
      for (const mapping of artifact.implementation) {
        const separator = mapping.indexOf(":");
        const sourceId = separator > 0 ? mapping.slice(0, separator) : "";
        const relative = separator > 0 ? mapping.slice(separator + 1) : "";
        const source = config.implementation_sources.find((item) => item.id === sourceId);
        if (!source || !relative) {
          findings.push({ severity: "error", code: "IMPLEMENTATION_MAPPING_INVALID", message: `${artifact.id} implementation mapping must be <source-id>:<relative-path>: ${mapping}`, file: artifact.file });
          continue;
        }
        const sourceRoot = path.resolve(root, source.path);
        const target = path.resolve(sourceRoot, relative);
        if (!isWithin(sourceRoot, target)) findings.push({ severity: "error", code: "IMPLEMENTATION_MAPPING_ESCAPE", message: `${artifact.id} implementation mapping escapes source ${sourceId}: ${mapping}`, file: artifact.file });
        else if (!(await pathExists(target))) findings.push({ severity: "error", code: "IMPLEMENTATION_TARGET_MISSING", message: `${artifact.id} implementation target does not exist: ${mapping}`, file: artifact.file });
        else {
          try {
            if (!(await isRealPathWithin(sourceRoot, target))) findings.push({ severity: "error", code: "IMPLEMENTATION_MAPPING_SYMLINK_ESCAPE", message: `${artifact.id} implementation mapping escapes source ${sourceId} through a symlink: ${mapping}`, file: artifact.file });
          } catch {
            findings.push({ severity: "error", code: "IMPLEMENTATION_SOURCE_INVALID", message: `Cannot resolve implementation source ${sourceId}`, file: artifact.file });
          }
        }
      }
    }
  }
  const graph = buildGraph(artifacts);
  const order = topologicalOrder(graph);
  if (order.cycles.length > 0) findings.push({ severity: "error", code: "DEPENDENCY_CYCLE", message: `Dependency cycle contains: ${order.cycles.join(", ")}` });
  for (const artifact of artifacts) {
    const seen = new Set<string>([artifact.id]);
    let cursor = artifact.supersedes;
    while (cursor) {
      if (seen.has(cursor)) {
        findings.push({ severity: "error", code: "SUPERSEDES_CYCLE", message: `Supersession cycle contains ${artifact.id} and ${cursor}`, file: artifact.file });
        break;
      }
      seen.add(cursor);
      cursor = byId.get(cursor)?.supersedes ?? null;
    }
  }
  try {
    const openapi = YAML.parse(await readFile(path.join(root, "03-design/interfaces/openapi.yaml"), "utf8")) as Record<string, unknown>;
    if (openapi.openapi !== "3.1.0") findings.push({ severity: "error", code: "OPENAPI_VERSION", message: "openapi.yaml must use OpenAPI 3.1.0" });
  } catch (error) {
    findings.push({ severity: "error", code: "OPENAPI_INVALID", message: `Invalid openapi.yaml: ${String(error)}` });
  }
  try {
    const state = await loadCurrentState(root);
    if (config && state.project_id !== config.project_id) findings.push({ severity: "error", code: "PROJECT_ID_MISMATCH", message: `State project_id ${state.project_id} does not match configuration ${config.project_id}` });
    for (const artifact of artifacts) {
      const registered = state.id_registry[artifact.id];
      if (registered && registered !== artifact.file) findings.push({ severity: "error", code: "ID_REUSED", message: `${artifact.id} was first registered at ${registered}, not ${artifact.file}`, file: artifact.file });
    }
  } catch {
    findings.push({ severity: "error", code: "STATE_INVALID", message: `Missing or invalid ${projectPaths(root).current}` });
  }
  const baselineFile = projectPaths(root).baseline;
  if (await pathExists(baselineFile)) {
    try {
      await assertSafeManagedPath(root, baselineFile);
      const baseline = await readJson<BaselineManifest>(baselineFile);
      if (!isBaselineManifest(baseline)) throw new Error("schema mismatch");
      const old = new Map(baseline.artifacts.map((item) => [item.id, item]));
      for (const previous of old.values()) {
        if (!byId.has(previous.id)) findings.push({ severity: "error", code: "BASELINED_ARTIFACT_DELETED", message: `${previous.id} must be retained and marked deprecated, retired, or superseded instead of deleted`, file: previous.file });
      }
      for (const artifact of artifacts) {
        const previous = old.get(artifact.id);
        if (previous && (previous.artifact_type !== artifact.artifact_type || previous.created_by_change !== artifact.created_by_change)) {
          findings.push({ severity: "error", code: "ARTIFACT_IDENTITY_CHANGED", message: `${artifact.id} changed its permanent artifact type or creation identity`, file: artifact.file });
        }
        const immutable = previous?.artifact_type === "original_idea"
          || (previous?.artifact_type === "architectural_decision" && previous.adr_status === "accepted")
          || previous?.status === "retired" || previous?.status === "superseded";
        if (immutable && previous && previous.hash !== artifact.hash) findings.push({ severity: "error", code: "IMMUTABLE_CHANGED", message: `${artifact.id} is immutable after baselining; create a successor artifact instead`, file: artifact.file });
      }
    } catch {
      findings.push({ severity: "error", code: "BASELINE_INVALID", message: "baseline-manifest.json is invalid" });
    }
  }
  try {
    findings.push(...await validateActiveArtifactContent(root, artifacts));
  } catch (error) {
    findings.push({ severity: "error", code: "PATTERN_CATALOG_INVALID", message: String(error) });
  }
  findings.push(...await validateInternalRecords(root, artifacts));
  return { valid: findings.every((item) => item.severity !== "error"), findings, artifact_count: artifacts.length };
}
