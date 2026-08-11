import { afterEach, describe, expect, it } from "vitest";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { artifact, cleanup, establishGenesis, repinPatternSnapshot, tempProject } from "./helpers.js";
import { scanArtifacts } from "../src/core/artifacts.js";
import { validateProject } from "../src/core/validation.js";
import { resolveCatalog } from "../src/core/pattern-catalog.js";
import { createArtifactFromPattern } from "../src/core/artifact-instantiation.js";
import { startFlow } from "../src/core/state.js";
import { buildGraph } from "../src/core/graph.js";
import { selectTests } from "../src/core/test-selection.js";
import { acceptanceCoverage, ruleCoverageEntries } from "../src/core/coverage-derivation.js";
import { addApprovalFeature, materializePatternArtifact } from "./fixtures/complete-saas/fixture.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

const PLATFORM_DEPENDS = ["PRODUCT-REQUIREMENTS", "QUALITY-REQUIREMENTS", "ARCHITECTURE-OVERVIEW", "FTR-APPROVAL-001"];

describe("platform targets and platform-neutral core units", () => {
  it("creates a platform target only inside a semantic flow at its canonical path", async () => {
    const root = await tempProject();
    roots.push(root);
    await expect(createArtifactFromPattern(root, await resolveCatalog(root, process.cwd()), "platform_target", "PLT-WINDOWS-001", "Windows client"))
      .rejects.toThrow("active semantic flow");
    await startFlow(root, "genesis", "fixture genesis");
    await expect(createArtifactFromPattern(root, await resolveCatalog(root, process.cwd()), "platform_target", "PLT-WINDOWS-001", "Windows client"))
      .rejects.toThrow("cannot be created during genesis");
  });

  it("instantiates a platform target draft under 03-design/platforms", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Ship the Windows client");
    const created = await createArtifactFromPattern(root, await resolveCatalog(root, process.cwd()), "platform_target", "PLT-WINDOWS-001", "Windows client");
    expect(created.file).toBe("03-design/platforms/PLT-WINDOWS-001.md");
    const draft = await readFile(path.join(root, created.file), "utf8");
    expect(draft).toContain("status: draft");
    expect(draft).toContain("artifact_type: platform_target");
  });

  it("rejects an active platform target that still carries template content", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Ship the Windows client");
    const created = await createArtifactFromPattern(root, await resolveCatalog(root, process.cwd()), "platform_target", "PLT-WINDOWS-001", "Windows client");
    const file = path.join(root, created.file);
    await writeFile(file, (await readFile(file, "utf8")).replace("status: draft", "status: active"), "utf8");
    const report = await validateProject(root, await scanArtifacts(root));
    expect(report.findings.some((item) => item.file === created.file && item.code.startsWith("CONTENT_"))).toBe(true);
  });

  it("accepts a complete platform target and reports it as design coverage without claiming rules", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Ship the Windows client");
    await addApprovalFeature(root);
    const result = await materializePatternArtifact(root, {
      type: "platform_target", id: "PLT-DESKTOP-001", title: "Windows desktop client", dependsOn: PLATFORM_DEPENDS
    });
    expect(result.file).toBe("03-design/platforms/PLT-DESKTOP-001.md");
    const artifacts = await scanArtifacts(root);
    const report = await validateProject(root, artifacts);
    expect(report.findings.filter((item) => item.file === result.file && item.severity === "error")).toEqual([]);

    // A platform target is design context for an acceptance criterion, never a
    // verification claimant: naming a rule in it must not satisfy RULE_UNVERIFIED.
    expect(acceptanceCoverage(artifacts)).toContain("PLT-DESKTOP-001");
    const claimants = ruleCoverageEntries(artifacts).flatMap((entry) => [...entry.unit, ...entry.integration, ...entry.system]);
    expect(claimants).not.toContain("PLT-DESKTOP-001");
  });

  it("requires integration and system regression when a platform target is affected", () => {
    const platform = artifact({ id: "PLT-WINDOWS-001", artifact_type: "platform_target" });
    const selection = selectTests([platform], buildGraph([platform]), [platform.id]);
    expect(selection.required).toEqual({ unit: false, integration: true, system: true });
  });

  it("instantiates a platform-neutral core unit under the widened backend contract", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Specify core decision rules");
    const created = await createArtifactFromPattern(root, await resolveCatalog(root, process.cwd()), "unit_test_backend", "UT-CORE-RULES-001", "Core decision rules");
    expect(created.file).toBe("04-verification/unit-tests/backend/UT-CORE-RULES-001.md");
    const report = await validateProject(root, await scanArtifacts(root));
    expect(report.findings.filter((item) => item.file === created.file && ["ARTIFACT_LOCATION_INVALID", "ARTIFACT_TYPE_UNKNOWN", "ARTIFACT_FILENAME_MISMATCH"].includes(item.code))).toEqual([]);
  });

  it("reports an unpinned scalable type instead of validating it silently", async () => {
    const root = await tempProject();
    roots.push(root);
    // Reproduce a repository initialized before platform targets existed: the
    // engine knows the type, the pinned catalog does not.
    const catalogFile = path.join(root, "00-system", "patterns", "catalog.yaml");
    const pinned = YAML.parse(await readFile(catalogFile, "utf8")) as { patterns: Array<{ artifact_type: string }> };
    pinned.patterns = pinned.patterns.filter((entry) => entry.artifact_type !== "platform_target");
    await writeFile(catalogFile, YAML.stringify(pinned), "utf8");
    await rm(path.join(root, "00-system", "patterns", "design", "platform-target.pattern.md"));
    await repinPatternSnapshot(root);

    await writeFile(path.join(root, "03-design", "platforms", "PLT-LEGACY-001.md"), [
      "---", "id: PLT-LEGACY-001", "artifact_type: platform_target", "title: Legacy platform",
      "status: active", "created_by_change: CHG-001", "depends_on: []", "decisions: []",
      "implementation: []", "supersedes:", "---", "", "# PLT-LEGACY-001 — Legacy platform", "",
      "Written by hand before the catalog knew this type.", ""
    ].join("\n"), "utf8");

    const report = await validateProject(root, await scanArtifacts(root));
    const unpinned = report.findings.filter((item) => item.code === "CONTENT_CONTRACT_UNPINNED");
    expect(unpinned.map((item) => item.file)).toEqual(["03-design/platforms/PLT-LEGACY-001.md"]);
    expect(report.findings.some((item) => item.file === "03-design/platforms/PLT-LEGACY-001.md" && item.code === "ARTIFACT_TYPE_UNKNOWN")).toBe(false);
    expect(report.valid).toBe(false);
  });
});
