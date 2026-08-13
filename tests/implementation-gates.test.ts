import { afterEach, describe, expect, it } from "vitest";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { cleanup, establishGenesis, tempProject } from "./helpers.js";
import { loadConfig } from "../src/core/config.js";
import { scanArtifacts } from "../src/core/artifacts.js";
import { validateProject } from "../src/core/validation.js";
import { executeVerification } from "../src/core/verification.js";
import { createBaseline } from "../src/core/baseline.js";
import { closeFlow, startFlow } from "../src/core/state.js";
import { addApprovalFeature, addSharedQueueFeature } from "./fixtures/complete-saas/fixture.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

const IMPLEMENTATION_CODES = ["IMPLEMENTATION_MAPPING_MISSING", "IMPLEMENTATION_LEVEL_UNPROVEN"];

async function patchConfig(root: string, mutate: (config: Record<string, any>) => void): Promise<void> {
  const file = path.join(root, "sdlc.config.yaml");
  const config = YAML.parse(await readFile(file, "utf8"));
  mutate(config);
  await writeFile(file, YAML.stringify(config), "utf8");
}

/** Configure one implementation source plus a green command per level, and create the source root. */
async function wireSource(root: string): Promise<void> {
  await mkdir(path.join(root, "app", "src"), { recursive: true });
  await mkdir(path.join(root, "app", "tests"), { recursive: true });
  await patchConfig(root, (config) => {
    config.implementation_sources = [{ id: "app", path: "./app" }];
    config.verification = {
      unit: [{ id: "unit-suite", cwd: ".", command: `node -e "process.exit(0)"` }],
      integration: [{ id: "integration-suite", cwd: ".", command: `node -e "process.exit(0)"` }],
      system: [{ id: "system-suite", cwd: ".", command: `node -e "process.exit(0)"` }]
    };
  });
}

/** Set the implementation frontmatter of one canonical artifact and create the mapped files. */
async function mapArtifact(root: string, artifactRelativeFile: string, mappings: string[]): Promise<void> {
  for (const mapping of mappings) {
    const relative = mapping.slice(mapping.indexOf(":") + 1);
    const target = path.join(root, "app", relative);
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

async function implementationFindings(root: string) {
  const report = await validateProject(root, await scanArtifacts(root));
  return report.findings.filter((finding) => IMPLEMENTATION_CODES.includes(finding.code));
}

describe("graduated implementation gates", () => {
  it("names ignored mapping rows and unresolvable mapped paths instead of dropping them silently", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Mapping diagnostics");
    await addApprovalFeature(root);
    await wireSource(root);
    const specFile = path.join(root, "04-verification", "unit-tests", "backend", "UT-API-APPROVAL-001.md");
    const body = (await readFile(specFile, "utf8")).replace(/\r\n/g, "\n");
    const table = [
      "| Case ID | Test path | Test name or symbol | Production symbol |",
      "|---|---|---|---|",
      "| TC-01 | tests/nowhere.test.ts | commits a decision | commitDecision |",
      "| TC02 | tests/approval-decision.test.ts | rejects | commitDecision |",
      "| TC-03 | tests/approval-decision.test.ts | missing-a-column |"
    ].join("\n");
    await writeFile(specFile, body.replace(/## Implementation mapping[\s\S]*?(?=\n## |$)/, `## Implementation mapping\n\n${table}\n\n`), "utf8");
    await mapArtifact(root, "04-verification/unit-tests/backend/UT-API-APPROVAL-001.md", ["app:tests/approval-decision.test.ts"]);
    const report = await validateProject(root, await scanArtifacts(root));
    const codes = report.findings.filter((finding) => finding.file?.includes("UT-API-APPROVAL-001")).map((finding) => finding.code);
    // The singular "Case ID" header still parses; TC-01's path resolves under
    // no source (a transposed or stale row on a spec that declares mappings);
    // the TC02 and three-column rows are present but unparseable.
    expect(codes).toContain("IMPLEMENTATION_MAPPING_PATH_MISSING");
    expect(codes).toContain("IMPLEMENTATION_MAPPING_ROW_IGNORED");
    const ignored = report.findings.filter((finding) => finding.code === "IMPLEMENTATION_MAPPING_ROW_IGNORED");
    expect(ignored.some((finding) => finding.message.includes("no TC-nn"))).toBe(true);
    expect(ignored.some((finding) => finding.message.includes("four columns"))).toBe(true);
  });

  it("stays byte-identical for a repository without implementation sources", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Add approval feature docs-only");
    await addApprovalFeature(root);
    expect(await implementationFindings(root)).toEqual([]);
    await createBaseline(root);
    await closeFlow(root);
    expect(await implementationFindings(root)).toEqual([]);
  });

  it("baselines a documentation-only feature in a wired repository, recording the missing mapping as a standing warning", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Add approval feature with sources configured");
    await addApprovalFeature(root);
    await wireSource(root);
    const findings = await implementationFindings(root);
    expect(findings.map((finding) => finding.code)).toEqual(["IMPLEMENTATION_MAPPING_MISSING"]);
    expect(findings[0]!.message).toContain("FTR-APPROVAL-001");
    expect(findings[0]!.severity).toBe("warning");
    await executeVerification(root, await loadConfig(root), ["unit", "integration", "system"]);
    // Before 1.11.0 this threw "no implementation mapping despite configured
    // implementation sources"; the relaxation is the contract under test.
    const manifest = await createBaseline(root);
    expect(manifest.verification).toEqual({ unit: "passed", integration: "passed", system: "passed" });
    await closeFlow(root);
  });

  it("closes a code-only segment with the unproven levels named, then shrinks the warnings as levels are mapped", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Implement FTR-APPROVAL-001, code segment");
    await addApprovalFeature(root);
    await wireSource(root);
    await mapArtifact(root, "03-design/interfaces/API-APPROVAL-001.md", ["app:src/approval-decision.ts"]);
    const codeOnly = await implementationFindings(root);
    expect(codeOnly.map((finding) => finding.code)).toEqual(["IMPLEMENTATION_LEVEL_UNPROVEN", "IMPLEMENTATION_LEVEL_UNPROVEN", "IMPLEMENTATION_LEVEL_UNPROVEN"]);
    expect(codeOnly.map((finding) => finding.message)).toEqual([
      expect.stringContaining("UT specification(s) (UT-API-APPROVAL-001)"),
      expect.stringContaining("IT specification(s) (IT-APPROVAL-001)"),
      expect.stringContaining("ST specification(s) (ST-APPROVAL-001)")
    ]);
    await executeVerification(root, await loadConfig(root), ["unit", "integration", "system"]);
    await createBaseline(root);
    await closeFlow(root);
    // Second segment: implement and map the unit level; UT leaves the ledger.
    await startFlow(root, "evolution", "Implement FTR-APPROVAL-001, ut segment");
    await mapArtifact(root, "04-verification/unit-tests/backend/UT-API-APPROVAL-001.md", ["app:tests/approval-decision.test.ts"]);
    const utMapped = await implementationFindings(root);
    expect(utMapped.map((finding) => finding.message)).toEqual([
      expect.stringContaining("IT specification(s)"),
      expect.stringContaining("ST specification(s)")
    ]);
    await executeVerification(root, await loadConfig(root), ["unit", "integration", "system"]);
    await createBaseline(root);
    await closeFlow(root);
  });

  it("lets one feature be implemented while another stays documentation-only, each honestly recorded", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Two features, one implemented");
    await addApprovalFeature(root);
    await addSharedQueueFeature(root);
    await wireSource(root);
    await mapArtifact(root, "03-design/interfaces/API-APPROVAL-001.md", ["app:src/approval-decision.ts"]);
    await mapArtifact(root, "04-verification/unit-tests/backend/UT-API-APPROVAL-001.md", ["app:tests/approval-decision.test.ts"]);
    await mapArtifact(root, "04-verification/integration-tests/IT-APPROVAL-001.md", ["app:tests/approval-boundary.test.ts"]);
    await mapArtifact(root, "04-verification/system-tests/ST-APPROVAL-001.md", ["app:tests/approval-journey.test.ts"]);
    const findings = await implementationFindings(root);
    // FTR-APPROVAL-001 is fully mapped; FTR-QUEUE-001 carries the standing record.
    expect(findings).toHaveLength(1);
    expect(findings[0]!.code).toBe("IMPLEMENTATION_MAPPING_MISSING");
    expect(findings[0]!.message).toContain("FTR-QUEUE-001");
    await executeVerification(root, await loadConfig(root), ["unit", "integration", "system"]);
    await createBaseline(root);
    await closeFlow(root);
  });
});
