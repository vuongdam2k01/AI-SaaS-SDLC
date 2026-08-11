import { afterEach, describe, expect, it } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { artifact, cleanup, establishGenesis, tempProject } from "./helpers.js";
import { addApprovalFeature } from "./fixtures/complete-saas/fixture.js";
import { loadConfig } from "../src/core/config.js";
import { scanArtifacts } from "../src/core/artifacts.js";
import { validateProject } from "../src/core/validation.js";
import { areaFindings, areaOf } from "../src/core/area-registry.js";
import { createBaseline } from "../src/core/baseline.js";
import { startFlow } from "../src/core/state.js";
import type { ProjectConfig } from "../src/core/types.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

async function patchConfig(root: string, mutate: (config: Record<string, unknown>) => void): Promise<void> {
  const file = path.join(root, "sdlc.config.yaml");
  const config = YAML.parse(await readFile(file, "utf8")) as Record<string, unknown>;
  mutate(config);
  await writeFile(file, YAML.stringify(config), "utf8");
}

function config(areas?: string[]): ProjectConfig {
  return {
    schema_version: 1,
    project_id: "fixture",
    research_mode: "public-web-only",
    implementation_sources: [],
    verification: { unit: [], integration: [], system: [] },
    ...(areas ? { areas } : {})
  };
}

describe("area registry", () => {
  it("accepts a registered area list and rejects malformed registries", async () => {
    const root = await tempProject();
    roots.push(root);
    await patchConfig(root, (value) => { value.areas = ["ORDERS", "ORDERS-EU"]; });
    expect((await loadConfig(root)).areas).toEqual(["ORDERS", "ORDERS-EU"]);
    for (const bad of [[], ["orders"], ["ORDERS", "ORDERS"], ["-ORDERS"], ["ORDERS-"], "ORDERS"]) {
      await patchConfig(root, (value) => { value.areas = bad; });
      await expect(loadConfig(root)).rejects.toThrow("areas registry");
    }
    await patchConfig(root, (value) => { delete value.areas; });
    expect((await loadConfig(root)).areas).toBeUndefined();
  });

  it("extracts the longest area segment and exempts non-numbered identities", () => {
    expect(areaOf("subsystem", "SUB-ORDERS-001")).toBe("ORDERS");
    expect(areaOf("subsystem", "SUB-ORDERS-EU-001")).toBe("ORDERS-EU");
    expect(areaOf("unit_test_backend", "UT-CORE-ORDERS-001")).toBe("ORDERS");
    expect(areaOf("unit_test_backend", "UT-API-ORDERS-001")).toBe("ORDERS");
    expect(areaOf("screen", "SCR-LOGIN")).toBeNull();
    expect(areaOf("ideal_customer_profile", "ICP-AGENCY-001")).toBeNull();
    expect(areaOf("test_result", "RESULT-EXEC-001")).toBeNull();
  });

  it("warns per live artifact whose area the registry does not contain", () => {
    const artifacts = [
      artifact({ id: "SUB-ORDERS-001", artifact_type: "subsystem" }),
      artifact({ id: "SUB-BILLING-001", artifact_type: "subsystem" }),
      artifact({ id: "SUB-ORDERS-EU-001", artifact_type: "subsystem" }),
      artifact({ id: "SUB-DRAFT-001", artifact_type: "subsystem", status: "draft" }),
      artifact({ id: "SCR-LOGIN", artifact_type: "screen" })
    ];
    expect(areaFindings(config(), artifacts)).toEqual([]);
    const findings = areaFindings(config(["ORDERS"]), artifacts);
    expect(findings.map((finding) => finding.message.split(" ")[0]).sort()).toEqual(["SUB-BILLING-001", "SUB-ORDERS-EU-001"]);
    expect(findings.every((finding) => finding.severity === "warning" && finding.code === "AREA_UNREGISTERED")).toBe(true);
    expect(areaFindings(config(["ORDERS", "ORDERS-EU", "BILLING"]), artifacts)).toEqual([]);
  });

  it("stays silent when undeclared and never blocks a baseline when declared", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Approval with a partial area registry");
    await addApprovalFeature(root);
    const undeclared = await validateProject(root, await scanArtifacts(root));
    expect(undeclared.findings.some((finding) => finding.code === "AREA_UNREGISTERED")).toBe(false);
    await patchConfig(root, (value) => { value.areas = ["ORDERS"]; });
    const declared = await validateProject(root, await scanArtifacts(root));
    const warnings = declared.findings.filter((finding) => finding.code === "AREA_UNREGISTERED");
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.every((finding) => finding.message.includes("names area APPROVAL"))).toBe(true);
    expect(declared.valid).toBe(true);
    expect((await createBaseline(root)).id).toBe("BL-001");
    await patchConfig(root, (value) => { value.areas = ["ORDERS", "APPROVAL"]; });
    const registered = await validateProject(root, await scanArtifacts(root));
    expect(registered.findings.some((finding) => finding.code === "AREA_UNREGISTERED")).toBe(false);
  });
});
