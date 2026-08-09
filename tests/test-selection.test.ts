import { describe, expect, it } from "vitest";
import { buildGraph } from "../src/core/graph.js";
import { selectTests } from "../src/core/test-selection.js";
import { artifact } from "./helpers.js";

describe("UT, IT and ST selection", () => {
  it("selects existing regression specifications and reports no missing level", () => {
    const artifacts = [
      artifact({ id: "FTR-A-001", artifact_type: "feature" }),
      artifact({ id: "FLOW-A-001", artifact_type: "business_flow", depends_on: ["FTR-A-001"] }),
      artifact({ id: "API-A-001", artifact_type: "api_processing", depends_on: ["FLOW-A-001"] }),
      artifact({ id: "UT-API-A-001", artifact_type: "unit_test_backend", depends_on: ["API-A-001"] }),
      artifact({ id: "IT-A-001", artifact_type: "integration_test", depends_on: ["API-A-001"] }),
      artifact({ id: "ST-A-001", artifact_type: "system_test", depends_on: ["FTR-A-001"] })
    ];
    const selection = selectTests(artifacts, buildGraph(artifacts), ["FTR-A-001", "FLOW-A-001", "API-A-001"]);
    expect(selection.selected.unit).toEqual(["UT-API-A-001"]);
    expect(selection.selected.integration).toEqual(["IT-A-001"]);
    expect(selection.selected.system).toEqual(["ST-A-001"]);
    expect(selection.missing).toEqual([]);
  });

  it("requires all three levels when access rules change", () => {
    const access = artifact({ id: "ACCESS-CONTROL", artifact_type: "access_control" });
    const selection = selectTests([access], buildGraph([access]), [access.id]);
    expect(selection.required).toEqual({ unit: true, integration: true, system: true });
    expect(selection.missing).toHaveLength(3);
  });
});
