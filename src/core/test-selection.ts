import type { Artifact, ArtifactGraph } from "./types.js";

export interface TestSelection {
  selected: Record<"unit" | "integration" | "system", string[]>;
  required: Record<"unit" | "integration" | "system", boolean>;
  missing: string[];
}

const testTypes = {
  unit: new Set(["unit_test_backend", "unit_test_frontend", "unit_test_job"]),
  integration: new Set(["integration_test"]),
  system: new Set(["system_test"])
};

export function selectTests(artifacts: Artifact[], graph: ArtifactGraph, affected: string[]): TestSelection {
  const affectedSet = new Set(affected);
  const affectedTypes = new Set(graph.nodes.filter((node) => affectedSet.has(node.id) && node.status !== "retired" && node.status !== "superseded").map((node) => node.type));
  const required = {
    unit: ["feature", "use_case", "screen", "component", "subsystem", "api_processing", "entity", "job", "access_control", "system_invariants", "error_catalog", "openapi_contract", "screen_transitions"].some((type) => affectedTypes.has(type)),
    integration: ["business_flow", "subsystem", "api_processing", "entity", "external_integration", "job", "event", "access_control", "quality_requirements", "system_invariants", "error_catalog", "openapi_contract", "physical_schema"].some((type) => affectedTypes.has(type)),
    system: ["feature", "use_case", "business_flow", "access_control", "quality_requirements", "system_invariants", "openapi_contract", "screen_transitions"].some((type) => affectedTypes.has(type))
  };
  const selected = { unit: [] as string[], integration: [] as string[], system: [] as string[] };
  for (const [level, types] of Object.entries(testTypes) as Array<[keyof typeof testTypes, Set<string>]>) {
    selected[level] = artifacts
      .filter((artifact) => artifact.status !== "retired" && artifact.status !== "superseded" && types.has(artifact.artifact_type) && artifact.depends_on.some((id) => affectedSet.has(id)))
      .map((artifact) => artifact.id)
      .sort();
  }
  const missing = (Object.keys(required) as Array<keyof typeof required>)
    .filter((level) => required[level] && selected[level].length === 0)
    .map((level) => `No ${level.toUpperCase()} specification covers the affected artifacts.`);
  return { selected, required, missing };
}
