import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Artifact, ArtifactGraph, BaselineManifest, ProjectConfig, ValidationFinding } from "./types.js";
import { reverseClosure } from "./graph.js";
import { driftedMappings } from "./mapping-hashes.js";
import { ignoredImplementationMappingRows, implementationMappingRows } from "./test-report.js";
import { pathExists } from "./state.js";

/**
 * Implementation levels and the specification types whose active instances
 * carry them — the same vocabulary the baseline coverage gate, test selection
 * and sdlc.config.yaml verification keys speak.
 */
export const IMPLEMENTATION_LEVELS = [
  { level: "UT", types: ["unit_test_backend", "unit_test_frontend", "unit_test_job"] },
  { level: "IT", types: ["integration_test"] },
  { level: "ST", types: ["system_test"] }
] as const;

export type ImplementationLevel = (typeof IMPLEMENTATION_LEVELS)[number]["level"];

const TEST_TYPE_SEGMENT = /(?:^|_)test(?:_|$)/;
const DESIGN_TYPES = new Set(["screen", "component", "subsystem", "api_processing", "entity", "external_integration", "job", "event", "platform_target"]);

export interface FeatureLevelState {
  level: ImplementationLevel;
  /** Active specifications of this level inside the feature's closure. */
  specs: Artifact[];
  /** The subset of those specifications carrying an implementation mapping. */
  mapped: Artifact[];
}

export interface FeatureImplementationState {
  feature: Artifact;
  closureIds: Set<string>;
  /** Active design-layer artifacts declaring this feature — the mappable denominator. */
  mappable: Artifact[];
  /** The subset of mappable artifacts carrying an implementation mapping. */
  mapped: Artifact[];
  /**
   * Whether any non-test artifact declaring this feature carries a mapping —
   * the single meaning of "this feature's own surface has started being
   * built".
   */
  anyOwnMapped: boolean;
  levels: FeatureLevelState[];
}

export function activeFeatures(artifacts: Artifact[]): Artifact[] {
  return artifacts
    .filter((artifact) => artifact.artifact_type === "feature" && artifact.status === "active")
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * The single source of truth for one feature's implementation-mapping state.
 * Both the IMPLEMENTATION_* warnings and the implementation-coverage projection
 * derive from this function, so the dashboard can never disagree with a
 * finding.
 *
 * Closure decides reach; declaration decides ownership. A shared entity pulls
 * a sibling feature's artifacts into the closure through writes_to
 * convergence, so a closure-wide predicate would let one feature's mappings
 * silence another feature's warnings. An artifact therefore proves only the
 * features it names in depends_on — shared artifacts still appear in the work
 * packet, but a feature's own state is derived from its own surface. Mapping
 * state is a claim about declared paths only; whether the mapped code passes
 * lives in execution records, never here.
 */
export function featureImplementationState(feature: Artifact, artifacts: Artifact[], graph: ArtifactGraph): FeatureImplementationState {
  const closureIds = new Set(reverseClosure(graph, [feature.id]));
  const own = artifacts.filter((artifact) => closureIds.has(artifact.id) && artifact.depends_on.includes(feature.id));
  const anyOwnMapped = own.some((artifact) => !TEST_TYPE_SEGMENT.test(artifact.artifact_type) && artifact.implementation.length > 0);
  const mappable = own
    .filter((artifact) => DESIGN_TYPES.has(artifact.artifact_type) && artifact.status === "active")
    .sort((a, b) => a.id.localeCompare(b.id));
  const mapped = mappable.filter((artifact) => artifact.implementation.length > 0);
  const levels = IMPLEMENTATION_LEVELS.map(({ level, types }) => {
    const specs = own
      .filter((artifact) => (types as readonly string[]).includes(artifact.artifact_type) && artifact.status === "active")
      .sort((a, b) => a.id.localeCompare(b.id));
    return { level, specs, mapped: specs.filter((spec) => spec.implementation.length > 0) };
  });
  return { feature, closureIds, mappable, mapped, anyOwnMapped, levels };
}

/** The levels a feature has active specifications for but no mapping proving them. */
export function unprovenLevels(state: FeatureImplementationState): FeatureLevelState[] {
  return state.levels.filter(({ specs, mapped }) => specs.length > 0 && mapped.length === 0);
}

/**
 * With implementation sources configured, a feature nothing maps and a level
 * nothing implements are standing records, not gates: a segment closes its
 * baseline honestly and the warning ledger carries what remains. Warning,
 * never error — the same doctrine as platform evidence, and the contract that
 * makes docs-first repositories and per-segment implementation legal. An
 * unconfigured repository reports nothing here and stays byte-identical.
 */
export function implementationMappingFindings(config: ProjectConfig, artifacts: Artifact[], graph: ArtifactGraph): ValidationFinding[] {
  if (config.implementation_sources.length === 0) return [];
  const findings: ValidationFinding[] = [];
  for (const feature of activeFeatures(artifacts)) {
    const state = featureImplementationState(feature, artifacts, graph);
    if (!state.anyOwnMapped) {
      findings.push({
        severity: "warning",
        code: "IMPLEMENTATION_MAPPING_MISSING",
        message: `${feature.id} has no implementation mapping on any artifact declaring it despite configured implementation sources; map the implementing artifacts when the feature is built, or let this warning stand as the durable record that it is specified but not yet implemented.`,
        file: feature.file
      });
      // Level detail under a feature nothing maps is noise; the dashboard
      // carries the per-level view and the single warning carries the state.
      continue;
    }
    for (const { level, specs } of unprovenLevels(state)) {
      findings.push({
        severity: "warning",
        code: "IMPLEMENTATION_LEVEL_UNPROVEN",
        message: `${feature.id} has active ${level} specification(s) (${specs.map((spec) => spec.id).join(", ")}) but none maps to an implemented test; implement and map the level, or let this warning stand as the durable record that ${level} for this feature is specified but unproven.`,
        file: feature.file
      });
    }
  }
  return findings;
}

/**
 * Docs↔code drift, per mapping: the mapped file's content differs from what
 * the baseline hashed while every artifact declaring it is unchanged — code
 * moved, documents did not. Warning, never error: the finding is the standing
 * record that hands Reconciliation its trigger, and a baseline that predates
 * mapping hashes observes nothing.
 */
export async function implementationDriftFindings(root: string, config: ProjectConfig, artifacts: Artifact[], baseline: BaselineManifest | null): Promise<ValidationFinding[]> {
  if (config.implementation_sources.length === 0) return [];
  const drifted = await driftedMappings(root, config, artifacts, baseline);
  return drifted.map(({ mapping, artifacts: declaring }) => ({
    severity: "warning" as const,
    code: "IMPLEMENTATION_DRIFT",
    message: `Mapped file ${mapping} changed since ${baseline?.id ?? "the baseline"} while its declaring artifact(s) (${declaring.map((artifact) => artifact.id).join(", ")}) did not; bring the documents level through a flow that owns the change, revert the code, or open a Reconciliation on this recorded divergence — this warning is the standing record of docs-to-code drift.`,
    file: declaring[0]!.file
  }));
}

/**
 * A specification's Implementation-mapping row names a test symbol; when the
 * row's test file exists inside a configured source but the symbol occurs
 * nowhere in it, the mapping is a claim about code that cannot be located.
 * Textual and approximate by design, warning only — renaming the test or
 * fixing the row are both repairs, and a row whose file does not exist is the
 * frontmatter mapping's duty, not this check's.
 */
export async function implementationSymbolFindings(root: string, config: ProjectConfig, artifacts: Artifact[]): Promise<ValidationFinding[]> {
  if (config.implementation_sources.length === 0) return [];
  const findings: ValidationFinding[] = [];
  const sourceRoots = config.implementation_sources.map((source) => path.resolve(root, source.path));
  const specTypes = new Set<string>(IMPLEMENTATION_LEVELS.flatMap(({ types }) => [...types]));
  for (const spec of artifacts.filter((artifact) => specTypes.has(artifact.artifact_type) && artifact.status === "active")) {
    // A row present but silently unparseable is invisible debt: the author
    // cannot tell a transposed table from an unwritten one.
    for (const ignoredRow of ignoredImplementationMappingRows(spec)) {
      findings.push({
        severity: "warning",
        code: "IMPLEMENTATION_MAPPING_ROW_IGNORED",
        message: `${spec.id} has an Implementation-mapping row that is present but ignored (${ignoredRow.reason}): "${ignoredRow.snippet}"; fix the row so its cases can join execution reports.`,
        file: spec.file
      });
    }
    for (const row of implementationMappingRows(spec)) {
      let found = false;
      let existsSomewhere = false;
      for (const sourceRoot of sourceRoots) {
        const candidate = path.resolve(sourceRoot, row.test_path);
        if (!candidate.startsWith(sourceRoot) || !(await pathExists(candidate))) continue;
        existsSomewhere = true;
        try {
          if ((await readFile(candidate, "utf8")).includes(row.symbol)) { found = true; break; }
        } catch {
          // Unreadable candidate: treated as not containing the symbol.
        }
      }
      if (existsSomewhere && !found) {
        findings.push({
          severity: "warning",
          code: "IMPLEMENTATION_SYMBOL_MISSING",
          message: `${spec.id} maps ${row.case_ids.join(", ")} to test symbol "${row.symbol}" in ${row.test_path}, but the symbol does not occur in that file (approximate textual check); fix the mapping row or the test name so the case can be located.`,
          file: spec.file
        });
      } else if (!existsSomewhere && spec.implementation.length > 0) {
        // Gated on the spec's own frontmatter claim: a spec that declares
        // implementation mappings has promised its rows resolve, so a path
        // found under no configured root is a transposed or stale row — while
        // honestly not-yet-implemented specs (sentinel paths) stay silent.
        findings.push({
          severity: "warning",
          code: "IMPLEMENTATION_MAPPING_PATH_MISSING",
          message: `${spec.id} maps ${row.case_ids.join(", ")} to ${row.test_path}, but that path exists under no configured implementation source while the specification declares implementation mappings — a transposed or stale row; fix the test path so the case can be located.`,
          file: spec.file
        });
      }
    }
  }
  return findings;
}
