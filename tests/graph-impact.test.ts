import { describe, expect, it } from "vitest";
import { buildGraph, reverseClosure, topologicalOrder } from "../src/core/graph.js";
import { calculateImpact } from "../src/core/impact.js";
import { artifact } from "./helpers.js";

describe("artifact graph and impact", () => {
  const artifacts = [
    artifact({ id: "FTR-A-001", artifact_type: "feature" }),
    artifact({ id: "UC-A-001", artifact_type: "use_case", depends_on: ["FTR-A-001"] }),
    artifact({ id: "ENT-SHARED-001", artifact_type: "entity", depends_on: ["FTR-A-001"] }),
    artifact({ id: "API-A-001", artifact_type: "api_processing", depends_on: ["UC-A-001", "ENT-SHARED-001"] }),
    artifact({ id: "FTR-B-001", artifact_type: "feature" }),
    artifact({ id: "API-B-001", artifact_type: "api_processing", depends_on: ["FTR-B-001", "ENT-SHARED-001"] })
  ];

  it("walks all reverse dependents of a shared entity", () => {
    const graph = buildGraph(artifacts);
    expect(reverseClosure(graph, ["ENT-SHARED-001"])).toEqual(["API-A-001", "API-B-001", "ENT-SHARED-001"]);
  });

  it("orders dependencies before consumers", () => {
    const result = topologicalOrder(buildGraph(artifacts));
    expect(result.cycles).toEqual([]);
    expect(result.order.indexOf("ENT-SHARED-001")).toBeLessThan(result.order.indexOf("API-B-001"));
  });

  it("counts a shared target once when both dependency and write relations exist", () => {
    const overlapping = [
      artifact({ id: "ENT-A-001", artifact_type: "entity" }),
      artifact({ id: "API-A-001", artifact_type: "api_processing", depends_on: ["ENT-A-001"], writes_to: ["ENT-A-001"] })
    ];
    const result = topologicalOrder(buildGraph(overlapping));
    expect(result.cycles).toEqual([]);
    expect(result.order).toEqual(["ENT-A-001", "API-A-001"]);
  });

  it("converges from a changed writer through its shared target to co-writers", () => {
    const shared = [
      artifact({ id: "ENT-A-001", artifact_type: "entity" }),
      artifact({ id: "API-A-001", artifact_type: "api_processing", writes_to: ["ENT-A-001"] }),
      artifact({ id: "API-B-001", artifact_type: "api_processing", writes_to: ["ENT-A-001"] })
    ];
    expect(reverseClosure(buildGraph(shared), ["API-A-001"])).toEqual(["API-A-001", "API-B-001", "ENT-A-001"]);
  });

  it("converges from a successor to the old decision and its consumers", () => {
    const decisions = [
      artifact({ id: "ADR-OLD-001", artifact_type: "architectural_decision" }),
      artifact({ id: "ADR-NEW-001", artifact_type: "architectural_decision", supersedes: "ADR-OLD-001" }),
      artifact({ id: "SUB-A-001", artifact_type: "subsystem", decisions: ["ADR-OLD-001"] })
    ];
    expect(reverseClosure(buildGraph(decisions), ["ADR-NEW-001"])).toEqual(["ADR-NEW-001", "ADR-OLD-001", "SUB-A-001"]);
  });

  it("converges a canonical interface change into detailed contracts and tests", () => {
    const contracts = [
      artifact({ id: "OPENAPI-CONTRACT", artifact_type: "openapi_contract", depends_on: ["API-A-001"] }),
      artifact({ id: "API-A-001", artifact_type: "api_processing" }),
      artifact({ id: "IT-A-001", artifact_type: "integration_test", depends_on: ["API-A-001"] })
    ];
    expect(reverseClosure(buildGraph(contracts), ["OPENAPI-CONTRACT"])).toEqual(["API-A-001", "IT-A-001", "OPENAPI-CONTRACT"]);
  });

  it("detects changed and indirectly stale artifacts", () => {
    const baseline = {
      schema_version: 1 as const,
      id: "BL-001",
      evidence_revision: "EVR-001",
      created_at: "2026-01-01T00:00:00.000Z",
      git_commit: null,
      flow_type: "evolution" as const,
      flow_id: "FLOW-002",
      artifacts: artifacts.map((item) => ({ id: item.id, title: item.title, file: item.file, hash: item.hash, status: item.status, artifact_type: item.artifact_type, created_by_change: item.created_by_change, depends_on: item.depends_on, decisions: item.decisions, supersedes: item.supersedes, writes_to: item.writes_to, implementation: item.implementation })),
      executions: [],
      verification: { unit: "not-configured" as const, integration: "not-configured" as const, system: "not-configured" as const }
    };
    const changed = artifacts.map((item) => item.id === "ENT-SHARED-001" ? { ...item, hash: "changed" } : item);
    const impact = calculateImpact(changed, buildGraph(changed), baseline);
    expect(impact.direct).toEqual(["ENT-SHARED-001"]);
    expect(impact.stale).toEqual(["API-A-001", "API-B-001"]);
  });

  it("retains removed write relationships while calculating impact", () => {
    const original = [
      artifact({ id: "ENT-A-001", artifact_type: "entity" }),
      artifact({ id: "API-A-001", artifact_type: "api_processing", writes_to: ["ENT-A-001"] }),
      artifact({ id: "API-B-001", artifact_type: "api_processing", writes_to: ["ENT-A-001"] })
    ];
    const baseline = {
      schema_version: 1 as const, id: "BL-001", evidence_revision: "EVR-001", created_at: "2026-01-01T00:00:00.000Z",
      git_commit: null, flow_type: "evolution" as const, flow_id: "FLOW-002",
      artifacts: original.map((item) => ({ id: item.id, title: item.title, file: item.file, hash: item.hash, status: item.status, artifact_type: item.artifact_type, created_by_change: item.created_by_change, depends_on: item.depends_on, decisions: item.decisions, supersedes: item.supersedes, writes_to: item.writes_to, implementation: item.implementation })),
      executions: [], verification: { unit: "not-configured" as const, integration: "not-configured" as const, system: "not-configured" as const }
    };
    const current = original.map((item) => item.id === "API-A-001" ? { ...item, writes_to: [] } : item);
    const impact = calculateImpact(current, buildGraph(current), baseline);
    expect(impact.direct).toContain("API-A-001");
    expect(impact.affected).toEqual(expect.arrayContaining(["ENT-A-001", "API-B-001"]));
  });
});
