import { afterEach, describe, expect, it } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import YAML from "yaml";
import { artifact, cleanup, establishGenesis, pluginRoot, tempProject } from "./helpers.js";
import { buildProjections } from "../src/core/projections.js";
import { buildGraph } from "../src/core/graph.js";
import { calculateImpact } from "../src/core/impact.js";
import { refreshProject } from "../src/core/project.js";
import { pathExists, startFlow } from "../src/core/state.js";
import { sha256 } from "../src/core/utils.js";
import { addApprovalFeature, materializePatternArtifact } from "./fixtures/complete-saas/fixture.js";
import type { ExecutionRecord, ProjectConfig } from "../src/core/types.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

const PLATFORM_DEPENDS = ["PRODUCT-REQUIREMENTS", "QUALITY-REQUIREMENTS", "ARCHITECTURE-OVERVIEW", "FTR-APPROVAL-001"];

function unitRecord(id: string, extra: Partial<ExecutionRecord>): ExecutionRecord {
  return {
    schema_version: 1, id, flow_id: "FLOW-001", level: "unit", command_id: "u1",
    command: "node -v", cwd: ".", started_at: "2026-01-01T00:00:00.000Z",
    ended_at: "2026-01-01T00:00:01.000Z", exit_code: 0, output_hash: sha256("x"),
    output_file: `.ai-saas-sdlc/executions/${id}.log`, git_commit: null, source_snapshot_hash: "1".repeat(64),
    ...extra
  };
}

function projectionsFor(artifacts: ReturnType<typeof artifact>[], config: ProjectConfig | null, records: ExecutionRecord[]) {
  const graph = buildGraph(artifacts);
  return buildProjections(artifacts, graph, calculateImpact(artifacts, graph, null), null, null, config, records);
}

const host = { os: "win32", release: "10.0.19045", arch: "x64", node: "24.11.1" };

describe("platform coverage projection", () => {
  it("is not part of the expected set when no platform target exists", () => {
    const projections = projectionsFor([artifact({ id: "FTR-A-001", artifact_type: "feature" })], null, []);
    expect("platform-coverage.md" in projections).toBe(false);
  });

  it("derives every evidence state through the warning predicates", () => {
    const targets = [
      artifact({ id: "PLT-DECL-001", artifact_type: "platform_target" }),
      artifact({ id: "PLT-HOSTLESS-001", artifact_type: "platform_target" }),
      artifact({ id: "PLT-MISSING-001", artifact_type: "platform_target" }),
      artifact({ id: "PLT-NOTLIVE-001", artifact_type: "platform_target", status: "superseded" }),
      artifact({ id: "PLT-OBS-001", artifact_type: "platform_target" }),
      artifact({ id: "PLT-TOKMATCH-001", artifact_type: "platform_target", host_os: "win32" }),
      artifact({ id: "PLT-TOKMISS-001", artifact_type: "platform_target", host_os: "darwin" })
    ];
    const config: ProjectConfig = {
      schema_version: 1, project_id: "p", research_mode: "public-web-only", implementation_sources: [],
      verification: {
        unit: [
          { id: "u1", cwd: ".", command: "node -v", platforms: ["PLT-DECL-001"] },
          { id: "u2", cwd: ".", command: "node -v", platforms: ["PLT-HOSTLESS-001"] },
          { id: "u3", cwd: ".", command: "node -v", platforms: ["PLT-OBS-001"] },
          { id: "u4", cwd: ".", command: "node -v", platforms: ["PLT-TOKMATCH-001"] },
          { id: "u5", cwd: ".", command: "node -v", platforms: ["PLT-TOKMISS-001"] },
          { id: "u6", cwd: ".", command: "node -v", platforms: ["PLT-GHOST-001"] },
          { id: "u7", cwd: ".", command: "node -v", platforms: ["PLT-NOTLIVE-001"] }
        ],
        integration: [], system: []
      }
    };
    const records = [
      unitRecord("EXEC-001", { command_id: "u2", platforms: ["PLT-HOSTLESS-001"] }),
      unitRecord("EXEC-002", { command_id: "u3", platforms: ["PLT-OBS-001"], host }),
      unitRecord("EXEC-003", { command_id: "u4", platforms: ["PLT-TOKMATCH-001"], host }),
      unitRecord("EXEC-004", { command_id: "u5", platforms: ["PLT-TOKMISS-001"], host })
    ];
    const coverage = projectionsFor(targets, config, records)["platform-coverage.md"]!;
    expect(coverage).toContain("| `PLT-DECL-001` | active | — | `unit:u1` | — | declared, not executed |");
    expect(coverage).toContain("| `PLT-HOSTLESS-001` | active | — | `unit:u2` | — | executed, host unrecorded |");
    expect(coverage).toContain("| `PLT-MISSING-001` | active | — | none | — | missing |");
    expect(coverage).toContain("| `PLT-NOTLIVE-001` | superseded | — | `unit:u7` | — | not live |");
    expect(coverage).toContain("| `PLT-OBS-001` | active | — | `unit:u3` | win32 | observed |");
    expect(coverage).toContain("| `PLT-TOKMATCH-001` | active | win32 | `unit:u4` | win32 | observed on declared host |");
    expect(coverage).toContain("| `PLT-TOKMISS-001` | active | darwin | `unit:u5` | win32 | contradicted |");
    expect(coverage).toContain("## Unknown declarations\n\n- `PLT-GHOST-001`\n- `PLT-NOTLIVE-001`\n");
    expect(projectionsFor(targets, config, records)["platform-coverage.md"]).toBe(coverage);
  });

  it("matches the latest execution through the baseline verdict predicate", () => {
    const targets = [artifact({ id: "PLT-WIN-001", artifact_type: "platform_target" })];
    const config: ProjectConfig = {
      schema_version: 1, project_id: "p", research_mode: "public-web-only", implementation_sources: [],
      verification: { unit: [{ id: "u1", cwd: ".", command: "node -v", platforms: ["PLT-WIN-001"] }], integration: [], system: [] }
    };
    const matching = unitRecord("EXEC-001", { platforms: ["PLT-WIN-001"], host });
    const staleCommand = unitRecord("EXEC-002", { command: "node -v --changed", platforms: ["PLT-WIN-001"], host });
    const coverage = projectionsFor(targets, config, [matching, staleCommand])["platform-coverage.md"]!;
    expect(coverage).toContain("| unit | `u1` | `PLT-WIN-001` | `EXEC-001` | 0 | win32 | 2026-01-01T00:00:01.000Z |");
    const undeclaredConfig: ProjectConfig = { ...config, verification: { unit: [{ id: "u1", cwd: ".", command: "node -v" }], integration: [], system: [] } };
    expect(projectionsFor(targets, undeclaredConfig, [matching])["platform-coverage.md"]).toContain("## Unknown declarations\n\nNone.\n");
  });

  it("appears on disk only when a target exists, in any status, and round-trips without drift", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    expect(await refreshProject(root, true)).toEqual([]);
    expect(await pathExists(path.join(root, "generated", "platform-coverage.md"))).toBe(false);
    await startFlow(root, "evolution", "Add a platform");
    await addApprovalFeature(root);
    await materializePatternArtifact(root, { type: "platform_target", id: "PLT-DESKTOP-001", title: "Windows desktop client", dependsOn: PLATFORM_DEPENDS });
    const file = path.join(root, "03-design", "platforms", "PLT-DESKTOP-001.md");
    await writeFile(file, (await readFile(file, "utf8")).replace("status: active", "status: superseded"), "utf8");
    await refreshProject(root, false);
    const coverage = await readFile(path.join(root, "generated", "platform-coverage.md"), "utf8");
    expect(coverage).toContain("| `PLT-DESKTOP-001` | superseded | — | none | — | not live |");
    expect(await refreshProject(root, true)).toEqual([]);
  });

  it("verify resynchronizes record-dependent projections through the CLI", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Verify then check drift");
    await addApprovalFeature(root);
    await materializePatternArtifact(root, { type: "platform_target", id: "PLT-DESKTOP-001", title: "Windows desktop client", dependsOn: PLATFORM_DEPENDS });
    const configFile = path.join(root, "sdlc.config.yaml");
    const config = YAML.parse(await readFile(configFile, "utf8")) as Record<string, any>;
    config.verification.unit = [{ id: "unit-fixture", cwd: ".", command: `node -e "process.exit(0)"`, platforms: ["PLT-DESKTOP-001"] }];
    await writeFile(configFile, YAML.stringify(config), "utf8");
    const cli = (args: string[]) => spawnSync(process.execPath, [path.join(pluginRoot, "bin", "ai-saas-sdlc"), ...args], { cwd: root, encoding: "utf8", env: { ...process.env, CLAUDE_PLUGIN_ROOT: pluginRoot } });
    expect(cli(["verify", "--all", "--execute", "--json"]).status).toBe(0);
    expect(cli(["refresh", "--check", "--json"]).status).toBe(0);
    const coverage = await readFile(path.join(root, "generated", "platform-coverage.md"), "utf8");
    expect(coverage).toContain("| `PLT-DESKTOP-001` | active | — | `unit:unit-fixture` |");
    expect(coverage).toContain("| observed |");
  });
});
