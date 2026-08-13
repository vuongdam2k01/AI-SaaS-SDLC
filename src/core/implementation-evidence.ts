import type { Artifact, ArtifactGraph, ProjectConfig, ValidationFinding } from "./types.js";
import { reverseClosure } from "./graph.js";

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
