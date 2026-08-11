import { afterEach, describe, expect, it } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cleanup, establishGenesis, tempProject } from "./helpers.js";
import { scanArtifacts } from "../src/core/artifacts.js";
import { validateProject } from "../src/core/validation.js";
import { resolveCatalog } from "../src/core/pattern-catalog.js";
import { createArtifactFromPattern } from "../src/core/artifact-instantiation.js";
import { startFlow } from "../src/core/state.js";
import { activateArchitectureOverview, addApprovalFeature, materializePatternArtifact } from "./fixtures/complete-saas/fixture.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

describe("pinned pattern and active-content contracts", () => {
  it("lists exactly 24 deterministic scalable patterns", async () => {
    const root = await tempProject();
    roots.push(root);
    const first = await resolveCatalog(root, process.cwd());
    const second = await resolveCatalog(root, process.cwd());
    expect(first.patterns).toHaveLength(24);
    expect(first.patterns.map((item) => item.artifact_type)).toEqual(second.patterns.map((item) => item.artifact_type));
    expect(first.patterns.map((item) => item.artifact_type)).toEqual([...first.patterns.map((item) => item.artifact_type)].sort());
    expect(first.patterns.every((item) => item.target.includes("{{ID}}") && !item.target.includes(".."))).toBe(true);
  });

  it("confines creation to the active flow, approved type, ID, and canonical path", async () => {
    const root = await tempProject();
    roots.push(root);
    await expect(createArtifactFromPattern(root, await resolveCatalog(root, process.cwd()), "feature", "FTR-APPROVAL-001", "Approval"))
      .rejects.toThrow("active semantic flow");
    await startFlow(root, "genesis", "fixture genesis");
    await expect(createArtifactFromPattern(root, await resolveCatalog(root, process.cwd()), "feature", "FTR-APPROVAL-001", "Approval"))
      .rejects.toThrow("cannot be created during genesis");
  });

  it("rejects shallow active foundations and unchanged active pattern drafts", async () => {
    const shallowRoot = await tempProject();
    roots.push(shallowRoot);
    const idea = path.join(shallowRoot, "01-discovery", "idea-definition.md");
    await writeFile(idea, (await readFile(idea, "utf8")).replace("status: draft", "status: active"), "utf8");
    let report = await validateProject(shallowRoot, await scanArtifacts(shallowRoot));
    expect(report.findings.some((item) => ["CONTENT_PLACEHOLDER", "CONTENT_TABLE_EMPTY", "CONTENT_SECTION_EMPTY"].includes(item.code))).toBe(true);

    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Add approval behavior");
    const created = await createArtifactFromPattern(root, await resolveCatalog(root, process.cwd()), "feature", "FTR-SHALLOW-001", "Shallow feature");
    const file = path.join(root, created.file);
    await writeFile(file, (await readFile(file, "utf8")).replace("status: draft", "status: active"), "utf8");
    report = await validateProject(root, await scanArtifacts(root));
    expect(report.findings.some((item) => item.file === created.file && item.code.startsWith("CONTENT_"))).toBe(true);
  });

  it("promotes pattern-derived drafts only after complete content is supplied", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Add approval behavior");
    const result = await materializePatternArtifact(root, {
      type: "feature", id: "FTR-APPROVAL-001", title: "Decide an approval request",
      dependsOn: ["PRODUCT-REQUIREMENTS", "ACCESS-CONTROL", "SYSTEM-INVARIANTS"]
    });
    expect(result.draft).toContain("status: draft");
    expect(result.file).toBe("02-product/features/FTR-APPROVAL-001.md");
    const active = await readFile(path.join(root, result.file), "utf8");
    expect(active).toContain("status: active");
    expect(active).toContain("| AC-03 |");
    const report = await validateProject(root, await scanArtifacts(root));
    // Content completeness only. This fixture creates the feature without any
    // verification specification, so its business rules are legitimately
    // unclaimed and RULE_UNVERIFIED warnings are expected here.
    expect(report.findings.filter((item) => item.file === result.file && item.severity === "error")).toEqual([]);
    expect(report.findings.filter((item) => item.file === result.file).every((item) => item.code === "RULE_UNVERIFIED")).toBe(true);
  });

  it("accepts the complete pattern-derived approval feature closure", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Add approval behavior");
    await addApprovalFeature(root);
    const report = await validateProject(root, await scanArtifacts(root));
    expect(report.findings.filter((item) => item.code.startsWith("CONTENT_"))).toEqual([]);
    expect(report.valid).toBe(true);
  });

  it("requires every active entity to declare its persistence authority", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Add approval behavior");
    await addApprovalFeature(root);
    const file = path.join(root, "03-design", "data", "ENT-APPROVAL-001.md");
    const declared = await readFile(file, "utf8");
    await writeFile(file, declared.replace("- Persistence authority: PHYSICAL-SCHEMA\n\n", ""), "utf8");
    const missing = await validateProject(root, await scanArtifacts(root));
    expect(missing.findings.some((item) => item.code === "CONTENT_LOCAL_ID_MISSING" && item.message.includes("persistence_authority"))).toBe(true);
    for (const value of ["SCHEMA-ANALYTICS", "PLT-DESKTOP-001#M-01 local store", "none — derived at read time from the decision audit rows"]) {
      await writeFile(file, declared.replace("- Persistence authority: PHYSICAL-SCHEMA", `- Persistence authority: ${value}`), "utf8");
      const report = await validateProject(root, await scanArtifacts(root));
      expect(report.findings.some((item) => item.code === "CONTENT_LOCAL_ID_MISSING" && item.file === "03-design/data/ENT-APPROVAL-001.md")).toBe(false);
    }
  });

  it("demands a populated runtime topology before the architecture overview goes active", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Describe the runtime topology");
    const relative = await activateArchitectureOverview(root);
    const complete = await validateProject(root, await scanArtifacts(root));
    expect(complete.findings.filter((item) => item.file === relative)).toEqual([]);

    const file = path.join(root, relative);
    const active = await readFile(file, "utf8");
    const withoutSection = active.replace(/## Runtime topology[\s\S]*?(?=## Decision references)/, "");
    await writeFile(file, withoutSection, "utf8");
    const missing = await validateProject(root, await scanArtifacts(root));
    expect(missing.findings.some((item) => item.code === "CONTENT_HEADING_MISSING" && item.message.includes("Runtime topology"))).toBe(true);

    const emptyRows = active.replace(/\| approval-web[^\n]*\n/, "").replace(/\| approval-service[^\n]*\n/, "");
    await writeFile(file, emptyRows, "utf8");
    const empty = await validateProject(root, await scanArtifacts(root));
    expect(empty.findings.some((item) => ["CONTENT_TABLE_EMPTY", "CONTENT_SECTION_EMPTY"].includes(item.code) && item.file === relative)).toBe(true);
  });

  it("rejects any in-place change to the pinned snapshot", async () => {
    const root = await tempProject();
    roots.push(root);
    const pattern = path.join(root, "00-system", "patterns", "product", "feature.pattern.md");
    await writeFile(pattern, `${await readFile(pattern, "utf8")}\nTampered.\n`, "utf8");
    await expect(resolveCatalog(root, process.cwd())).rejects.toThrow("Pinned pattern snapshot was modified");
    const report = await validateProject(root, await scanArtifacts(root));
    expect(report.findings.some((item) => item.code === "PATTERN_CATALOG_INVALID")).toBe(true);
  });
});
