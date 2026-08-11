import { afterEach, describe, expect, it } from "vitest";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import YAML from "yaml";
import { cleanup, establishGenesis, tempProject } from "./helpers.js";
import { loadConfig } from "../src/core/config.js";
import { scanArtifacts } from "../src/core/artifacts.js";
import { validateProject } from "../src/core/validation.js";
import { executeVerification } from "../src/core/verification.js";
import { createBaseline } from "../src/core/baseline.js";
import { startFlow } from "../src/core/state.js";
import { renderResultArtifact } from "../src/core/result-artifact.js";
import { isExecutionRecord } from "../src/core/record-validation.js";
import { sha256 } from "../src/core/utils.js";
import { addApprovalFeature, materializePatternArtifact } from "./fixtures/complete-saas/fixture.js";
import type { ExecutionRecord } from "../src/core/types.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

const PLATFORM_DEPENDS = ["PRODUCT-REQUIREMENTS", "QUALITY-REQUIREMENTS", "ARCHITECTURE-OVERVIEW", "FTR-APPROVAL-001"];

async function patchConfig(root: string, mutate: (config: Record<string, any>) => void): Promise<void> {
  const file = path.join(root, "sdlc.config.yaml");
  const config = YAML.parse(await readFile(file, "utf8"));
  mutate(config);
  await writeFile(file, YAML.stringify(config), "utf8");
}

async function addLivePlatform(root: string, id = "PLT-DESKTOP-001"): Promise<void> {
  await addApprovalFeature(root);
  await materializePatternArtifact(root, { type: "platform_target", id, title: "Windows desktop client", dependsOn: PLATFORM_DEPENDS });
}

/** The 14-field record shape every engine before 1.5.0 wrote. */
function legacyRecord(flowId: string, output: string): ExecutionRecord {
  return {
    schema_version: 1, id: "EXEC-001", flow_id: flowId, level: "unit", command_id: "unit-fixture",
    command: `node -e "console.log('first')"`, cwd: ".", started_at: "2026-01-01T00:00:00.000Z",
    ended_at: "2026-01-01T00:00:01.000Z", exit_code: 0, output_hash: sha256(output),
    output_file: ".ai-saas-sdlc/executions/EXEC-001.log", git_commit: null, source_snapshot_hash: "1".repeat(64)
  };
}

describe("platform evidence declarations", () => {
  it("accepts declared platforms and rejects malformed declarations", async () => {
    const root = await tempProject();
    roots.push(root);
    await patchConfig(root, (config) => { config.verification.unit = [{ id: "u", cwd: ".", command: "node --version", platforms: ["PLT-WIN-001", "PLT-MACOS-001"] }]; });
    expect((await loadConfig(root)).verification.unit[0]!.platforms).toEqual(["PLT-WIN-001", "PLT-MACOS-001"]);
    for (const bad of [[], ["plt-win-001"], ["PLT-WIN-001", "PLT-WIN-001"], "PLT-WIN-001"]) {
      await patchConfig(root, (config) => { config.verification.unit = [{ id: "u", cwd: ".", command: "node --version", platforms: bad }]; });
      await expect(loadConfig(root)).rejects.toThrow("kebab-case project/source/command IDs");
    }
  });

  it("stamps the observed host on every new execution and copies the declaration", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Verify with declarations");
    await patchConfig(root, (config) => {
      config.verification.unit = [
        { id: "plain", cwd: ".", command: `node -e "process.exit(0)"` },
        { id: "declared", cwd: ".", command: `node -e "process.exit(0)"`, platforms: ["PLT-DESKTOP-001"] }
      ];
    });
    const records = await executeVerification(root, await loadConfig(root), ["unit"]);
    const plain = records.find((record) => record.command_id === "plain")!;
    const declared = records.find((record) => record.command_id === "declared")!;
    for (const record of [plain, declared]) {
      expect(record.host).toEqual({ os: process.platform, release: os.release(), arch: os.arch(), node: process.versions.node });
      expect(isExecutionRecord(record)).toBe(true);
    }
    expect("platforms" in plain).toBe(false);
    expect(declared.platforms).toEqual(["PLT-DESKTOP-001"]);
    const result = await readFile(path.join(root, "04-verification", "results", `RESULT-${declared.id}.md`), "utf8");
    expect(result).toContain("| Declared platform evidence | PLT-DESKTOP-001 |");
    expect(result).toContain(`| Environment fingerprint | ${process.platform} ${os.release()} ${os.arch()}; node ${process.versions.node} |`);
    const report = await validateProject(root, await scanArtifacts(root));
    expect(report.findings.filter((finding) => ["EXECUTION_PROVENANCE_INVALID", "RESULT_BINDING_INVALID", "EXECUTION_INVALID"].includes(finding.code))).toEqual([]);
  });

  it("renders a legacy record byte-identically to the shape 1.4.x wrote", () => {
    const record = legacyRecord("FLOW-001", "first\n");
    const rendered = renderResultArtifact(record, "CHG-001");
    expect(rendered).toContain("| Environment fingerprint | not reported by configured command |");
    expect(rendered).not.toContain("Declared platform evidence");
    // The provenance table, exactly as every pre-1.5.0 result carries it. A
    // change to any of these bytes flips RESULT_BINDING_INVALID on immutable
    // results in every existing repository.
    expect(rendered).toContain([
      "| Field | Engine-recorded value |",
      "|---|---|",
      "| Source revision | not available from source control |",
      `| Source snapshot SHA-256 | ${"1".repeat(64)} |`,
      "| Flow ID | FLOW-001 |",
      "| Change ID | CHG-001 |",
      `| Command | node -e "console.log('first')" |`,
      "| Working directory | . |",
      "| Toolchain | not reported by configured command |",
      "| Environment fingerprint | not reported by configured command |",
      ""
    ].join("\n"));
  });

  it("keeps a pre-1.5.0 execution, log and result valid under the new engine", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    const flow = await startFlow(root, "evolution", "Legacy execution survives upgrade");
    const output = "first\n";
    const record = legacyRecord(flow.id, output);
    await mkdir(path.join(root, ".ai-saas-sdlc", "executions"), { recursive: true });
    await writeFile(path.join(root, ".ai-saas-sdlc", "executions", "EXEC-001.log"), output, "utf8");
    await writeFile(path.join(root, ".ai-saas-sdlc", "executions", "EXEC-001.json"), `${JSON.stringify(record, null, 2)}\n`, "utf8");
    await writeFile(path.join(root, "04-verification", "results", "RESULT-EXEC-001.md"), renderResultArtifact(record, "CHG-001"), "utf8");
    const report = await validateProject(root, await scanArtifacts(root));
    expect(report.findings.filter((finding) => ["EXECUTION_INVALID", "EXECUTION_PROVENANCE_INVALID", "RESULT_BINDING_INVALID"].includes(finding.code))).toEqual([]);
  });

  it("re-runs instead of reusing when the declaration changes mid-flow", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Declaration change");
    await mkdir(path.join(root, "impl"), { recursive: true });
    await writeFile(path.join(root, "impl", "probe.txt"), "stable\n", "utf8");
    await patchConfig(root, (config) => {
      config.implementation_sources = [{ id: "impl", path: "./impl" }];
      config.verification.unit = [{ id: "unit-fixture", cwd: "./impl", command: `node -e "process.exit(0)"` }];
    });
    const first = await executeVerification(root, await loadConfig(root), ["unit"]);
    const again = await executeVerification(root, await loadConfig(root), ["unit"]);
    expect(again[0]!.id).toBe(first[0]!.id);
    await patchConfig(root, (config) => { config.verification.unit[0].platforms = ["PLT-WIN-001"]; });
    const declared = await executeVerification(root, await loadConfig(root), ["unit"]);
    expect(declared[0]!.id).not.toBe(first[0]!.id);
    expect(declared[0]!.platforms).toEqual(["PLT-WIN-001"]);
  });

  it("refuses to baseline pre-declaration evidence", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Declare after running");
    await addLivePlatform(root);
    await patchConfig(root, (config) => { config.verification.unit = [{ id: "unit-fixture", cwd: ".", command: `node -e "process.exit(0)"` }]; });
    await executeVerification(root, await loadConfig(root), ["unit"]);
    await patchConfig(root, (config) => { config.verification.unit[0].platforms = ["PLT-DESKTOP-001"]; });
    await expect(createBaseline(root)).rejects.toThrow("configured verification commands were not run");
    await executeVerification(root, await loadConfig(root), ["unit"]);
    expect((await createBaseline(root)).verification.unit).toBe("passed");
  });

  it("warns for a live platform target no command declares, without blocking", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Ship the desktop client");
    await addLivePlatform(root);
    const report = await validateProject(root, await scanArtifacts(root));
    const warning = report.findings.find((finding) => finding.code === "PLATFORM_EVIDENCE_MISSING");
    expect(warning?.severity).toBe("warning");
    expect(warning?.file).toBe("03-design/platforms/PLT-DESKTOP-001.md");
    expect(warning?.message).toContain("platforms: [PLT-DESKTOP-001]");
    expect(report.valid).toBe(true);
    expect((await createBaseline(root)).artifacts.some((entry) => entry.id === "PLT-DESKTOP-001")).toBe(true);
  });

  it("clears the warning on mapping alone and flags unknown declarations", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Map the desktop client");
    await addLivePlatform(root);
    await patchConfig(root, (config) => {
      config.verification.system = [{ id: "st-win", cwd: ".", command: "node --version", platforms: ["PLT-DESKTOP-001", "PLT-GHOST-001", "FTR-APPROVAL-001"] }];
    });
    const report = await validateProject(root, await scanArtifacts(root));
    expect(report.findings.some((finding) => finding.code === "PLATFORM_EVIDENCE_MISSING")).toBe(false);
    const unknown = report.findings.filter((finding) => finding.code === "PLATFORM_DECLARATION_UNKNOWN");
    expect(unknown.map((finding) => finding.message)).toEqual([
      "Verification commands declare evidence for FTR-APPROVAL-001, which matches no live platform_target artifact.",
      "Verification commands declare evidence for PLT-GHOST-001, which matches no live platform_target artifact."
    ]);
    expect(unknown.every((finding) => finding.severity === "warning" && finding.file === "sdlc.config.yaml")).toBe(true);
  });

  it("warns even when no verification command is configured at all", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Documentation-only platforms");
    await addLivePlatform(root);
    const config = await loadConfig(root);
    expect(config.verification.unit).toEqual([]);
    const report = await validateProject(root, await scanArtifacts(root));
    expect(report.findings.some((finding) => finding.code === "PLATFORM_EVIDENCE_MISSING")).toBe(true);
  });

  it("stays silent for platform targets that are not live", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Draft platform only");
    await addApprovalFeature(root);
    const draft = await materializePatternArtifact(root, { type: "platform_target", id: "PLT-DRAFT-001", title: "Draft platform", dependsOn: PLATFORM_DEPENDS });
    const file = path.join(root, draft.file);
    await writeFile(file, (await readFile(file, "utf8")).replace("status: active", "status: superseded"), "utf8");
    const report = await validateProject(root, await scanArtifacts(root));
    expect(report.findings.some((finding) => finding.code === "PLATFORM_EVIDENCE_MISSING")).toBe(false);
  });

  it("rejects execution records carrying keys this engine does not know", () => {
    const record = { ...legacyRecord("FLOW-001", "first\n"), unknown_field: true } as unknown;
    expect(isExecutionRecord(record)).toBe(false);
    const forgedEmpty = { ...legacyRecord("FLOW-001", "first\n"), platforms: [] } as unknown;
    expect(isExecutionRecord(forgedEmpty)).toBe(false);
    const forgedHost = { ...legacyRecord("FLOW-001", "first\n"), host: { os: "win32" } } as unknown;
    expect(isExecutionRecord(forgedHost)).toBe(false);
  });
});
