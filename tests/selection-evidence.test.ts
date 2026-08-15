import { afterEach, describe, expect, it } from "vitest";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { artifact, cleanup, establishGenesis, tempProject } from "./helpers.js";
import { buildGraph } from "../src/core/graph.js";
import { selectionEvidenceEntries } from "../src/core/selection-evidence.js";
import { scanArtifacts } from "../src/core/artifacts.js";
import { validateProject } from "../src/core/validation.js";
import { executeVerification } from "../src/core/verification.js";
import { loadConfig } from "../src/core/config.js";
import { createBaseline } from "../src/core/baseline.js";
import { closeFlow, startFlow } from "../src/core/state.js";
import { addApprovalFeature } from "./fixtures/complete-saas/fixture.js";
import type { ActiveFlow, BaselineManifest, ExecutionRecord } from "../src/core/types.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

const flow: ActiveFlow = {
  schema_version: 1, id: "FLOW-002", type: "evolution", input: "intent", started_at: "2026-01-02T00:00:00.000Z",
  base_baseline: "BL-001", change_id: "CHG-002", stop_blocked_once: false,
  start_snapshot_hash: "a", implementation_snapshot_hash: "b"
};

function execution(overrides: Partial<ExecutionRecord>): ExecutionRecord {
  return {
    schema_version: 1, id: "EXEC-001", flow_id: "FLOW-002", level: "unit", command_id: "u", command: "run",
    cwd: ".", started_at: "2026-01-02T00:00:00.000Z", ended_at: "2026-01-02T00:00:01.000Z", exit_code: 0,
    output_hash: "h", output_file: "EXEC-001.log", git_commit: null, source_snapshot_hash: "s", ...overrides
  };
}

const scenario = () => {
  const artifacts = [
    artifact({ id: "ENT-SHARED-001", artifact_type: "entity", hash: "moved" }),
    artifact({ id: "UT-A-001", artifact_type: "unit_test_backend", depends_on: ["ENT-SHARED-001"], file: "ut-a.md" }),
    artifact({ id: "UT-B-001", artifact_type: "unit_test_backend", depends_on: ["ENT-SHARED-001"], file: "ut-b.md" })
  ];
  const baseline: BaselineManifest = {
    schema_version: 1, id: "BL-001", evidence_revision: "EVR-001", created_at: "2026-01-01T00:00:00.000Z",
    git_commit: null, flow_type: "evolution", flow_id: "FLOW-001",
    artifacts: artifacts.map((item) => ({
      id: item.id, title: item.title, file: item.file, hash: item.id === "ENT-SHARED-001" ? "original" : item.hash,
      status: item.status, artifact_type: item.artifact_type, created_by_change: item.created_by_change,
      depends_on: item.depends_on, decisions: item.decisions, supersedes: item.supersedes,
      writes_to: item.writes_to, implementation: item.implementation
    })),
    executions: [], verification: { unit: "not-configured", integration: "not-configured", system: "not-configured" }
  };
  return { artifacts, graph: buildGraph(artifacts), baseline };
};

describe("selection versus attributable execution", () => {
  it("says nothing until the flow has executed something", () => {
    const { artifacts, graph, baseline } = scenario();
    expect(selectionEvidenceEntries(artifacts, graph, baseline, flow, [])).toEqual([]);
  });

  it("reports every selected specification no ingested case joins", () => {
    const { artifacts, graph, baseline } = scenario();
    const entries = selectionEvidenceEntries(artifacts, graph, baseline, flow, [execution({})]);
    expect(entries.map((entry) => entry.spec)).toEqual(["UT-A-001", "UT-B-001"]);
    expect(entries[0]).toMatchObject({ flowId: "FLOW-002", file: "ut-a.md" });
  });

  it("clears the specification a report attributes a case to, and keeps its unattributed sibling", () => {
    const { artifacts, graph, baseline } = scenario();
    const record = execution({
      cases: [
        { name: "commits", status: "passed", time_ms: 3, spec_id: "UT-A-001", case_ids: ["TC-01"] },
        { name: "ambiguous", status: "passed", time_ms: 1, spec_id: null, case_ids: null }
      ]
    });
    expect(selectionEvidenceEntries(artifacts, graph, baseline, flow, [record]).map((entry) => entry.spec)).toEqual(["UT-B-001"]);
  });

  it("ignores executions belonging to another flow, and non-semantic flows entirely", () => {
    const { artifacts, graph, baseline } = scenario();
    const foreign = execution({ id: "EXEC-002", flow_id: "FLOW-009", cases: [{ name: "x", status: "passed", time_ms: 1, spec_id: "UT-A-001", case_ids: null }] });
    expect(selectionEvidenceEntries(artifacts, graph, baseline, flow, [foreign])).toEqual([]);
    expect(selectionEvidenceEntries(artifacts, graph, baseline, { ...flow, type: "genesis", change_id: null }, [execution({})])).toEqual([]);
  });
});

describe("selection evidence in a real flow", () => {
  it("reports selected specifications a real run attributes nothing to, and clears them at the baseline", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Add approval request behavior");
    await addApprovalFeature(root);
    await mkdir(path.join(root, "app"), { recursive: true });
    const configFile = path.join(root, "sdlc.config.yaml");
    const config = YAML.parse(await readFile(configFile, "utf8"));
    config.verification = {
      unit: [{ id: "u", cwd: ".", command: `node -e "process.exit(0)"` }],
      integration: [{ id: "i", cwd: ".", command: `node -e "process.exit(0)"` }],
      system: [{ id: "s", cwd: ".", command: `node -e "process.exit(0)"` }]
    };
    await writeFile(configFile, YAML.stringify(config), "utf8");

    const codes = async () => (await validateProject(root, await scanArtifacts(root))).findings.filter((finding) => finding.code === "SPEC_EXECUTION_UNATTRIBUTED");
    expect(await codes()).toEqual([]);

    await executeVerification(root, await loadConfig(root), ["unit", "integration", "system"]);
    const reported = await codes();
    // Commands that declare no report attribute nothing, which is exactly what
    // the warning has to say rather than claiming the specs never ran.
    expect(reported.length).toBeGreaterThan(0);
    expect(reported[0]!.severity).toBe("warning");
    expect(reported[0]!.message).toContain("no ingested report of this flow attributes a case to it");
    expect((await validateProject(root, await scanArtifacts(root))).valid).toBe(true);

    await createBaseline(root);
    await closeFlow(root);
    expect(await codes()).toEqual([]);
  });
});
