import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import fg from "fast-glob";
import { cleanup, tempProject } from "./helpers.js";
import { scanArtifacts } from "../src/core/artifacts.js";
import { validateProject } from "../src/core/validation.js";
import { refreshProject } from "../src/core/project.js";
import { initializeProject } from "../src/core/template.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

describe("project initialization", () => {
  it("creates a structurally valid project and reproducible projections", async () => {
    const root = await tempProject();
    roots.push(root);
    const artifacts = await scanArtifacts(root);
    const report = await validateProject(root, artifacts);
    expect(report.valid).toBe(true);
    expect(artifacts.length).toBeGreaterThanOrEqual(17);
    expect(await refreshProject(root, true)).toEqual([]);
  });

  it("fails instead of overwriting an initialized repository", async () => {
    const root = await tempProject();
    roots.push(root);
    await expect(initializeProject(root, path.join(process.cwd(), "resources", "project-template"), "test-project", "Idea")).rejects.toThrow("already initialized");
  });

  it("refuses to initialize a directory that looks like a code project unless forced", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "code-repo-"));
    roots.push(root);
    await writeFile(path.join(root, "package.json"), "{}\n", "utf8");
    const template = path.join(process.cwd(), "resources", "project-template");
    await expect(initializeProject(root, template, "test-project", "Idea")).rejects.toThrow("marks this directory as a code project");
    await initializeProject(root, template, "test-project", "Idea", undefined, { force: true });
    expect(await readFile(path.join(root, "sdlc.config.yaml"), "utf8")).toContain("test-project");
  });

  it("produces byte-identical projects for the same input", async () => {
    const first = await tempProject("same-project", "Same idea");
    const second = await tempProject("same-project", "Same idea");
    roots.push(first, second);
    const files = await fg(["**/*", ".ai-saas-sdlc/**/*"], { cwd: first, onlyFiles: true, dot: true });
    for (const relative of files) {
      expect(await readFile(path.join(first, relative), "utf8"), relative).toBe(await readFile(path.join(second, relative), "utf8"));
    }
  });

  it("preserves the supplied raw idea without trimming or rewriting it", async () => {
    const idea = "  Leading space\nSecond line with {{PROJECT_ID}}\nTrailing space  ";
    const root = await tempProject("verbatim-project", idea);
    roots.push(root);
    const original = await readFile(path.join(root, "01-discovery/original-idea.md"), "utf8");
    expect(original).toContain(`\n${idea}\n`);
  });

  it("detects and removes unexpected generated projections", async () => {
    const root = await tempProject();
    roots.push(root);
    const unexpected = path.join(root, "generated", "unexpected.md");
    await writeFile(unexpected, "manual projection\n", "utf8");
    expect(await refreshProject(root, true)).toContain("unexpected:unexpected.md");
    await refreshProject(root, false);
    await expect(readFile(unexpected, "utf8")).rejects.toThrow();
    expect(await refreshProject(root, true)).toEqual([]);
  });

  it("detects a broken dependency", async () => {
    const root = await tempProject();
    roots.push(root);
    const file = path.join(root, "02-product", "features", "FTR-X-001.md");
    await writeFile(file, "---\nid: FTR-X-001\nartifact_type: feature\ntitle: Broken\nstatus: active\ncreated_by_change: CHG-001\ndepends_on: [MISSING]\ndecisions: []\nsupersedes:\n---\n# Broken\n", "utf8");
    const report = await validateProject(root, await scanArtifacts(root));
    expect(report.findings.some((item) => item.code === "REFERENCE_BROKEN")).toBe(true);
  });

  it("requires scalable artifact filenames to match their permanent IDs", async () => {
    const root = await tempProject();
    roots.push(root);
    const file = path.join(root, "02-product", "features", "FTR-FILE-001.md");
    await writeFile(file, "---\nid: FTR-DIFFERENT-001\nartifact_type: feature\ntitle: Mismatch\nstatus: active\ncreated_by_change: CHG-001\ndepends_on: [PRODUCT-REQUIREMENTS]\ndecisions: []\nsupersedes:\n---\n# Mismatch\n", "utf8");
    const report = await validateProject(root, await scanArtifacts(root));
    expect(report.findings.some((item) => item.code === "ARTIFACT_FILENAME_MISMATCH")).toBe(true);
  });

  it("reports frontmatter schema errors instead of silently coercing them", async () => {
    const root = await tempProject();
    roots.push(root);
    const file = path.join(root, "02-product", "features", "FTR-X-002.md");
    await writeFile(file, "---\nid: FTR-X-002\nartifact_type: feature\ntitle: Invalid arrays\nstatus: active\ncreated_by_change: CHG-001\ndepends_on: PRODUCT-REQUIREMENTS\ndecisions: []\nsupersedes:\n---\n# Invalid\n", "utf8");
    const report = await validateProject(root, await scanArtifacts(root));
    expect(report.findings.some((item) => item.code === "FRONTMATTER_SCHEMA" && item.file === "02-product/features/FTR-X-002.md")).toBe(true);
  });

  it("rejects self-referential and cyclic supersession", async () => {
    const root = await tempProject();
    roots.push(root);
    const directory = path.join(root, "05-control", "decisions");
    const adr = (id: string, supersedes: string) => `---\nid: ${id}\nartifact_type: architectural_decision\ntitle: ${id}\nstatus: active\nadr_status: proposed\ncreated_by_change: GENESIS\ndepends_on: []\ndecisions: []\nsupersedes: ${supersedes}\n---\n# ${id}\n`;
    await writeFile(path.join(directory, "ADR-SELF-001.md"), adr("ADR-SELF-001", "ADR-SELF-001"), "utf8");
    await writeFile(path.join(directory, "ADR-CYCLE-001.md"), adr("ADR-CYCLE-001", "ADR-CYCLE-002"), "utf8");
    await writeFile(path.join(directory, "ADR-CYCLE-002.md"), adr("ADR-CYCLE-002", "ADR-CYCLE-001"), "utf8");
    const report = await validateProject(root, await scanArtifacts(root));
    expect(report.findings.some((item) => item.code === "SUPERSEDES_SELF")).toBe(true);
    expect(report.findings.some((item) => item.code === "SUPERSEDES_CYCLE")).toBe(true);
  });

  it("refuses initialization through a symlinked destination directory", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "ai-saas-root-"));
    const external = await mkdtemp(path.join(os.tmpdir(), "ai-saas-external-"));
    roots.push(root, external);
    await mkdir(root, { recursive: true });
    await symlink(external, path.join(root, "01-discovery"), process.platform === "win32" ? "junction" : "dir");
    await expect(initializeProject(root, path.join(process.cwd(), "resources", "project-template"), "safe-project", "Idea")).rejects.toThrow("symlinked destination");
  });
});
