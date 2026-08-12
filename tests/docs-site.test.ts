import { afterEach, describe, expect, it } from "vitest";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cleanup, establishGenesis, tempProject } from "./helpers.js";
import { addApprovalFeature } from "./fixtures/complete-saas/fixture.js";
import { startFlow } from "../src/core/state.js";
import { refreshProject } from "../src/core/project.js";
import {
  buildDocsSite,
  buildIdMatcher,
  highlightSource,
  linkifyIds,
  prepareMarkdownBody,
  routeFor,
  sourceLanguage,
  stripLeadingHeading
} from "../src/core/docs-site.js";
import { pathExists } from "../src/core/state.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

async function projectWithFeature(): Promise<string> {
  const root = await tempProject();
  roots.push(root);
  await establishGenesis(root);
  await startFlow(root, "evolution", "Add approval behavior");
  await addApprovalFeature(root);
  await refreshProject(root, false);
  return root;
}

describe("docs site rendering primitives", () => {
  it("strips authoring comments and keeps placeholders visible outside code", () => {
    const prepared = prepareMarkdownBody("Before <!-- guidance --> after\n\n- Field: <precise meaning>\n\n```md\n<kept-in-code>\n```\n");
    expect(prepared).not.toContain("guidance");
    expect(prepared).toContain("Before  after");
    expect(prepared).toContain("&lt;precise meaning>");
    expect(prepared).toContain("<kept-in-code>");
  });

  it("drops a multi-line comment without touching following lines", () => {
    const prepared = prepareMarkdownBody("<!-- Contract: spans\nmultiple lines -->\nReal content\n");
    expect(prepared).not.toContain("Contract");
    expect(prepared).toContain("Real content");
  });

  it("removes only the leading duplicate heading", () => {
    expect(stripLeadingHeading("# FTR-X — Title\n\n## Purpose\n")).not.toContain("# FTR-X");
    expect(stripLeadingHeading("# FTR-X — Title\n\n## Purpose\n")).toContain("## Purpose");
    expect(stripLeadingHeading("No heading\n")).toBe("No heading\n");
  });

  it("links bare IDs and fragments but never inside anchors or page titles", () => {
    const routes = new Map([["FTR-A", "02-product/features/FTR-A.html"], ["ENT-B", "03-design/data/ENT-B.html"]]);
    const matcher = buildIdMatcher([...routes.keys()]);
    const html = "<h1>FTR-A — Title</h1><p>See ENT-B and ENT-B#A-01.</p><p><a href=\"x\">ENT-B</a></p><pre>ENT-B</pre>";
    const result = linkifyIds(html, matcher, routes, "02-product/features/FTR-A.html");
    expect(result.html).toContain("<h1>FTR-A — Title</h1>");
    expect(result.html).toContain("href=\"../../03-design/data/ENT-B.html\">ENT-B</a>");
    expect(result.html).toContain("href=\"../../03-design/data/ENT-B.html#local-A-01\">ENT-B#A-01</a>");
    expect(result.html).toContain("<a href=\"x\">ENT-B</a>");
    expect(result.html).toContain("<pre>ENT-B</pre>");
    expect(result.linked).toBe(2);
  });

  it("maps repository paths to stable routes", () => {
    expect(routeFor("02-product/features/FTR-A.md")).toBe("02-product/features/FTR-A.html");
    expect(routeFor("03-design/data/schema.dbml")).toBe("03-design/data/schema.dbml.html");
  });

  it("renders source with line numbers, wrapping structure and tokens", () => {
    expect(sourceLanguage("sdlc.config.yaml")).toBe("yaml");
    expect(sourceLanguage("03-design/data/schema.dbml")).toBe("dbml");
    const yaml = highlightSource("project_id: demo # note\ncount: 3\n", "yaml");
    expect(yaml).toContain('id="L1"');
    expect(yaml).toContain('<span class="tok-key">project_id</span>');
    expect(yaml).toContain('<span class="tok-cmt"># note</span>');
    expect(yaml).toContain('<span class="tok-num">3</span>');
    // Multi-line guidance comments in markdown stay muted to the closing marker.
    const md = highlightSource("<!-- spans\nlines -->\n# Heading\n", "markdown");
    expect(md).toContain('<span class="tok-cmt">lines --&gt;</span>');
    expect(md).toContain('<span class="tok-kw"># Heading</span>');
    // Content is escaped, never emitted raw.
    expect(highlightSource("value: <script>x</script>\n", "yaml")).not.toContain("<script>");
  });
});

describe("docs build", () => {
  it("builds a navigable read-only site from an initialized repository", async () => {
    const root = await projectWithFeature();
    const fakeMermaid = path.join(root, ".ai-saas-sdlc", "cache", "fake-mermaid.js");
    await mkdir(path.dirname(fakeMermaid), { recursive: true });
    await writeFile(fakeMermaid, "window.mermaid = {};", "utf8");
    const result = await buildDocsSite(root, { mermaidAsset: fakeMermaid });

    expect(result.out).toBe(path.join(root, ".ai-saas-sdlc", "cache", "site"));
    expect(result.artifact_pages).toBeGreaterThan(0);
    expect(result.linked_ids).toBeGreaterThan(0);
    for (const file of ["index.html", "graph.html", "assets/site.css", "assets/site.js", ".docs-site-manifest.json"]) {
      expect(await pathExists(path.join(result.out, file)), file).toBe(true);
    }

    const featurePage = await readFile(path.join(result.out, "02-product", "features", "FTR-APPROVAL-001.html"), "utf8");
    // Upstream dependencies resolve to hyperlinks; local table rows are addressable.
    expect(featurePage).toContain("class=\"id-link\"");
    expect(featurePage).toContain("product-requirements.html");
    expect(featurePage).toContain("id=\"local-BH-01\"");
    // The metadata panel exposes reverse traceability without editing content.
    expect(featurePage).toContain("Depended on by");

    const index = await readFile(path.join(result.out, "index.html"), "utf8");
    expect(index).toContain("Dependency graph");
    const graph = await readFile(path.join(result.out, "graph.html"), "utf8");
    expect(graph).toContain("<svg id=\"graph\"");
    expect(graph).toContain("edge-depends_on");

    // The vendored mermaid asset ships with the site and the .mmd contract
    // page renders the diagram with its source collapsed underneath.
    expect(await pathExists(path.join(result.out, "assets", "mermaid.min.js")), "mermaid asset").toBe(true);
    const transitions = await readFile(path.join(result.out, "03-design", "screen-transitions.mmd.html"), "utf8");
    expect(transitions).toContain("class=\"mermaid\"");
    expect(transitions).toContain("assets/mermaid.min.js");
    expect(transitions).toContain("source-details");

    const gitignore = await readFile(path.join(root, ".ai-saas-sdlc", "cache", ".gitignore"), "utf8");
    expect(gitignore.trim()).toBe("*");
  });

  it("rebuilds over its own output and drops stale pages", async () => {
    const root = await projectWithFeature();
    const first = await buildDocsSite(root);
    const stale = path.join(first.out, "02-product", "features", "FTR-STALE-999.html");
    await mkdir(path.dirname(stale), { recursive: true });
    await writeFile(stale, "stale", "utf8");
    const manifestPath = path.join(first.out, ".docs-site-manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { files: string[] };
    manifest.files.push("02-product/features/FTR-STALE-999.html");
    await writeFile(manifestPath, JSON.stringify(manifest), "utf8");

    await buildDocsSite(root);
    expect(await pathExists(stale)).toBe(false);
  });

  it("refuses to overwrite a directory it did not produce", async () => {
    const root = await projectWithFeature();
    const out = path.join(root, ".ai-saas-sdlc", "cache", "not-a-site");
    await mkdir(out, { recursive: true });
    await writeFile(path.join(out, "keep.txt"), "user data", "utf8");
    await expect(buildDocsSite(root, { out })).rejects.toThrow(/not empty/);
  });

  it("refuses managed content directories as output", async () => {
    const root = await projectWithFeature();
    await expect(buildDocsSite(root, { out: "generated/site" })).rejects.toThrow(/managed content/);
    await expect(buildDocsSite(root, { out: "02-product/site" })).rejects.toThrow(/managed content/);
  });

  it("reports an uninitialized directory instead of a raw ENOENT", async () => {
    const root = await tempProject();
    roots.push(root);
    const empty = path.join(root, ".ai-saas-sdlc", "cache", "empty-root");
    await mkdir(empty, { recursive: true });
    await expect(buildDocsSite(empty)).rejects.toThrow(/Not an initialized documentation repository/);
  });
});
