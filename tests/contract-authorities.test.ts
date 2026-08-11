import { afterEach, describe, expect, it } from "vitest";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { artifact, cleanup, establishGenesis, tempProject } from "./helpers.js";
import { addApprovalFeature } from "./fixtures/complete-saas/fixture.js";
import { scanArtifacts } from "../src/core/artifacts.js";
import { validateProject } from "../src/core/validation.js";
import { buildGraph, reverseClosure } from "../src/core/graph.js";
import { CONTRACT_KINDS, deriveContractId } from "../src/core/contract-authorities.js";
import { createBaseline, syncRepresentationChanges } from "../src/core/baseline.js";
import { closeFlow, startFlow } from "../src/core/state.js";
import { loadBaseline, projectSnapshot } from "../src/core/project.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

const AUTHORITY_WARNINGS = ["WIRE_AUTHORITY_UNDECLARED", "SCHEMA_AUTHORITY_UNDECLARED", "TRANSITION_AUTHORITY_UNDECLARED"];

const BILLING_YAML = `openapi: "3.1.0"\ninfo:\n  title: Billing surface\n  version: "1.0.0"\npaths: {}\n`;
const ANALYTICS_DBML = `// Analytics service database\nTable analytics_events {\n  id uuid [pk]\n}\n`;
const DESKTOP_MMD = `flowchart LR\n  SCR_DESKTOP_001 --> SCR_DESKTOP_002\n`;

async function writeSibling(root: string, relative: string, content: string): Promise<void> {
  await writeFile(path.join(root, relative), content, "utf8");
}

async function declareAuthority(root: string, relative: string, contractId: string): Promise<void> {
  const file = path.join(root, relative);
  const content = await readFile(file, "utf8");
  await writeFile(file, content.replace(/^depends_on: \[(.*)\]$/m, `depends_on: [$1, ${contractId}]`), "utf8");
}

describe("contract authorities", () => {
  it("baselines discovered sibling contracts with their artifact type intact", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Split the surface into client and services");
    await addApprovalFeature(root);
    await writeSibling(root, "03-design/interfaces/billing.yaml", BILLING_YAML);
    await writeSibling(root, "03-design/data/analytics.dbml", ANALYTICS_DBML);
    await writeSibling(root, "03-design/desktop.mmd", DESKTOP_MMD);
    const manifest = await createBaseline(root);
    const rows = new Map(manifest.artifacts.map((entry) => [entry.id, entry]));
    expect(rows.get("WIRE-BILLING")).toMatchObject({ artifact_type: "openapi_contract", file: "03-design/interfaces/billing.yaml", status: "active", created_by_change: "GENESIS" });
    expect(rows.get("SCHEMA-ANALYTICS")).toMatchObject({ artifact_type: "physical_schema", file: "03-design/data/analytics.dbml" });
    expect(rows.get("TRANSITIONS-DESKTOP")).toMatchObject({ artifact_type: "screen_transitions", file: "03-design/desktop.mmd" });
    expect(rows.get("WIRE-BILLING")!.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(rows.get("OPENAPI-CONTRACT")).toBeTruthy();
    await closeFlow(root);
    expect((await loadBaseline(root))?.artifacts.some((entry) => entry.id === "WIRE-BILLING")).toBe(true);
  });

  it("derives deterministic sibling identities and surfaces name collisions as duplicates", async () => {
    const wire = CONTRACT_KINDS.find((kind) => kind.artifact_type === "openapi_contract")!;
    expect(deriveContractId(wire, "03-design/interfaces/billing.yaml")).toBe("WIRE-BILLING");
    expect(deriveContractId(wire, "03-design/interfaces/Billing v2.yaml")).toBe("WIRE-BILLING-V2");
    const schema = CONTRACT_KINDS.find((kind) => kind.artifact_type === "physical_schema")!;
    expect(deriveContractId(schema, "03-design/data/analytics.dbml")).toBe("SCHEMA-ANALYTICS");
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await writeSibling(root, "03-design/interfaces/billing.yaml", BILLING_YAML);
    await writeSibling(root, "03-design/interfaces/billing.yml", BILLING_YAML);
    const report = await validateProject(root, await scanArtifacts(root));
    expect(report.findings.some((finding) => finding.code === "ID_DUPLICATE" && finding.message.includes("WIRE-BILLING"))).toBe(true);
  });

  it("keeps single-file repositories on the pre-sibling behavior", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Approval feature");
    await addApprovalFeature(root);
    const artifacts = await scanArtifacts(root);
    const openapi = artifacts.find((entry) => entry.id === "OPENAPI-CONTRACT")!;
    expect(openapi.depends_on).toContain("API-APPROVAL-001");
    const schema = artifacts.find((entry) => entry.id === "PHYSICAL-SCHEMA")!;
    expect(schema.depends_on).toContain("ENT-APPROVAL-001");
    const report = await validateProject(root, artifacts);
    expect(report.findings.filter((finding) => AUTHORITY_WARNINGS.includes(finding.code))).toEqual([]);
    await createBaseline(root);
    await closeFlow(root);
    await startFlow(root, "evolution", "No change at all");
    await expect(closeFlow(root)).resolves.toBeTruthy();
  });

  it("treats a flow whose only change is a sibling contract file as unbaselined, not cancelled", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Add the billing surface");
    await writeSibling(root, "03-design/interfaces/billing.yaml", BILLING_YAML);
    await expect(closeFlow(root)).rejects.toThrow("unbaselined changes");
  });

  it("warns only while sibling files exist and the instance declares no owner", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Approval with sibling authorities");
    await addApprovalFeature(root);
    await writeSibling(root, "03-design/interfaces/billing.yaml", BILLING_YAML);
    await writeSibling(root, "03-design/data/analytics.dbml", ANALYTICS_DBML);
    await writeSibling(root, "03-design/desktop.mmd", DESKTOP_MMD);
    const before = await validateProject(root, await scanArtifacts(root));
    const codes = before.findings.filter((finding) => AUTHORITY_WARNINGS.includes(finding.code));
    expect(codes.map((finding) => finding.code).sort()).toEqual(["SCHEMA_AUTHORITY_UNDECLARED", "TRANSITION_AUTHORITY_UNDECLARED", "WIRE_AUTHORITY_UNDECLARED"]);
    expect(codes.every((finding) => finding.severity === "warning")).toBe(true);
    expect(before.valid).toBe(true);
    await declareAuthority(root, "03-design/interfaces/API-APPROVAL-001.md", "WIRE-BILLING");
    const after = await validateProject(root, await scanArtifacts(root));
    expect(after.findings.some((finding) => finding.code === "WIRE_AUTHORITY_UNDECLARED")).toBe(false);
    expect(after.findings.some((finding) => finding.code === "SCHEMA_AUTHORITY_UNDECLARED")).toBe(true);
    expect(after.findings.some((finding) => finding.code === "REFERENCE_BROKEN")).toBe(false);
  });

  it("fans impact per declared authority file instead of across the whole surface", () => {
    const multi = buildGraph([
      artifact({ id: "SCHEMA-CORE", artifact_type: "physical_schema" }),
      artifact({ id: "SCHEMA-ANALYTICS", artifact_type: "physical_schema" }),
      artifact({ id: "ENT-A", artifact_type: "entity", depends_on: ["SCHEMA-CORE"] }),
      artifact({ id: "ENT-B", artifact_type: "entity", depends_on: ["SCHEMA-ANALYTICS"] })
    ]);
    const fromFile = reverseClosure(multi, ["SCHEMA-ANALYTICS"]);
    expect(fromFile).toContain("ENT-B");
    expect(fromFile).not.toContain("ENT-A");
    const fromEntity = reverseClosure(multi, ["ENT-B"]);
    expect(fromEntity).toContain("SCHEMA-ANALYTICS");
    expect(fromEntity).not.toContain("SCHEMA-CORE");
    expect(fromEntity).not.toContain("ENT-A");
    const single = buildGraph([
      artifact({ id: "PHYSICAL-SCHEMA", artifact_type: "physical_schema", depends_on: ["ENT-A", "ENT-B"] }),
      artifact({ id: "ENT-A", artifact_type: "entity" }),
      artifact({ id: "ENT-B", artifact_type: "entity" })
    ]);
    expect(reverseClosure(single, ["ENT-B"])).toEqual(expect.arrayContaining(["PHYSICAL-SCHEMA", "ENT-A"]));
  });

  it("demands the OpenAPI dialect only of documents that claim it", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await writeSibling(root, "03-design/interfaces/legacy.yaml", `openapi: "3.0.3"\npaths: {}\n`);
    await writeSibling(root, "03-design/interfaces/events.yaml", `asyncapi: "3.0.0"\nchannels: {}\n`);
    await writeSibling(root, "03-design/interfaces/broken.yaml", "just a scalar\n");
    const report = await validateProject(root, await scanArtifacts(root));
    expect(report.findings.some((finding) => finding.code === "OPENAPI_VERSION" && finding.file === "03-design/interfaces/legacy.yaml")).toBe(true);
    expect(report.findings.some((finding) => finding.code === "OPENAPI_INVALID" && finding.file === "03-design/interfaces/broken.yaml")).toBe(true);
    expect(report.findings.some((finding) => ["OPENAPI_VERSION", "OPENAPI_INVALID"].includes(finding.code) && finding.file === "03-design/interfaces/events.yaml")).toBe(false);
    expect(report.findings.some((finding) => finding.code === "OPENAPI_VERSION" && finding.message === "openapi.yaml must use OpenAPI 3.1.0")).toBe(false);
  });

  it("locks a baselined sibling like the canonical contracts", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Ship the billing surface");
    await addApprovalFeature(root);
    await writeSibling(root, "03-design/interfaces/billing.yaml", BILLING_YAML);
    await createBaseline(root);
    await closeFlow(root);
    await writeSibling(root, "03-design/interfaces/billing.yaml", `${BILLING_YAML}# semantic contract mutation\n`);
    expect(await syncRepresentationChanges(root)).toEqual([]);
    expect((await projectSnapshot(root)).impact.direct).toContain("WIRE-BILLING");
    await startFlow(root, "reassessment", "Has billing pricing evidence changed?");
    const ledger = path.join(root, "01-discovery/evidence-ledger.md");
    await writeFile(ledger, `${await readFile(ledger, "utf8")}\n## EVD-NEW-001\n\n- URL: https://example.com/new\n- Evidence: New signal.\n`, "utf8");
    await expect(createBaseline(root)).rejects.toThrow("cannot mutate product, design, verification, or engine contracts");
    await rm(path.join(root, "03-design/interfaces/billing.yaml"));
    const report = await validateProject(root, await scanArtifacts(root));
    expect(report.findings.some((finding) => finding.code === "BASELINED_ARTIFACT_DELETED" && finding.message.includes("WIRE-BILLING"))).toBe(true);
  });
});
