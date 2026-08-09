import { afterEach, describe, expect, it } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { createBaseline, syncRepresentationChanges } from "../src/core/baseline.js";
import { loadBaseline, projectSnapshot } from "../src/core/project.js";
import { closeFlow, startFlow } from "../src/core/state.js";
import { cleanup, establishGenesis, prepareGenesisArtifacts, tempProject } from "./helpers.js";
import { scanArtifacts } from "../src/core/artifacts.js";
import { validateProject } from "../src/core/validation.js";
import YAML from "yaml";
import { materializePatternArtifact } from "./fixtures/complete-saas/fixture.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

async function append(file: string, text: string): Promise<string> {
  const before = await readFile(file, "utf8");
  await writeFile(file, `${before}${text}`, "utf8");
  return before;
}

describe("contract and temporal safety", () => {
  it("cancels a clean accidental flow while preserving its change ID", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    const flow = await startFlow(root, "evolution", "Accidental start");
    await closeFlow(root);
    const change = JSON.parse(await readFile(path.join(root, `.ai-saas-sdlc/changes/${flow.change_id}.json`), "utf8"));
    expect(change.status).toBe("cancelled");
    expect((await startFlow(root, "reassessment", "A real next signal")).id).toBe("FLOW-003");
  });

  it("never cancels or closes across unbaselined implementation changes", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    const source = path.join(root, "implementation-source");
    await (await import("node:fs/promises")).mkdir(source);
    await writeFile(path.join(source, "app.js"), "export const value = 1;\n", "utf8");
    execFileSync("git", ["init", "-q"], { cwd: source });
    execFileSync("git", ["add", "app.js"], { cwd: source });
    execFileSync("git", ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "commit", "-qm", "fixture"], { cwd: source });
    const configFile = path.join(root, "sdlc.config.yaml");
    const config = YAML.parse(await readFile(configFile, "utf8"));
    config.implementation_sources = [{ id: "app", path: "implementation-source" }];
    await writeFile(configFile, YAML.stringify(config), "utf8");

    await startFlow(root, "evolution", "Inspect source mutation boundaries");
    await writeFile(path.join(source, "app.js"), "export const value = 2;\n", "utf8");
    await expect(closeFlow(root)).rejects.toThrow("unbaselined changes and cannot close");
    await writeFile(path.join(source, "app.js"), "export const value = 1;\n", "utf8");
    await append(path.join(root, "05-control/questions.md"), "\nMaterial question for a baseline.\n");
    await createBaseline(root);
    await writeFile(path.join(source, "app.js"), "export const value = 3;\n", "utf8");
    await expect(closeFlow(root)).rejects.toThrow("implementation changes made after baseline");
    await writeFile(path.join(source, "app.js"), "export const value = 1;\n", "utf8");
    await closeFlow(root);
  });

  it("excludes engine-owned files when the documentation root is an implementation source", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    const configFile = path.join(root, "sdlc.config.yaml");
    const config = YAML.parse(await readFile(configFile, "utf8"));
    config.implementation_sources = [{ id: "same-repository", path: "." }];
    await writeFile(configFile, YAML.stringify(config), "utf8");
    execFileSync("git", ["init", "-q"], { cwd: root });
    execFileSync("git", ["add", "."], { cwd: root });
    execFileSync("git", ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "commit", "-qm", "fixture"], { cwd: root });
    const flow = await startFlow(root, "evolution", "Accidental same-repository flow");
    await closeFlow(root);
    const change = JSON.parse(await readFile(path.join(root, `.ai-saas-sdlc/changes/${flow.change_id}.json`), "utf8"));
    expect(change.status).toBe("cancelled");
  });

  it("keeps scalable API and entity design out of Genesis", async () => {
    const root = await tempProject();
    roots.push(root);
    await startFlow(root, "genesis", "Approval workflow SaaS");
    await prepareGenesisArtifacts(root);
    await writeFile(path.join(root, "03-design/data/ENT-PREMATURE-001.md"), "---\nid: ENT-PREMATURE-001\nartifact_type: entity\ntitle: Premature\nstatus: draft\ncreated_by_change: GENESIS\ndepends_on: [ARCHITECTURE-OVERVIEW]\ndecisions: []\nsupersedes:\n---\n# Premature\n", "utf8");
    await expect(createBaseline(root)).rejects.toThrow("Genesis creates discovery and product foundations only");
  });

  it("enforces canonical foundation identity and singleton evidence", async () => {
    const root = await tempProject();
    roots.push(root);
    const requirements = path.join(root, "02-product/product-requirements.md");
    await writeFile(requirements, (await readFile(requirements, "utf8")).replace("artifact_type: product_requirements", "artifact_type: issue"), "utf8");
    await writeFile(path.join(root, "01-discovery/customer-segments/duplicate.md"), "---\nid: EVIDENCE-DUPLICATE\nartifact_type: evidence_ledger\ntitle: Duplicate\nstatus: active\ncreated_by_change: GENESIS\ndepends_on: []\ndecisions: []\nsupersedes:\n---\n# Duplicate\n", "utf8");
    const report = await validateProject(root, await scanArtifacts(root));
    expect(report.findings.some((finding) => finding.code === "CANONICAL_IDENTITY_INVALID")).toBe(true);
    expect(report.findings.some((finding) => finding.code === "CANONICAL_SINGLETON")).toBe(true);
  });

  it("rejects product artifact types hidden under discovery during reassessment", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    const flow = await startFlow(root, "reassessment", "New evidence");
    const ledger = path.join(root, "01-discovery/evidence-ledger.md");
    await append(ledger, "\n## EVD-NEW-002\n\n- URL: https://example.com/new-2\n- Evidence: New signal.\n");
    await writeFile(path.join(root, "01-discovery/FTR-HIDDEN-001.md"), `---\nid: FTR-HIDDEN-001\nartifact_type: feature\ntitle: Hidden\nstatus: active\ncreated_by_change: ${flow.id}\ndepends_on: [PRODUCT-REQUIREMENTS]\ndecisions: []\nsupersedes:\n---\n# Hidden\n`, "utf8");
    await expect(createBaseline(root)).rejects.toThrow("ARTIFACT_LOCATION_INVALID");
  });

  it("tracks non-Markdown contracts and forbids changing them in reassessment", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    const baseline = await loadBaseline(root);
    expect(baseline?.artifacts.map((artifact) => artifact.id)).toEqual(expect.arrayContaining([
      "SDLC-CONFIG", "OPENAPI-CONTRACT", "PHYSICAL-SCHEMA", "SCREEN-TRANSITIONS"
    ]));

    await startFlow(root, "reassessment", "Has pricing evidence changed?");
    await append(path.join(root, "01-discovery/evidence-ledger.md"), "\n## EVD-NEW-001\n\n- URL: https://example.com/new\n- Evidence: New signal.\n");
    const openapi = path.join(root, "03-design/interfaces/openapi.yaml");
    await append(openapi, "\n# semantic contract mutation\n");
    expect((await projectSnapshot(root)).impact.direct).toContain("OPENAPI-CONTRACT");
    await expect(createBaseline(root)).rejects.toThrow("cannot mutate product, design, verification, or engine contracts");
  });

  it("cannot close or launder an evolution without its exact completed baseline", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Refine architecture boundary");
    const questions = path.join(root, "05-control/questions.md");
    await append(questions, "\nA material unresolved architecture question was added.\n");
    await expect(closeFlow(root)).rejects.toThrow("has unbaselined changes and cannot close");
    await createBaseline(root);
    const baselined = await readFile(questions, "utf8");
    await append(questions, "\nA later unbaselined change.\n");
    await expect(closeFlow(root)).rejects.toThrow("changes made after baseline");
    await writeFile(questions, baselined, "utf8");
    await closeFlow(root);

    const openapi = path.join(root, "03-design/interfaces/openapi.yaml");
    await append(openapi, "\n# unbaselined semantic change\n");
    expect(await syncRepresentationChanges(root)).toEqual([]);
    expect((await projectSnapshot(root)).impact.direct).toContain("OPENAPI-CONTRACT");
  });

  it("routes evidence changes exclusively through Genesis or Reassessment", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Change product behavior");
    await append(path.join(root, "01-discovery/evidence-ledger.md"), "\n## EVD-WRONG-FLOW\n\n- URL: https://example.com/wrong\n- Evidence: Wrong flow.\n");
    await expect(createBaseline(root)).rejects.toThrow("Evidence changes require Evidence Reassessment");
  });

  it("never rewrites evidence into the baseline through editorial synchronization", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await append(path.join(root, "01-discovery/evidence-ledger.md"), "\n## EVD-OUTSIDE-FLOW\n\n- URL: https://example.com/new\n- Evidence: New signal.\n");
    expect(await syncRepresentationChanges(root)).toEqual([]);
    expect((await projectSnapshot(root)).impact.direct).toContain("EVIDENCE-LEDGER");
    await startFlow(root, "reassessment", "Assess the new signal");
    expect((await projectSnapshot(root)).impact.direct).toContain("EVIDENCE-LEDGER");
  });

  it("never accepts an ADR lifecycle transition as an editorial change", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Propose a durable decision");
    const adr = path.join(root, "05-control/decisions/ADR-EDITORIAL-001.md");
    await materializePatternArtifact(root, {
      type: "architectural_decision", id: "ADR-EDITORIAL-001", title: "Proposed decision",
      dependsOn: ["ARCHITECTURE-OVERVIEW"], adrStatus: "proposed"
    }, { "ADR-APPROVAL-001": "ADR-EDITORIAL-001" });
    await createBaseline(root);
    await closeFlow(root);
    await writeFile(adr, (await readFile(adr, "utf8")).replace("adr_status: proposed", "adr_status: accepted"), "utf8");
    expect(await syncRepresentationChanges(root)).toEqual([]);
    expect((await projectSnapshot(root)).impact.direct).toContain("ADR-EDITORIAL-001");
  });
});
