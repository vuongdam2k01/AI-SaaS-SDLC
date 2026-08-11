import { afterEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { cleanup, establishGenesis, repinPatternSnapshot, tempProject } from "./helpers.js";
import { scanArtifacts } from "../src/core/artifacts.js";
import { validateProject } from "../src/core/validation.js";
import { buildProjections } from "../src/core/projections.js";
import { buildGraph } from "../src/core/graph.js";
import { calculateImpact } from "../src/core/impact.js";
import { ruleCoverageEntries } from "../src/core/coverage-derivation.js";
import { gitCommit } from "../src/core/git.js";
import { startFlow } from "../src/core/state.js";
import { executeVerification } from "../src/core/verification.js";
import { loadConfig } from "../src/core/config.js";
import { addApprovalFeature, materializePatternArtifact } from "./fixtures/complete-saas/fixture.js";
import { buildEnginePointer, ensureEnginePointerIgnored, recordEnginePointer } from "../src/core/engine-pointer.js";
import { createArtifactFromPattern } from "../src/core/artifact-instantiation.js";
import { resolveCatalog } from "../src/core/pattern-catalog.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

async function projections(root: string) {
  const artifacts = await scanArtifacts(root);
  const graph = buildGraph(artifacts);
  return buildProjections(artifacts, graph, calculateImpact(artifacts, graph, null), null, null);
}

describe("release hardening", () => {
  it("reports a declared business rule that no specification claims", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Add approval behavior");
    await materializePatternArtifact(root, {
      type: "feature", id: "FTR-APPROVAL-001", title: "Decide an approval request",
      dependsOn: ["PRODUCT-REQUIREMENTS", "ACCESS-CONTROL", "SYSTEM-INVARIANTS"]
    });

    const artifacts = await scanArtifacts(root);
    const entries = ruleCoverageEntries(artifacts);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((entry) => entry.covered)).toBe(false);

    const report = await validateProject(root, artifacts);
    const unverified = report.findings.filter((item) => item.code === "RULE_UNVERIFIED");
    expect(unverified.length).toBeGreaterThan(0);
    // Visible, never blocking: which level holds a rule stays a derivation
    // judgement, so this must not fail a baseline on its own.
    expect(unverified.every((item) => item.severity === "warning")).toBe(true);
    expect(report.findings.some((item) => item.severity === "error")).toBe(false);

    const projected = await projections(root);
    expect(projected["rule-coverage.md"]).toContain("unverified");
  });

  it("counts a rule as covered once a specification claims it", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Add approval behavior");
    await addApprovalFeature(root);

    const before = ruleCoverageEntries(await scanArtifacts(root));
    const target = before.find((entry) => !entry.covered);
    if (!target) return;

    const specFile = path.join(root, "04-verification", "integration-tests", "IT-APPROVAL-001.md");
    const spec = await readFile(specFile, "utf8");
    await writeFile(specFile, `${spec}\n\nClaims ${target.rule}.\n`, "utf8");

    const after = ruleCoverageEntries(await scanArtifacts(root));
    const updated = after.find((entry) => entry.rule === target.rule);
    expect(updated?.covered).toBe(true);
    expect(updated?.integration).toContain("IT-APPROVAL-001");
  });

  it("marks a superseded decision as no longer in force without editing it", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Add approval behavior");
    await materializePatternArtifact(root, {
      type: "architectural_decision", id: "ADR-APPROVAL-001", title: "Append-only decision record",
      dependsOn: ["ARCHITECTURE-OVERVIEW"], adrStatus: "accepted"
    });
    const originalFile = path.join(root, "05-control", "decisions", "ADR-APPROVAL-001.md");
    const original = await readFile(originalFile, "utf8");

    await materializePatternArtifact(root, {
      type: "architectural_decision", id: "ADR-APPROVAL-002", title: "Append-only chain with acknowledgment",
      dependsOn: ["ARCHITECTURE-OVERVIEW"], adrStatus: "accepted", supersedes: "ADR-APPROVAL-001"
    });

    const index = (await projections(root))["decision-index.md"]!;
    // Match on the leading ID cell: the superseded row also names its successor
    // in the last column, so a substring search would find the wrong row.
    const rows = index.split("\n").filter((line) => line.startsWith("| `ADR-APPROVAL-"));
    const superseded = rows.find((line) => line.startsWith("| `ADR-APPROVAL-001`"))!;
    const successor = rows.find((line) => line.startsWith("| `ADR-APPROVAL-002`"))!;

    expect(index).toContain("Superseded by");
    expect(superseded).toContain("| no |");
    expect(superseded).toContain("`ADR-APPROVAL-002`");
    expect(successor).toContain("| yes |");
    // The accepted original stays immutable; only the derived view changes.
    expect(await readFile(originalFile, "utf8")).toBe(original);
  });

  it("marks a commit as dirty when the recorded tree carries uncommitted work", async () => {
    const root = await tempProject();
    roots.push(root);
    const run = (args: string[]) => execFileSync("git", args, { cwd: root, stdio: "ignore" });
    run(["init", "-b", "main"]);
    run(["config", "user.email", "engine@example.test"]);
    run(["config", "user.name", "engine"]);
    await writeFile(path.join(root, "tracked.txt"), "one\n", "utf8");
    run(["add", "-A"]);
    run(["commit", "-m", "initial"]);

    const clean = gitCommit(root);
    expect(clean).toMatch(/^[0-9a-f]{40}$/);

    await writeFile(path.join(root, "tracked.txt"), "two\n", "utf8");
    const dirty = gitCommit(root);
    expect(dirty).toBe(`${clean}+dirty`);
  });

  it("reuses an execution when the same command reruns over an unchanged source", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Add approval behavior");

    // A separate source directory, as real projects configure. Pointing cwd at
    // the documentation root would defeat the check by construction: the engine
    // writes its own execution records there, so the snapshot changes every run.
    await mkdir(path.join(root, "impl"), { recursive: true });
    await writeFile(path.join(root, "impl", "index.js"), "export const ok = true;\n", "utf8");

    const configFile = path.join(root, "sdlc.config.yaml");
    const config = YAML.parse(await readFile(configFile, "utf8"));
    config.implementation_sources = [{ id: "impl", path: "./impl" }];
    config.verification.unit = [{ id: "unit-fixture", cwd: "./impl", command: `node -e "process.exit(0)"` }];
    await writeFile(configFile, YAML.stringify(config), "utf8");

    const first = await executeVerification(root, await loadConfig(root), ["unit"]);
    expect(first).toHaveLength(1);

    // Nothing about the source changed, so a second run cannot observe anything
    // the first did not: the existing record is returned rather than a new one.
    const second = await executeVerification(root, await loadConfig(root), ["unit"]);
    expect(second).toHaveLength(1);
    expect(second[0]!.id).toBe(first[0]!.id);

    const recorded = (await readdir(path.join(root, ".ai-saas-sdlc", "executions"))).filter((name) => name.endsWith(".json"));
    expect(recorded).toHaveLength(1);

    // A changed command is a different observation and must run.
    config.verification.unit = [{ id: "unit-fixture", cwd: "./impl", command: `node -e "process.exit(1)"` }];
    await writeFile(configFile, YAML.stringify(config), "utf8");
    const third = await executeVerification(root, await loadConfig(root), ["unit"]);
    expect(third[0]!.id).not.toBe(first[0]!.id);
    expect(third[0]!.exit_code).toBe(1);
  });

  it("reads an artifact that a Windows editor saved with a byte order mark", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);

    const target = path.join(root, "01-discovery", "market-landscape.md");
    const original = await readFile(target, "utf8");
    await writeFile(target, `\uFEFF${original}`, "utf8");

    const artifacts = await scanArtifacts(root);
    const landscape = artifacts.find((artifact) => artifact.artifact_type === "market_landscape");
    expect(landscape).toBeDefined();
    expect(landscape!.id).toBe("MARKET-LANDSCAPE");
    expect(landscape!.metadata_issues).toEqual([]);

    const report = await validateProject(root, artifacts);
    expect(report.findings.some((item) => item.message.includes("Missing YAML frontmatter"))).toBe(false);
  });

  it("instantiates a pattern that a Windows clone checked out with CRLF", async () => {
    // A clone with core.autocrlf=true delivers pattern templates as CRLF. The
    // invariant: whatever the checkout did to line endings, instantiation
    // produces an LF artifact with intact frontmatter. Held before this release
    // too — pinned here because the neighbouring CI failure came from exactly
    // this shape of mistake, made in the test fixtures rather than the engine.
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);

    const pattern = path.join(root, "00-system", "patterns", "product", "feature.pattern.md");
    const source = await readFile(pattern, "utf8");
    expect(source).not.toContain("\r\n");
    await writeFile(pattern, source.replace(/\n/g, "\r\n"), "utf8");
    // The pinned snapshot is hash-verified, so re-pin it exactly as a fresh
    // checkout would have produced it.
    await repinPatternSnapshot(root);

    await startFlow(root, "evolution", "Add approval behavior");
    const created = await createArtifactFromPattern(root, await resolveCatalog(root, process.cwd()), "feature", "FTR-CRLF-001", "Checked out with CRLF");
    const written = await readFile(path.join(root, created.file), "utf8");
    expect(written).not.toContain("\r\n");
    expect(written.startsWith("---\nid: FTR-CRLF-001\n")).toBe(true);

    const artifact = (await scanArtifacts(root)).find((item) => item.id === "FTR-CRLF-001");
    expect(artifact).toBeDefined();
    expect(artifact!.metadata_issues).toEqual([]);
    expect(artifact!.artifact_type).toBe("feature");
  });

  it("records a runnable editorial command and keeps it out of shared history", async () => {
    const root = await tempProject();
    roots.push(root);
    const runtimeRoot = path.resolve("some", "installed", "plugin");

    const pointer = buildEnginePointer(runtimeRoot, "1.0.0");
    expect(pointer.editorial_command).toContain("refresh --editorial");
    expect(pointer.editorial_command).toContain("bin/ai-saas-sdlc");
    expect(pointer.editorial_command).not.toContain("\\");

    await writeFile(path.join(root, ".gitignore"), "existing-entry\n", "utf8");
    await recordEnginePointer(root, runtimeRoot, "1.0.0");
    await ensureEnginePointerIgnored(root);
    await ensureEnginePointerIgnored(root);

    const written = JSON.parse(await readFile(path.join(root, ".ai-saas-sdlc", "engine.json"), "utf8"));
    expect(written).toEqual(pointer);

    const ignore = await readFile(path.join(root, ".gitignore"), "utf8");
    expect(ignore).toContain("existing-entry");
    // Idempotent: a second call must not append the entry twice.
    expect(ignore.split(/\r?\n/).filter((line) => line.trim() === ".ai-saas-sdlc/engine.json")).toHaveLength(1);
  });
});
