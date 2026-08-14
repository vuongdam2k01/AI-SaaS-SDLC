import { afterEach, describe, expect, it } from "vitest";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { cleanup, establishGenesis, tempProject } from "./helpers.js";
import { scanArtifacts } from "../src/core/artifacts.js";
import { validateProject } from "../src/core/validation.js";
import { systemDocumentFindings } from "../src/core/system-documents.js";
import { loadPatternCatalog } from "../src/core/pattern-catalog.js";
import { pluginRoot } from "./helpers.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

const DOCUMENTS = [
  "00-system/document-rules.md",
  "00-system/artifact-lifecycle.md",
  "00-system/glossary.md",
  "00-system/validation-rules.md"
];

describe("system document contracts", () => {
  it("declares a contract for every 00-system document, confined to that directory", async () => {
    const catalog = await loadPatternCatalog(path.join(pluginRoot, "resources", "artifact-patterns"));
    expect(catalog.system_documents.map((document) => document.path)).toEqual([...DOCUMENTS].sort());
    for (const document of catalog.system_documents) {
      expect(document.path.startsWith("00-system/")).toBe(true);
      expect(document.path.startsWith("00-system/patterns/")).toBe(false);
      expect(document.content.required_headings.length).toBeGreaterThan(0);
    }
  });

  it("passes on the documents the template actually ships", async () => {
    const root = await tempProject();
    roots.push(root);
    expect(await systemDocumentFindings(root)).toEqual([]);
  });

  it("reports a gutted rule section without blocking a baseline", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    const file = path.join(root, "00-system", "document-rules.md");
    const source = await readFile(file, "utf8");
    // Replace the identified content rules with a heading and nothing else —
    // the state that previously read as a completely valid repository.
    await writeFile(file, source.replace(/## Content rules[\s\S]*?\n## Cross-reference rules/, "## Content rules\n\n## Cross-reference rules"), "utf8");

    const findings = await systemDocumentFindings(root);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((finding) => finding.severity === "warning" && finding.code === "SYSTEM_DOCUMENT_INCOMPLETE")).toBe(true);
    expect(findings.every((finding) => finding.file === "00-system/document-rules.md")).toBe(true);
    expect(findings.some((finding) => finding.message.includes("Content rules"))).toBe(true);

    // `valid` staying true is precisely what "never blocks a baseline" means:
    // baseline creation gates on the absence of errors, nothing else.
    const report = await validateProject(root, await scanArtifacts(root));
    expect(report.findings.some((finding) => finding.code === "SYSTEM_DOCUMENT_INCOMPLETE")).toBe(true);
    expect(report.valid).toBe(true);
  });

  it("reports a missing document rather than passing silently", async () => {
    const root = await tempProject();
    roots.push(root);
    await rm(path.join(root, "00-system", "glossary.md"));
    const findings = await systemDocumentFindings(root);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ code: "SYSTEM_DOCUMENT_INCOMPLETE", file: "00-system/glossary.md" });
    expect(findings[0]?.message).toContain("restore it from the project template");
  });

  it("reports the loss of the citable rule IDs a review depends on", async () => {
    const root = await tempProject();
    roots.push(root);
    const file = path.join(root, "00-system", "glossary.md");
    const source = await readFile(file, "utf8");
    await writeFile(file, source.replaceAll(/\bNR-0[0-9]\b/g, "—"), "utf8");
    const findings = await systemDocumentFindings(root);
    expect(findings.some((finding) => finding.message.includes("naming_rule ID"))).toBe(true);
  });

  it("keeps the documents out of the artifact graph and every projection", async () => {
    const root = await tempProject();
    roots.push(root);
    const artifacts = await scanArtifacts(root);
    expect(artifacts.some((artifact) => artifact.file.startsWith("00-system/"))).toBe(false);
    const index = await readFile(path.join(root, "generated", "artifact-index.md"), "utf8");
    for (const document of DOCUMENTS) expect(index).not.toContain(document);
  });
});
