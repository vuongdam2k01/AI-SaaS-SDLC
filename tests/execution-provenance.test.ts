import { afterEach, describe, expect, it } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { createBaseline } from "../src/core/baseline.js";
import { loadConfig } from "../src/core/config.js";
import { scanArtifacts } from "../src/core/artifacts.js";
import { validateProject } from "../src/core/validation.js";
import { executeVerification } from "../src/core/verification.js";
import { loadCurrentState, saveCurrentState, startFlow } from "../src/core/state.js";
import { cleanup, establishGenesis, tempProject } from "./helpers.js";
import { latestExecution } from "../src/core/execution-selection.js";
import type { ExecutionRecord } from "../src/core/types.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

async function setUnitCommands(root: string, commands: Array<{ id: string; cwd: string; command: string }>): Promise<void> {
  const file = path.join(root, "sdlc.config.yaml");
  const config = YAML.parse(await readFile(file, "utf8"));
  config.verification.unit = commands;
  await writeFile(file, YAML.stringify(config), "utf8");
}

async function beginVerification(root: string): Promise<void> {
  await establishGenesis(root);
  await startFlow(root, "evolution", "Change verification contract");
  await setUnitCommands(root, [{ id: "unit-fixture", cwd: ".", command: `node -e "console.log('first')"` }]);
}

describe("execution provenance", () => {
  it("rejects source and command IDs that cannot be represented safely", async () => {
    const root = await tempProject();
    roots.push(root);
    const configFile = path.join(root, "sdlc.config.yaml");
    const config = YAML.parse(await readFile(configFile, "utf8"));
    config.verification.unit = [{ id: "unit: smoke", cwd: ".", command: "node --version" }];
    await writeFile(configFile, YAML.stringify(config), "utf8");
    await expect(loadConfig(root)).rejects.toThrow("kebab-case project/source/command IDs");
  });

  it("selects the numeric latest attempt across the 999 boundary", () => {
    const base = { schema_version: 1, flow_id: "FLOW-001", level: "unit", command_id: "unit", command: "test", cwd: ".", started_at: "2026-01-01T00:00:00.000Z", ended_at: "2026-01-01T00:00:01.000Z", output_hash: "0".repeat(64), output_file: ".ai-saas-sdlc/executions/EXEC-999.log", git_commit: null, source_snapshot_hash: "1".repeat(64) } as const;
    const older = { ...base, id: "EXEC-999", exit_code: 0 } as ExecutionRecord;
    const newer = { ...base, id: "EXEC-1000", exit_code: 1, output_file: ".ai-saas-sdlc/executions/EXEC-1000.log" } as ExecutionRecord;
    expect(latestExecution([newer, older])?.id).toBe("EXEC-1000");
  });

  it("binds a pass to the exact configured command", async () => {
    const root = await tempProject();
    roots.push(root);
    await beginVerification(root);
    await executeVerification(root, await loadConfig(root), ["unit"]);
    await setUnitCommands(root, [{ id: "unit-fixture", cwd: ".", command: `node -e "console.log('changed')"` }]);
    await expect(createBaseline(root)).rejects.toThrow("configured verification commands were not run");
    await executeVerification(root, await loadConfig(root), ["unit"]);
    expect((await createBaseline(root)).verification.unit).toBe("passed");
  });

  it("detects modified logs and result bodies", async () => {
    const root = await tempProject();
    roots.push(root);
    await beginVerification(root);
    const [record] = await executeVerification(root, await loadConfig(root), ["unit"]);
    const log = path.join(root, record!.output_file);
    const result = path.join(root, `04-verification/results/RESULT-${record!.id}.md`);
    const originalLog = await readFile(log, "utf8");
    await writeFile(log, `${originalLog}tampered`, "utf8");
    let report = await validateProject(root, await scanArtifacts(root));
    expect(report.findings.some((finding) => finding.code === "EXECUTION_PROVENANCE_INVALID")).toBe(true);
    await writeFile(log, originalLog, "utf8");
    await writeFile(result, `${await readFile(result, "utf8")}tampered`, "utf8");
    report = await validateProject(root, await scanArtifacts(root));
    expect(report.findings.some((finding) => finding.code === "RESULT_BINDING_INVALID")).toBe(true);
  });

  it("prevalidates all commands and never reuses a reserved execution ID", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Verify execution reservation");
    await setUnitCommands(root, [
      { id: "valid-first", cwd: ".", command: `node -e "process.exit(0)"` },
      { id: "invalid-second", cwd: "missing-directory", command: `node -e "process.exit(0)"` }
    ]);
    await expect(executeVerification(root, await loadConfig(root), ["unit"])).rejects.toThrow("cwd is missing or outside");
    expect((await loadCurrentState(root)).next_execution).toBe(1);

    await setUnitCommands(root, [{ id: "valid-first", cwd: ".", command: `node -e "process.exit(0)"` }]);
    await executeVerification(root, await loadConfig(root), ["unit"]);
    const state = await loadCurrentState(root);
    state.next_execution = 1;
    await saveCurrentState(root, state);
    await expect(executeVerification(root, await loadConfig(root), ["unit"])).rejects.toThrow("already reserved");
  });

  it("rejects a forged execution JSON without its bound log and result", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    const flow = await startFlow(root, "evolution", "Attempt forged verification");
    const record = {
      schema_version: 1, id: "EXEC-001", flow_id: flow.id, level: "unit", command_id: "forged",
      command: "node forged.js", cwd: ".", started_at: "2026-01-01T00:00:00.000Z",
      ended_at: "2026-01-01T00:00:01.000Z", exit_code: 0, output_hash: "0".repeat(64),
      output_file: ".ai-saas-sdlc/executions/EXEC-001.log", git_commit: null, source_snapshot_hash: "1".repeat(64)
    };
    await writeFile(path.join(root, ".ai-saas-sdlc/executions/EXEC-001.json"), `${JSON.stringify(record, null, 2)}\n`, "utf8");
    const report = await validateProject(root, await scanArtifacts(root));
    expect(report.findings.some((finding) => finding.code === "EXECUTION_PROVENANCE_INVALID")).toBe(true);
    expect(report.findings.some((finding) => finding.code === "EXECUTION_WITHOUT_RESULT")).toBe(true);
  });
});
