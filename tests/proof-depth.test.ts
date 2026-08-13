import { afterEach, describe, expect, it } from "vitest";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { artifact, cleanup, establishGenesis, tempProject } from "./helpers.js";
import { loadConfig } from "../src/core/config.js";
import { scanArtifacts } from "../src/core/artifacts.js";
import { validateProject } from "../src/core/validation.js";
import { executeVerification } from "../src/core/verification.js";
import { createBaseline } from "../src/core/baseline.js";
import { closeFlow, startFlow } from "../src/core/state.js";
import { renderResultArtifact } from "../src/core/result-artifact.js";
import { parseJunit, parseTap, joinCasesToSpecs } from "../src/core/test-report.js";
import { loadBaseline } from "../src/core/project.js";
import { addApprovalFeature } from "./fixtures/complete-saas/fixture.js";
import type { ExecutionRecord } from "../src/core/types.js";
import { sha256 } from "../src/core/utils.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

async function patchConfig(root: string, mutate: (config: Record<string, any>) => void): Promise<void> {
  const file = path.join(root, "sdlc.config.yaml");
  const config = YAML.parse(await readFile(file, "utf8"));
  mutate(config);
  await writeFile(file, YAML.stringify(config), "utf8");
}

async function mapArtifact(root: string, artifactRelativeFile: string, mappings: string[]): Promise<void> {
  for (const mapping of mappings) {
    const target = path.join(root, "app", mapping.slice(mapping.indexOf(":") + 1));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, "// implementation fixture\n", "utf8");
  }
  const file = path.join(root, artifactRelativeFile);
  const source = (await readFile(file, "utf8")).replace(/\r\n/g, "\n");
  const value = `implementation: [${mappings.map((mapping) => `"${mapping}"`).join(", ")}]`;
  const patched = /^implementation:.*$/m.test(source)
    ? source.replace(/^implementation:.*$/m, value)
    : source.replace(/\n---\n/, `\n${value}\n---\n`);
  await writeFile(file, patched, "utf8");
}

const JUNIT = `<?xml version="1.0"?>
<testsuites>
  <testsuite name="approval" tests="3">
    <testcase classname="approval" name="commits a decision" time="0.012"/>
    <testcase classname="approval" name="rejects a double decision" time="0.002">
      <failure message="expected terminal state">boom</failure>
    </testcase>
    <testcase classname="approval" name="skips unassigned clients"><skipped/></testcase>
  </testsuite>
</testsuites>`;

describe("test report parsing and joining", () => {
  it("parses the junit subset with statuses, names and times", () => {
    const parsed = parseJunit(JUNIT);
    expect(parsed).toMatchObject({ total: 3, passed: 1, failed: 1, skipped: 1 });
    expect(parsed.cases[0]).toEqual({ name: "approval > commits a decision", status: "passed", time_ms: 12 });
    expect(parsed.cases[1]!.status).toBe("failed");
    expect(parsed.cases[2]!.status).toBe("skipped");
  });

  it("parses TAP and rejects content that is neither format", () => {
    const parsed = parseTap("1..2\nok 1 - commits a decision\nnot ok 2 - rejects a double decision\n");
    expect(parsed).toMatchObject({ total: 2, passed: 1, failed: 1, skipped: 0 });
    expect(() => parseJunit("just some log output")).toThrow("Not a JUnit report");
    expect(() => parseTap("just some log output")).toThrow("Not a TAP report");
  });

  it("joins cases to specification rows by symbol and resolves ambiguity to null", () => {
    const spec = artifact({
      id: "UT-API-APPROVAL-001",
      artifact_type: "unit_test_backend",
      body: [
        "## Implementation mapping",
        "",
        "| Case IDs | Test path | Test name or symbol | Production symbol |",
        "|---|---|---|---|",
        "| TC-01 | tests/approval.test.ts | commits a decision | commitDecision |",
        "| TC-02, TC-03 | tests/approval.test.ts | rejects a double decision | commitDecision |",
        "| TC-04 | tests/approval.test.ts | decision | commitDecision |"
      ].join("\n")
    });
    const joined = joinCasesToSpecs(parseJunit(JUNIT).cases, [spec]);
    // Exact-symbol containment matches the first two; the third fixture case
    // matches no row, and the bare "decision" row is never joined because two
    // rows would contain it — ambiguity resolves to null, not to a guess.
    expect(joined[0]).toMatchObject({ spec_id: "UT-API-APPROVAL-001", case_ids: ["TC-01"] });
    expect(joined[1]).toMatchObject({ spec_id: "UT-API-APPROVAL-001", case_ids: ["TC-02", "TC-03"] });
    expect(joined[2]).toMatchObject({ spec_id: null, case_ids: null });
  });
});

describe("execution hardening and report ingestion", () => {
  it("records timeout, spawn error and report ingestion honestly, with old records rendering unchanged", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Harden verification");
    await mkdir(path.join(root, "app"), { recursive: true });
    await writeFile(path.join(root, ".ai-saas-sdlc", "verification-tools.json"), JSON.stringify({ command_timeout_ms: 500 }), "utf8");
    await writeFile(path.join(root, "app", "fixture-report.xml"), JUNIT, "utf8");
    await patchConfig(root, (config) => {
      config.implementation_sources = [{ id: "app", path: "./app" }];
      config.verification.unit = [
        { id: "hangs", cwd: ".", command: `node -e "setTimeout(() => {}, 60000)"` },
        { id: "missing", cwd: ".", command: `definitely-not-a-real-binary-xyz --version` },
        { id: "reported", cwd: ".", command: `node -e "require('node:fs').copyFileSync('app/fixture-report.xml', 'app/report.xml')"`, report: { path: "app/report.xml", format: "junit" } }
      ];
    });
    const records = await executeVerification(root, await loadConfig(root), ["unit"]);
    const hung = records.find((record) => record.command_id === "hangs")!;
    expect(hung.timed_out).toBe(true);
    expect(hung.exit_code).not.toBe(0);
    const missing = records.find((record) => record.command_id === "missing")!;
    expect(missing.exit_code).not.toBe(0);
    // On win32 shell:true a missing binary fails inside the shell rather than
    // at spawn, so spawn_error is platform-dependent; what matters is that the
    // rendered artifact never claims a test-level failure for it.
    const reported = records.find((record) => record.command_id === "reported")!;
    expect(reported.exit_code).toBe(0);
    expect(reported.report).toMatchObject({ format: "junit", total: 3, passed: 1, failed: 1, skipped: 1 });
    expect(reported.cases).toHaveLength(3);
    const rendered = renderResultArtifact(reported, "CHG-001");
    expect(rendered).toContain("| Total test cases | 3 |");
    expect(rendered).toContain("| approval &gt; commits a decision |");
    const hungRendered = renderResultArtifact(hung, "CHG-001");
    expect(hungRendered).toContain("| Execution flags |");
    expect(hungRendered).toContain("timed out at the machine-local budget");
    // A legacy-shaped record stays byte-compatible: no flags row, aggregate
    // honestly unreported.
    const legacy: ExecutionRecord = {
      schema_version: 1, id: "EXEC-099", flow_id: "FLOW-001", level: "unit", command_id: "legacy",
      command: "node --version", cwd: ".", started_at: "2026-01-01T00:00:00.000Z", ended_at: "2026-01-01T00:00:01.000Z",
      exit_code: 0, output_hash: sha256("x"), output_file: ".ai-saas-sdlc/executions/EXEC-099.log",
      git_commit: null, source_snapshot_hash: "1".repeat(64)
    };
    const legacyRendered = renderResultArtifact(legacy, "CHG-001");
    expect(legacyRendered).not.toContain("Execution flags");
    expect(legacyRendered).toContain("| Total test cases | not reported by configured command |");
  });

  it("honours per-command timeout overrides, truncates by real bytes, and caps only marked passed sets", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Budget overrides");
    await mkdir(path.join(root, "app"), { recursive: true });
    // Machine policy stays generous; the command's own budget is what fires.
    await writeFile(path.join(root, ".ai-saas-sdlc", "verification-tools.json"), JSON.stringify({ command_timeout_ms: 60000, output_max_bytes: 200 }), "utf8");
    await patchConfig(root, (config) => {
      config.implementation_sources = [{ id: "app", path: "./app" }];
      config.verification.unit = [
        { id: "slow", cwd: ".", command: `node -e "setTimeout(() => {}, 60000)"`, timeout_ms: 300 },
        { id: "multibyte", cwd: ".", command: `node -e "process.stdout.write('é'.repeat(500))"` }
      ];
    });
    const records = await executeVerification(root, await loadConfig(root), ["unit"]);
    const slow = records.find((record) => record.command_id === "slow")!;
    expect(slow.timed_out).toBe(true);
    const multibyte = records.find((record) => record.command_id === "multibyte")!;
    expect(multibyte.output_truncated).toBe(true);
    const log = await readFile(path.join(root, ".ai-saas-sdlc", "executions", `${multibyte.id}.log`), "utf8");
    // Byte-accurate truncation never flushes a split sequence as U+FFFD.
    expect(log).not.toContain("�");
    // The renderer caps on the record field alone; failures are never hidden.
    const manyCases = Array.from({ length: 60 }, (_, index) => ({ name: `case ${index}`, status: "passed" as "passed" | "failed" | "skipped", time_ms: null, spec_id: null, case_ids: null }));
    manyCases.push({ name: "the failure", status: "failed", time_ms: null, spec_id: null, case_ids: null });
    const base = {
      schema_version: 1 as const, flow_id: "FLOW-001", level: "unit" as const, command_id: "big",
      command: "node --test", cwd: ".", started_at: "2026-01-01T00:00:00.000Z", ended_at: "2026-01-01T00:00:01.000Z",
      exit_code: 1, output_hash: sha256("y"), output_file: ".ai-saas-sdlc/executions/EXEC-098.log",
      git_commit: null, source_snapshot_hash: "2".repeat(64), cases: manyCases
    };
    const capped = renderResultArtifact({ ...base, id: "EXEC-098", case_row_cap: 50 } as ExecutionRecord, "CHG-001");
    expect(capped).toContain("10 more passed cases");
    expect(capped).toContain("| the failure |");
    const uncapped = renderResultArtifact({ ...base, id: "EXEC-097" } as ExecutionRecord, "CHG-001");
    expect(uncapped).not.toContain("more passed cases");
    expect(uncapped).toContain("| case 59 |");
    // A zero or negative override is a config error, not a disabled budget.
    await patchConfig(root, (config) => {
      config.verification.unit = [{ id: "bad", cwd: ".", command: "node --version", timeout_ms: 0 }];
    });
    await expect(loadConfig(root)).rejects.toThrow("timeout_ms");
  });

  it("records a declared report the command never produced as report_error without changing the outcome", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Report missing");
    await mkdir(path.join(root, "app"), { recursive: true });
    await patchConfig(root, (config) => {
      config.implementation_sources = [{ id: "app", path: "./app" }];
      config.verification.unit = [{ id: "no-report", cwd: ".", command: `node -e "process.exit(0)"`, report: { path: "app/absent.xml", format: "junit" } }];
    });
    const records = await executeVerification(root, await loadConfig(root), ["unit"]);
    expect(records[0]!.exit_code).toBe(0);
    expect(records[0]!.report).toBeUndefined();
    expect(records[0]!.report_error).toContain("not ingested");
  });
});

describe("drift and symbol warnings", () => {
  it("reports IMPLEMENTATION_DRIFT when mapped code changes without its artifact, and stays silent when the artifact moved too", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Implement approval, code segment");
    await addApprovalFeature(root);
    await mkdir(path.join(root, "app", "src"), { recursive: true });
    await patchConfig(root, (config) => {
      config.implementation_sources = [{ id: "app", path: "./app" }];
      config.verification = {
        unit: [{ id: "u", cwd: ".", command: `node -e "process.exit(0)"` }],
        integration: [{ id: "i", cwd: ".", command: `node -e "process.exit(0)"` }],
        system: [{ id: "s", cwd: ".", command: `node -e "process.exit(0)"` }]
      };
    });
    await mapArtifact(root, "03-design/interfaces/API-APPROVAL-001.md", ["app:src/approval-decision.ts"]);
    await executeVerification(root, await loadConfig(root), ["unit", "integration", "system"]);
    await createBaseline(root);
    await closeFlow(root);
    expect((await loadBaseline(root))?.implementation_hashes).toHaveProperty(["app:src/approval-decision.ts"]);
    const driftCodes = async () => (await validateProject(root, await scanArtifacts(root))).findings.filter((finding) => finding.code === "IMPLEMENTATION_DRIFT");
    expect(await driftCodes()).toEqual([]);
    await writeFile(path.join(root, "app", "src", "approval-decision.ts"), "// drifted content\n", "utf8");
    const drifted = await driftCodes();
    expect(drifted).toHaveLength(1);
    expect(drifted[0]!.message).toContain("app:src/approval-decision.ts");
    expect(drifted[0]!.message).toContain("API-APPROVAL-001");
    // Once the artifact itself changes, the divergence is an ordinary open
    // evolution, not drift.
    const apiFile = path.join(root, "03-design", "interfaces", "API-APPROVAL-001.md");
    await writeFile(apiFile, (await readFile(apiFile, "utf8")) + "\nRefined during implementation.\n", "utf8");
    expect(await driftCodes()).toEqual([]);
  });

  it("reports IMPLEMENTATION_SYMBOL_MISSING for a mapping row whose symbol the mapped file does not contain", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Symbol check");
    await addApprovalFeature(root);
    await mkdir(path.join(root, "app", "tests"), { recursive: true });
    await patchConfig(root, (config) => {
      config.implementation_sources = [{ id: "app", path: "./app" }];
    });
    await writeFile(path.join(root, "app", "tests", "approval.test.ts"), "test('commits a decision', () => {});\n", "utf8");
    const specFile = path.join(root, "04-verification", "unit-tests", "backend", "UT-API-APPROVAL-001.md");
    const spec = (await readFile(specFile, "utf8")).replace(/\r\n/g, "\n");
    const mappingSection = [
      "## Implementation mapping",
      "",
      "| Case IDs | Test path | Test name or symbol | Production symbol |",
      "|---|---|---|---|",
      "| TC-01 | tests/approval.test.ts | commits a decision | commitDecision |",
      "| TC-02 | tests/approval.test.ts | a case nobody wrote yet | commitDecision |"
    ].join("\n");
    await writeFile(specFile, spec.replace(/## Implementation mapping[\s\S]*?(?=\n## |$)/, `${mappingSection}\n\n`), "utf8");
    const findings = (await validateProject(root, await scanArtifacts(root))).findings.filter((finding) => finding.code === "IMPLEMENTATION_SYMBOL_MISSING");
    expect(findings).toHaveLength(1);
    expect(findings[0]!.message).toContain("a case nobody wrote yet");
    expect(findings[0]!.message).toContain("TC-02");
  });
});
