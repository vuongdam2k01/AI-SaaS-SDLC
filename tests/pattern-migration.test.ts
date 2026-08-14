import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import fg from "fast-glob";
import { cleanup, pluginRoot, repinPatternSnapshot, tempProject } from "./helpers.js";
import { formatMigrationReport, migratePatternCatalog } from "../src/core/pattern-migration.js";
import { verifyPatternSnapshot } from "../src/core/pattern-snapshot.js";
import { loadPatternCatalog } from "../src/core/pattern-catalog.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

const SOURCE_PATTERNS = path.join(pluginRoot, "resources", "artifact-patterns");

/**
 * A repository pinned to an older, narrower contract: the accessibility table
 * the current catalog requires does not exist yet, and one pattern file has
 * since been renamed away.
 */
async function pinOlderCatalog(root: string): Promise<void> {
  const pinned = path.join(root, "00-system", "patterns");
  const catalogFile = path.join(pinned, "catalog.yaml");
  const catalog = (await readFile(catalogFile, "utf8"))
    .replace("version: 5", "version: 4")
    .replace("      - {heading: Accessibility, columns: [Local ID, Requirement, Applies to, Observable evidence, UX rule], min_rows: 1}\n", "")
    .replace("      - {namespace: accessibility, pattern: '\\bAX-[0-9]{2}\\b', minimum: 1}\n", "");
  await writeFile(catalogFile, catalog, "utf8");
  await mkdir(path.join(pinned, "design"), { recursive: true });
  await writeFile(path.join(pinned, "design", "retired-shape.pattern.md"), "# A pattern the plugin no longer ships\n", "utf8");
  await repinPatternSnapshot(root);
}

describe("pinned pattern migration", () => {
  it("re-pins the catalog, reports the contract delta, and removes files the plugin dropped", async () => {
    const root = await tempProject();
    roots.push(root);
    await pinOlderCatalog(root);

    const report = await migratePatternCatalog(root, SOURCE_PATTERNS);
    expect(report.from_version).toBe("4");
    expect(report.to_version).toBe("5");
    expect(report.files_removed).toEqual(["00-system/patterns/design/retired-shape.pattern.md"]);

    const screen = report.patterns.find((entry) => entry.subject === "screen");
    expect(screen?.change).toBe("changed");
    expect(screen?.details).toContain("+ table: Accessibility (min 1)");
    expect(screen?.details).toContain("+ namespace: accessibility (min 1)");

    // The pin now verifies against the files it just received, and the pinned
    // catalog reads back as the plugin's current generation.
    await verifyPatternSnapshot(root, path.join(root, "00-system", "patterns"));
    const pinnedCatalog = await loadPatternCatalog(path.join(root, "00-system", "patterns"), root);
    expect(pinnedCatalog.version).toBe("5");
    expect(await fg("**/retired-shape.pattern.md", { cwd: path.join(root, "00-system", "patterns") })).toEqual([]);
  });

  it("reports without writing under --check", async () => {
    const root = await tempProject();
    roots.push(root);
    await pinOlderCatalog(root);
    const before = await readFile(path.join(root, "00-system", "patterns", "catalog.yaml"), "utf8");

    const report = await migratePatternCatalog(root, SOURCE_PATTERNS, true);
    expect(report.checked_only).toBe(true);
    expect(report.to_version).toBe("5");
    expect(await readFile(path.join(root, "00-system", "patterns", "catalog.yaml"), "utf8")).toBe(before);
    expect(formatMigrationReport(report)).toContain("check only, nothing written");
  });

  it("refuses a pin that was edited in place rather than silently overwriting it", async () => {
    const root = await tempProject();
    roots.push(root);
    // A hand edit without re-pinning: the snapshot no longer matches the files.
    const file = path.join(root, "00-system", "patterns", "design", "screen.pattern.md");
    await writeFile(file, `${await readFile(file, "utf8")}\n<!-- local edit -->\n`, "utf8");
    await expect(migratePatternCatalog(root, SOURCE_PATTERNS)).rejects.toThrow(/snapshot was modified/);
  });

  it("refuses a repository that has no pinned catalog to migrate", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "ai-saas-sdlc-bare-"));
    roots.push(root);
    await expect(migratePatternCatalog(root, SOURCE_PATTERNS)).rejects.toThrow(/no pinned pattern catalog/);
  });

  it("reports no contract change when the pin already matches the plugin", async () => {
    const root = await tempProject();
    roots.push(root);
    const report = await migratePatternCatalog(root, SOURCE_PATTERNS);
    expect(report.patterns).toEqual([]);
    expect(report.foundations).toEqual([]);
    expect(report.system_documents).toEqual([]);
    expect(report.files_removed).toEqual([]);
    const rendered = formatMigrationReport(report);
    expect(rendered).toContain("Scalable patterns: no contract change");
    expect(rendered).toContain("System documents: no contract change");
    expect(rendered).toContain("Accepted decision records and the original idea are exempt");
    // Nothing changed, so the migration must not warn about documents it did
    // not make stale.
    expect(rendered).not.toContain("SYSTEM_DOCUMENT_INCOMPLETE");
  });

  it("warns that migrating a changed system-document contract leaves the documents behind", async () => {
    const root = await tempProject();
    roots.push(root);
    const pinned = path.join(root, "00-system", "patterns");
    const catalogFile = path.join(pinned, "catalog.yaml");
    // A pin that predates the system-document contracts entirely.
    const catalog = (await readFile(catalogFile, "utf8")).replace(/^system_documents:\n(?: {2}- .*\n)+/m, "");
    await writeFile(catalogFile, catalog, "utf8");
    await repinPatternSnapshot(root);

    const report = await migratePatternCatalog(root, SOURCE_PATTERNS, true);
    expect(report.system_documents.map((entry) => [entry.subject, entry.change])).toEqual([
      ["00-system/artifact-lifecycle.md", "added"],
      ["00-system/document-rules.md", "added"],
      ["00-system/glossary.md", "added"],
      ["00-system/validation-rules.md", "added"]
    ]);
    expect(formatMigrationReport(await migratePatternCatalog(root, SOURCE_PATTERNS))).toContain("SYSTEM_DOCUMENT_INCOMPLETE");
  });
});
