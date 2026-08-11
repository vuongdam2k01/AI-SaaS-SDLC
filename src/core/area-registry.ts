import type { Artifact, ProjectConfig, ValidationFinding } from "./types.js";
import { isLiveStatus } from "./types.js";

// Scalable types whose IDs carry an AREA segment between the type prefix and
// the numeric suffix. Discovery types (ICP/PERSONA/PROBLEM/COMPETITOR) name a
// segment or slug instead of an area, and results are engine-owned, so none of
// them participate.
const AREA_PREFIXES: Record<string, string[]> = {
  feature: ["FTR"],
  use_case: ["UC"],
  business_flow: ["FLOW"],
  screen: ["SCR"],
  component: ["CMP"],
  subsystem: ["SUB"],
  api_processing: ["API"],
  entity: ["ENT"],
  external_integration: ["INT"],
  job: ["JOB"],
  event: ["EVT"],
  platform_target: ["PLT"],
  unit_test_backend: ["UT-API", "UT-CORE"],
  unit_test_frontend: ["UT-UI"],
  unit_test_job: ["UT-JOB"],
  integration_test: ["IT"],
  system_test: ["ST"],
  issue: ["ISS"],
  architectural_decision: ["ADR"]
};

/** ORDERS-EU from SUB-ORDERS-EU-001; null when the ID has no numeric suffix. */
export function areaOf(artifactType: string, id: string): string | null {
  for (const prefix of AREA_PREFIXES[artifactType] ?? []) {
    const match = new RegExp(`^${prefix}-(.+)-[0-9]{2,}$`).exec(id);
    if (match) return match[1]!;
  }
  return null;
}

/**
 * Cross-checks live artifact IDs against the optional areas registry in
 * sdlc.config.yaml. The registry is opt-in, human-owned truth like platform
 * declarations: absent, IDs stay unconstrained exactly as before; declared, an
 * ID whose area segment is unregistered is a naming decision made visible as a
 * warning — never an error, because permanent IDs cannot be renamed after
 * baselining and a baseline must not fail on a name.
 */
export function areaFindings(config: ProjectConfig, artifacts: Artifact[]): ValidationFinding[] {
  const registered = config.areas;
  if (!registered) return [];
  const areas = new Set(registered);
  const findings: ValidationFinding[] = [];
  for (const artifact of artifacts) {
    if (!isLiveStatus(artifact.status)) continue;
    const area = areaOf(artifact.artifact_type, artifact.id);
    if (area === null || areas.has(area)) continue;
    findings.push({
      severity: "warning",
      code: "AREA_UNREGISTERED",
      message: `${artifact.id} names area ${area}, which sdlc.config.yaml does not register; add it to areas or pick a registered area before the ID is baselined.`,
      file: artifact.file
    });
  }
  return findings;
}
