import path from "node:path";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import fg from "fast-glob";
import YAML from "yaml";
import { marked } from "marked";
import type { Artifact, ArtifactGraph } from "./types.js";
import { scanArtifacts } from "./artifacts.js";
import { buildGraph } from "./graph.js";
import { parseFrontmatter, toArtifactMeta } from "./frontmatter.js";
import { pathExists } from "./state.js";
import { projectPaths } from "./paths.js";
import { isWithin } from "./paths.js";
import { SdlcError } from "./errors.js";
import { toPosix } from "./utils.js";

// The docs site is a generated read-only projection of the documentation
// repository. It never becomes normative authority, never mutates content and
// never participates in flow or gate decisions. Everything it shows is derived
// from the same scan the engine already trusts.

export interface DocsSiteOptions {
  out?: string | undefined;
  /** Absolute path to a vendored mermaid.min.js; when present, .mmd contracts and mermaid fences render as diagrams. */
  mermaidAsset?: string | undefined;
}

export interface DocsSiteResult {
  out: string;
  pages: number;
  artifact_pages: number;
  report_pages: number;
  linked_ids: number;
}

type PageKind = "artifact" | "system" | "report" | "source";

interface SitePage {
  route: string;
  sourceFile: string;
  title: string;
  kind: PageKind;
  markdown?: string | undefined;
  raw?: string | undefined;
  artifact?: Artifact | undefined;
}

const MANIFEST_FILE = ".docs-site-manifest.json";
const LOCAL_ID_PATTERN = /^[A-Z]{1,6}-[0-9]{2,3}$/;

export function routeFor(file: string): string {
  const posix = toPosix(file);
  return posix.endsWith(".md") ? `${posix.slice(0, -3)}.html` : `${posix}.html`;
}

function relativeHref(fromRoute: string, toRoute: string): string {
  const fromDir = path.posix.dirname(fromRoute);
  const relative = path.posix.relative(fromDir === "." ? "" : fromDir, toRoute);
  return relative === "" ? path.posix.basename(toRoute) : relative;
}

export function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Guidance lives in HTML comments and is meant for authors, not readers, so
// the reader view drops it. Angle-bracket placeholders in draft or pattern
// text would otherwise be parsed as raw HTML and vanish silently, so every
// remaining "<" outside code becomes a visible literal.
export function prepareMarkdownBody(body: string): string {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const output: string[] = [];
  let inFence = false;
  let inComment = false;
  for (const line of lines) {
    if (!inComment && /^(```|~~~)/.test(line.trim())) {
      inFence = !inFence;
      output.push(line);
      continue;
    }
    if (inFence) {
      output.push(line);
      continue;
    }
    let text = line;
    if (inComment) {
      const end = text.indexOf("-->");
      if (end < 0) continue;
      text = text.slice(end + 3);
      inComment = false;
    }
    let stripped = "";
    let cursor = 0;
    while (cursor < text.length) {
      const start = text.indexOf("<!--", cursor);
      if (start < 0) {
        stripped += text.slice(cursor);
        break;
      }
      stripped += text.slice(cursor, start);
      const end = text.indexOf("-->", start + 4);
      if (end < 0) {
        inComment = true;
        cursor = text.length;
        break;
      }
      cursor = end + 3;
    }
    output.push(escapeAnglesOutsideCode(stripped));
  }
  return output.join("\n");
}

function escapeAnglesOutsideCode(line: string): string {
  const segments = line.split(/(`+[^`]*`+)/);
  return segments
    .map((segment, index) => (index % 2 === 1 ? segment : segment.replaceAll("<", "&lt;")))
    .join("");
}

export function renderMarkdown(body: string): string {
  return marked.parse(prepareMarkdownBody(body), { async: false, gfm: true });
}

// Every artifact opens with "# <ID> — <title>", which the page header already
// shows; keeping both would print the title twice on every page.
export function stripLeadingHeading(body: string): string {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const index = lines.findIndex((line) => line.trim() !== "");
  if (index >= 0 && lines[index]?.startsWith("# ")) lines.splice(index, 1);
  return lines.join("\n");
}

function addHeadingAnchors(html: string): string {
  const used = new Set<string>();
  return html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (match, level: string, inner: string) => {
    const slug = slugify(inner.replace(/<[^>]*>/g, ""));
    if (!slug || used.has(slug)) return match;
    used.add(slug);
    return `<h${level} id="${slug}">${inner}</h${level}>`;
  });
}

// A table row whose first cell is a stable local ID becomes addressable so
// that cross-references such as FTR-X#BH-01 land on the exact record.
function addRowAnchors(html: string): string {
  const used = new Set<string>();
  return html.replace(/<tr>\s*<td>((?:<code>)?)([A-Z]{1,6}-[0-9]{2,3})((?:<\/code>)?)<\/td>/g, (match, open: string, id: string, close: string) => {
    if (!LOCAL_ID_PATTERN.test(id) || used.has(id)) return match;
    used.add(id);
    return `<tr id="local-${id}"><td>${open}${id}${close}</td>`;
  });
}

export function buildIdMatcher(ids: string[]): RegExp | null {
  if (ids.length === 0) return null;
  const alternation = [...ids].sort((a, b) => b.length - a.length).join("|");
  return new RegExp(`(?<![A-Z0-9-])(${alternation})(#[A-Z0-9-]+)?(?![A-Z0-9-])`, "g");
}

const SKIP_TAGS = new Set(["a", "h1", "pre", "script", "style", "svg"]);

// Bare artifact IDs become hyperlinks wherever they appear in rendered prose
// or table cells. Segments inside anchors, page titles and source views stay
// untouched; the resolver never rewrites the underlying Markdown.
export function linkifyIds(html: string, matcher: RegExp | null, idRoutes: Map<string, string>, currentRoute: string): { html: string; linked: number } {
  if (!matcher) return { html, linked: 0 };
  const parts = html.split(/(<[^>]*>)/);
  const skipDepth = new Map<string, number>();
  let linked = 0;
  const output = parts.map((part) => {
    if (part.startsWith("<")) {
      const tag = /^<\/?([a-zA-Z0-9]+)/.exec(part)?.[1]?.toLowerCase();
      if (tag && SKIP_TAGS.has(tag) && !part.endsWith("/>")) {
        skipDepth.set(tag, Math.max(0, (skipDepth.get(tag) ?? 0) + (part.startsWith("</") ? -1 : 1)));
      }
      return part;
    }
    if ([...skipDepth.values()].some((depth) => depth > 0)) return part;
    return part.replace(matcher, (match, id: string, fragment: string | undefined) => {
      const target = idRoutes.get(id);
      if (!target) return match;
      const anchor = fragment ? `#local-${fragment.slice(1)}` : "";
      if (target === currentRoute && !anchor) return match;
      linked += 1;
      const href = target === currentRoute ? anchor : `${relativeHref(currentRoute, target)}${anchor}`;
      return `<a class="id-link" href="${href}">${match}</a>`;
    });
  });
  return { html: output.join(""), linked };
}

function statusClass(status: string): string {
  if (status === "active") return "status-active";
  if (status === "draft") return "status-draft";
  if (status === "superseded" || status === "retired") return "status-superseded";
  return "status-other";
}

function badge(status: string): string {
  return `<span class="badge ${statusClass(status)}">${escapeHtml(status)}</span>`;
}

function linkChips(ids: string[], idRoutes: Map<string, string>, currentRoute: string): string {
  if (ids.length === 0) return "<span class=\"muted\">none</span>";
  return ids.map((id) => {
    const target = idRoutes.get(id);
    if (!target) return `<code>${escapeHtml(id)}</code>`;
    return `<a class="chip" href="${relativeHref(currentRoute, target)}">${escapeHtml(id)}</a>`;
  }).join(" ");
}

interface Backlinks {
  depended_on_by: string[];
  decision_of: string[];
  written_by: string[];
  superseded_by: string[];
}

function collectBacklinks(graph: ArtifactGraph): Map<string, Backlinks> {
  const map = new Map<string, Backlinks>();
  const entry = (id: string): Backlinks => {
    const existing = map.get(id);
    if (existing) return existing;
    const created: Backlinks = { depended_on_by: [], decision_of: [], written_by: [], superseded_by: [] };
    map.set(id, created);
    return created;
  };
  for (const edge of graph.edges) {
    if (edge.relation === "depends_on") entry(edge.to).depended_on_by.push(edge.from);
    else if (edge.relation === "decision") entry(edge.to).decision_of.push(edge.from);
    else if (edge.relation === "writes_to") entry(edge.to).written_by.push(edge.from);
    else entry(edge.to).superseded_by.push(edge.from);
  }
  return map;
}

export function layerOf(file: string): number {
  const match = /^0([0-5])-/.exec(toPosix(file));
  if (match) return Number(match[1]);
  return 0;
}

const LAYER_LABELS = ["00 · System", "01 · Discovery", "02 · Product", "03 · Design", "04 · Verification", "05 · Control"];

function metadataPanel(artifact: Artifact, backlinks: Backlinks | undefined, idRoutes: Map<string, string>, route: string): string {
  const rows: string[] = [];
  const chip = (ids: string[]) => linkChips(ids, idRoutes, route);
  rows.push(`<div class="meta-row"><span class="meta-label">Type</span><code>${escapeHtml(artifact.artifact_type)}</code></div>`);
  rows.push(`<div class="meta-row"><span class="meta-label">Status</span>${badge(artifact.status)}</div>`);
  rows.push(`<div class="meta-row"><span class="meta-label">Created by</span><code>${escapeHtml(artifact.created_by_change)}</code></div>`);
  rows.push(`<div class="meta-row"><span class="meta-label">Source</span><code>${escapeHtml(artifact.file)}</code></div>`);
  rows.push(`<div class="meta-row"><span class="meta-label">Depends on</span>${chip(artifact.depends_on)}</div>`);
  if (artifact.decisions.length > 0) rows.push(`<div class="meta-row"><span class="meta-label">Decisions</span>${chip(artifact.decisions)}</div>`);
  if (artifact.writes_to.length > 0) rows.push(`<div class="meta-row"><span class="meta-label">Writes to</span>${chip(artifact.writes_to)}</div>`);
  if (artifact.implementation.length > 0) rows.push(`<div class="meta-row"><span class="meta-label">Implementation</span>${artifact.implementation.map((item) => `<code>${escapeHtml(item)}</code>`).join(" ")}</div>`);
  if (artifact.supersedes) rows.push(`<div class="meta-row"><span class="meta-label">Supersedes</span>${chip([artifact.supersedes])}</div>`);
  if (backlinks) {
    if (backlinks.depended_on_by.length > 0) rows.push(`<div class="meta-row"><span class="meta-label">Depended on by</span>${chip(backlinks.depended_on_by.sort())}</div>`);
    if (backlinks.decision_of.length > 0) rows.push(`<div class="meta-row"><span class="meta-label">Constrains</span>${chip(backlinks.decision_of.sort())}</div>`);
    if (backlinks.written_by.length > 0) rows.push(`<div class="meta-row"><span class="meta-label">Written by</span>${chip(backlinks.written_by.sort())}</div>`);
    if (backlinks.superseded_by.length > 0) rows.push(`<div class="meta-row"><span class="meta-label">Superseded by</span>${chip(backlinks.superseded_by.sort())}</div>`);
  }
  return `<aside class="meta-panel">${rows.join("")}</aside>`;
}

function pageShell(title: string, route: string, navigation: string, content: string, projectLabel: string, withMermaid = false): string {
  const prefix = "../".repeat(route.split("/").length - 1);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · ${escapeHtml(projectLabel)}</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' rx='3' fill='%232563eb'/%3E%3Ctext x='8' y='12' font-size='10' fill='white' text-anchor='middle' font-family='monospace'%3ED%3C/text%3E%3C/svg%3E">
<link rel="stylesheet" href="${prefix}assets/site.css">
</head>
<body>
<div class="layout">
<nav class="sidebar">${navigation}</nav>
<main class="content">${content}</main>
</div>
${withMermaid ? `<script src="${prefix}assets/mermaid.min.js"></script>\n` : ""}<script src="${prefix}assets/site.js"></script>
</body>
</html>
`;
}

interface NavTree {
  pages: SitePage[];
  children: Map<string, NavTree>;
}

function navTree(): NavTree {
  return { pages: [], children: new Map() };
}

// The repository is deliberately deep — features/, use-cases/, data/,
// unit-tests/backend/ … — so the sidebar mirrors that hierarchy instead of
// flattening every layer into one list.
function insertNav(tree: NavTree, segments: string[], page: SitePage): void {
  if (segments.length === 0) {
    tree.pages.push(page);
    return;
  }
  const [head, ...rest] = segments;
  const child = tree.children.get(head!) ?? navTree();
  tree.children.set(head!, child);
  insertNav(child, rest, page);
}

function renderNavTree(tree: NavTree, currentRoute: string, link: (target: string, label: string, cls?: string) => string): { html: string; containsCurrent: boolean } {
  let containsCurrent = false;
  const items: string[] = [];
  for (const page of tree.pages.sort((a, b) => a.route.localeCompare(b.route))) {
    if (page.route === currentRoute) containsCurrent = true;
    const dot = page.artifact ? `<span class="dot ${statusClass(page.artifact.status)}"></span>` : "";
    const label = page.artifact?.id ? page.artifact.id : page.title;
    items.push(`<li>${dot}${link(page.route, label, "nav-item")}</li>`);
  }
  for (const name of [...tree.children.keys()].sort()) {
    const child = renderNavTree(tree.children.get(name)!, currentRoute, link);
    containsCurrent = containsCurrent || child.containsCurrent;
    items.push(`<li class="nav-dir"><details${child.containsCurrent ? " open" : ""}><summary>${escapeHtml(name)}/</summary><ul>${child.html}</ul></details></li>`);
  }
  return { html: items.join(""), containsCurrent };
}

function buildNavigation(pages: SitePage[], currentRoute: string, projectLabel: string): string {
  const link = (target: string, label: string, cls = "") =>
    `<a class="${cls}${target === currentRoute ? " current" : ""}" href="${relativeHref(currentRoute, target)}">${escapeHtml(label)}</a>`;
  const sections: string[] = [];
  sections.push(`<div class="nav-head">${escapeHtml(projectLabel)}</div>`);
  sections.push(`<div class="nav-top">${link("index.html", "Overview")}${link("graph.html", "Dependency graph")}</div>`);
  const layerTrees = new Map<number, NavTree>();
  const reportTree = navTree();
  for (const page of pages) {
    const segments = page.sourceFile.split("/");
    if (page.kind === "report" || page.sourceFile.startsWith("generated/")) {
      insertNav(reportTree, segments.slice(1, -1), page);
      continue;
    }
    const layer = layerOf(page.sourceFile);
    const tree = layerTrees.get(layer) ?? navTree();
    layerTrees.set(layer, tree);
    insertNav(tree, segments.slice(segments[0]?.startsWith("0") ? 1 : 0, -1), page);
  }
  for (const layer of [...layerTrees.keys()].sort()) {
    const rendered = renderNavTree(layerTrees.get(layer)!, currentRoute, link);
    sections.push(`<details${rendered.containsCurrent ? " open" : ""}><summary>${LAYER_LABELS[layer] ?? `Layer ${layer}`}</summary><ul>${rendered.html}</ul></details>`);
  }
  if (reportTree.pages.length > 0 || reportTree.children.size > 0) {
    const rendered = renderNavTree(reportTree, currentRoute, link);
    sections.push(`<details${rendered.containsCurrent ? " open" : ""}><summary>Generated reports</summary><ul>${rendered.html}</ul></details>`);
  }
  return sections.join("");
}

function openApiSummary(raw: string): string {
  try {
    const parsed = YAML.parse(raw) as { paths?: Record<string, Record<string, { summary?: string; operationId?: string }>> } | null;
    const paths = parsed?.paths;
    if (!paths || typeof paths !== "object") return "";
    const rows: string[] = [];
    for (const [route, operations] of Object.entries(paths)) {
      if (!operations || typeof operations !== "object") continue;
      for (const [method, operation] of Object.entries(operations)) {
        if (!["get", "post", "put", "patch", "delete", "head", "options"].includes(method)) continue;
        const label = operation?.summary ?? operation?.operationId ?? "";
        rows.push(`<tr><td><code>${method.toUpperCase()}</code></td><td><code>${escapeHtml(route)}</code></td><td>${escapeHtml(label)}</td></tr>`);
      }
    }
    if (rows.length === 0) return "";
    return `<h2>Operations</h2><table><thead><tr><th>Method</th><th>Path</th><th>Summary</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
  } catch {
    return "";
  }
}

interface TokenRule {
  pattern: RegExp;
  className: string | null;
}

// Sticky-regex micro-lexer: enough to make YAML, JSON, DBML, Mermaid and
// Markdown source pages scannable without shipping a highlighting library.
function lexLine(line: string, rules: TokenRule[]): string {
  let output = "";
  let position = 0;
  while (position < line.length) {
    let matched = false;
    for (const rule of rules) {
      rule.pattern.lastIndex = position;
      const match = rule.pattern.exec(line);
      if (match && match.index === position && match[0].length > 0) {
        output += rule.className ? `<span class="${rule.className}">${escapeHtml(match[0])}</span>` : escapeHtml(match[0]);
        position += match[0].length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      output += escapeHtml(line[position] ?? "");
      position += 1;
    }
  }
  return output;
}

const SOURCE_RULES: Record<string, TokenRule[]> = {
  yaml: [
    { pattern: /\s+/y, className: null },
    { pattern: /#.*/y, className: "tok-cmt" },
    { pattern: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/y, className: "tok-str" },
    { pattern: /[A-Za-z0-9_.$/-]+(?=\s*:)/y, className: "tok-key" },
    { pattern: /\b(?:true|false|null|yes|no)\b/y, className: "tok-bool" },
    { pattern: /\b\d+(?:\.\d+)?\b/y, className: "tok-num" },
    { pattern: /[-:>|&*[\]{},]/y, className: "tok-punct" },
    { pattern: /[^\s:#]+/y, className: null }
  ],
  json: [
    { pattern: /\s+/y, className: null },
    { pattern: /"(?:[^"\\]|\\.)*"(?=\s*:)/y, className: "tok-key" },
    { pattern: /"(?:[^"\\]|\\.)*"/y, className: "tok-str" },
    { pattern: /\b(?:true|false|null)\b/y, className: "tok-bool" },
    { pattern: /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/y, className: "tok-num" },
    { pattern: /[{}[\]:,]/y, className: "tok-punct" }
  ],
  dbml: [
    { pattern: /\s+/y, className: null },
    { pattern: /\/\/.*/y, className: "tok-cmt" },
    { pattern: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/y, className: "tok-str" },
    { pattern: /\b(?:Table|Ref|Enum|Project|TableGroup|Note|indexes|as)\b/y, className: "tok-kw" },
    { pattern: /\[[^\]]*\]/y, className: "tok-punct" },
    { pattern: /\b\d+(?:\.\d+)?\b/y, className: "tok-num" },
    { pattern: /[{}<>:,.-]/y, className: "tok-punct" },
    { pattern: /[A-Za-z0-9_]+/y, className: null }
  ],
  mermaid: [
    { pattern: /\s+/y, className: null },
    { pattern: /%%.*/y, className: "tok-cmt" },
    { pattern: /"(?:[^"\\]|\\.)*"/y, className: "tok-str" },
    { pattern: /\b(?:graph|flowchart|subgraph|end|stateDiagram(?:-v2)?|classDiagram|sequenceDiagram|erDiagram|direction|LR|RL|TD|TB|BT)\b/y, className: "tok-kw" },
    { pattern: /(?:-->|---|-\.->|==>|\.->|--)/y, className: "tok-punct" },
    { pattern: /[[\](){}|]/y, className: "tok-punct" },
    { pattern: /[A-Za-z0-9_-]+/y, className: null }
  ],
  markdown: [
    { pattern: /^#{1,6} .*/y, className: "tok-kw" },
    { pattern: /^---\s*$/y, className: "tok-punct" },
    { pattern: /`[^`]*`/y, className: "tok-str" },
    { pattern: /\*\*[^*]+\*\*/y, className: "tok-bool" },
    { pattern: /\|/y, className: "tok-punct" },
    { pattern: /\s+/y, className: null },
    { pattern: /[^\s|`#*]+/y, className: null }
  ]
};

export function sourceLanguage(file: string): string {
  if (file.endsWith(".yaml") || file.endsWith(".yml")) return "yaml";
  if (file.endsWith(".json")) return "json";
  if (file.endsWith(".dbml")) return "dbml";
  if (file.endsWith(".mmd")) return "mermaid";
  if (file.endsWith(".md")) return "markdown";
  return "yaml";
}

export function highlightSource(raw: string, language: string): string {
  const rules = SOURCE_RULES[language] ?? SOURCE_RULES.yaml!;
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  let inComment = false;
  const rendered = lines.map((line, index) => {
    let body: string;
    if (language === "markdown") {
      // HTML guidance comments span lines; keep the whole span visibly muted.
      if (inComment) {
        const end = line.indexOf("-->");
        body = `<span class="tok-cmt">${escapeHtml(line)}</span>`;
        if (end >= 0) inComment = false;
      } else {
        const start = line.indexOf("<!--");
        if (start >= 0 && !line.includes("-->", start)) inComment = true;
        body = start >= 0
          ? `${lexLine(line.slice(0, start), SOURCE_RULES.markdown!)}<span class="tok-cmt">${escapeHtml(line.slice(start))}</span>`
          : lexLine(line, SOURCE_RULES.markdown!);
      }
    } else {
      body = lexLine(line, rules);
    }
    return `<div class="src-line" id="L${index + 1}"><a class="src-no" href="#L${index + 1}">${index + 1}</a><span class="src-text">${body || "&nbsp;"}</span></div>`;
  });
  return `<div class="src" data-lang="${escapeHtml(language)}">${rendered.join("")}</div>`;
}

function sourceView(page: SitePage, mermaidAvailable: boolean): string {
  const raw = page.raw ?? "";
  const summary = page.sourceFile.endsWith(".yaml") && page.sourceFile.includes("interfaces") ? openApiSummary(raw) : "";
  const language = sourceLanguage(page.sourceFile);
  const highlighted = highlightSource(raw, language);
  if (language === "mermaid" && mermaidAvailable) {
    return `<h2>Diagram</h2><div class="mermaid-holder"><pre class="mermaid">${escapeHtml(raw)}</pre></div>` +
      `<details class="source-details"><summary>Source <span class="lang-tag">mermaid</span></summary>${highlighted}</details>`;
  }
  return `${summary}<h2>Source <span class="lang-tag">${escapeHtml(language)}</span></h2>${highlighted}`;
}

async function collectSystemPages(root: string): Promise<SitePage[]> {
  const pages: SitePage[] = [];
  const files = await fg(["00-system/**/*.{md,yaml,json}"], { cwd: root, onlyFiles: true, dot: false, followSymbolicLinks: false });
  for (const relative of files.sort((a, b) => a.localeCompare(b))) {
    const raw = await readFile(path.join(root, relative), "utf8");
    const posix = toPosix(relative);
    if (posix.startsWith("00-system/patterns/") && posix !== "00-system/patterns/README.md") {
      pages.push({ route: routeFor(posix), sourceFile: posix, title: path.posix.basename(posix), kind: "source", raw });
      continue;
    }
    if (posix.endsWith(".md")) {
      try {
        const parsed = parseFrontmatter(raw, posix);
        const meta = toArtifactMeta(parsed.data);
        pages.push({
          route: routeFor(posix), sourceFile: posix, title: meta.title || path.posix.basename(posix), kind: "system", markdown: parsed.body,
          artifact: { ...meta, file: posix, body: parsed.body, hash: "", metadata_issues: [] }
        });
      } catch {
        pages.push({ route: routeFor(posix), sourceFile: posix, title: path.posix.basename(posix), kind: "system", markdown: raw });
      }
      continue;
    }
    pages.push({ route: routeFor(posix), sourceFile: posix, title: path.posix.basename(posix), kind: "source", raw });
  }
  return pages;
}

async function collectReportPages(root: string): Promise<SitePage[]> {
  const pages: SitePage[] = [];
  const files = await fg(["generated/**/*.{md,json}"], { cwd: root, onlyFiles: true, dot: false, followSymbolicLinks: false });
  for (const relative of files.sort((a, b) => a.localeCompare(b))) {
    const raw = await readFile(path.join(root, relative), "utf8");
    const posix = toPosix(relative);
    const title = path.posix.basename(posix).replace(/\.(md|json)$/, "");
    if (posix.endsWith(".md")) pages.push({ route: routeFor(posix), sourceFile: posix, title, kind: "report", markdown: raw });
    else pages.push({ route: routeFor(posix), sourceFile: posix, title, kind: "source", raw });
  }
  return pages;
}

function graphSvg(graph: ArtifactGraph, idRoutes: Map<string, string>): string {
  const columnWidth = 250;
  const nodeWidth = 200;
  const nodeHeight = 26;
  const rowGap = 34;
  const byLayer = new Map<number, typeof graph.nodes>();
  for (const node of graph.nodes) {
    const layer = layerOf(node.file);
    const list = byLayer.get(layer) ?? [];
    list.push(node);
    byLayer.set(layer, list);
  }
  const layers = [...byLayer.keys()].sort();
  const positions = new Map<string, { x: number; y: number }>();
  let maxRows = 0;
  layers.forEach((layer, columnIndex) => {
    const nodes = (byLayer.get(layer) ?? []).sort((a, b) => a.type === b.type ? a.id.localeCompare(b.id) : a.type.localeCompare(b.type));
    maxRows = Math.max(maxRows, nodes.length);
    nodes.forEach((node, rowIndex) => {
      positions.set(node.id, { x: 30 + columnIndex * columnWidth, y: 70 + rowIndex * rowGap });
    });
  });
  const width = 60 + layers.length * columnWidth;
  const height = 110 + maxRows * rowGap;
  const parts: string[] = [];
  parts.push(`<svg id="graph" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img">`);
  parts.push(`<defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 z" class="arrow-head"/></marker></defs>`);
  layers.forEach((layer, columnIndex) => {
    parts.push(`<text class="layer-label" x="${30 + columnIndex * columnWidth}" y="40">${escapeHtml(LAYER_LABELS[layer] ?? `Layer ${layer}`)}</text>`);
  });
  for (const edge of graph.edges) {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!from || !to) continue;
    const x1 = from.x;
    const y1 = from.y + nodeHeight / 2;
    const x2 = to.x + nodeWidth;
    const y2 = to.y + nodeHeight / 2;
    const bend = Math.max(40, Math.abs(x1 - x2) / 3);
    const pathD = x1 >= x2
      ? `M ${x1} ${y1} C ${x1 - bend} ${y1}, ${x2 + bend} ${y2}, ${x2 + 4} ${y2}`
      : `M ${x1 + nodeWidth} ${y1} C ${x1 + nodeWidth + bend} ${y1}, ${x2 - nodeWidth - bend} ${y2}, ${x2 - nodeWidth + 4} ${y2}`;
    parts.push(`<path class="edge edge-${edge.relation}" data-from="${edge.from}" data-to="${edge.to}" d="${pathD}" marker-end="url(#arrow)"/>`);
  }
  for (const node of graph.nodes) {
    const position = positions.get(node.id);
    if (!position) continue;
    const href = idRoutes.get(node.id);
    const label = node.id.length > 26 ? `${node.id.slice(0, 25)}…` : node.id;
    const rect = `<rect x="${position.x}" y="${position.y}" width="${nodeWidth}" height="${nodeHeight}" rx="6" class="node-box layer-${layerOf(node.file)} ${statusClass(node.status)}"/>`;
    const text = `<text x="${position.x + 10}" y="${position.y + 17}" class="node-label">${escapeHtml(label)}</text><title>${escapeHtml(`${node.id} · ${node.type} · ${node.status}`)}</title>`;
    const body = `${rect}${text}`;
    parts.push(`<g class="node" data-id="${node.id}" data-status="${escapeHtml(node.status)}">${href ? `<a href="${href}">${body}</a>` : body}</g>`);
  }
  parts.push("</svg>");
  return parts.join("\n");
}

// The cluster a node belongs to is its directory: features/, data/,
// unit-tests/backend/ … Root-level singletons cluster under their layer.
function groupOf(file: string): string {
  const dir = path.posix.dirname(toPosix(file));
  return dir === "." ? "root" : dir;
}

function graphPage(graph: ArtifactGraph, idRoutes: Map<string, string>, titles: Map<string, string>): string {
  const inDegree = new Map<string, number>();
  for (const edge of graph.edges) if (edge.relation === "depends_on" || edge.relation === "writes_to") inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
  const data = {
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      title: titles.get(node.id) ?? node.id,
      type: node.type,
      status: node.status,
      layer: layerOf(node.file),
      group: groupOf(node.file),
      route: idRoutes.get(node.id) ?? null,
      inDeg: inDegree.get(node.id) ?? 0
    })),
    edges: graph.edges
      .filter((edge) => graph.nodes.some((node) => node.id === edge.from) && graph.nodes.some((node) => node.id === edge.to))
      .map((edge) => ({ from: edge.from, to: edge.to, relation: edge.relation }))
  };
  const groups = [...new Set(data.nodes.map((node) => node.group))].sort();
  const mostDepended = [...inDegree.entries()]
    .filter(([id]) => idRoutes.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => `<button class="rank-chip" data-node="${escapeHtml(id)}"><code>${escapeHtml(id)}</code> ×${count}</button>`)
    .join(" ");
  const groupOptions = groups.map((group) => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`).join("");
  const filters = `
<div class="graph-controls">
<span class="view-switch"><button id="view-clusters" class="view-button active">Clusters</button><button id="view-network" class="view-button">Network</button><button id="view-layers" class="view-button">Layers</button></span>
<label>Cluster <select id="group-filter"><option value="">all</option>${groupOptions}</select></label>
<label><input type="checkbox" class="edge-toggle" value="depends_on" checked> depends_on</label>
<label><input type="checkbox" class="edge-toggle" value="writes_to" checked> writes_to</label>
<label><input type="checkbox" class="edge-toggle" value="decision" checked> decision</label>
<label><input type="checkbox" class="edge-toggle" value="supersedes" checked> supersedes</label>
<label>Status <select id="status-filter"><option value="">all</option><option>active</option><option>draft</option><option>superseded</option><option>retired</option></select></label>
<input id="graph-search" type="search" placeholder="Find node…" autocomplete="off">
<button id="graph-full" class="view-button" title="Toggle fullscreen">⛶ Fullscreen</button>
</div>`;
  return `<h1>Dependency graph</h1>
<p class="muted">${graph.nodes.length} artifacts · ${graph.edges.length} declared relations. <strong>Clusters</strong> shows one node per document cluster with aggregated links between clusters — click a cluster to list its members and focus it. <strong>Network</strong> shows every document, spatially partitioned by cluster; pick a cluster to see only it and its direct neighbors. Node size reflects how many artifacts depend on it. Double-click opens the document.</p>
<div class="rank-row"><span class="muted">Most depended on:</span> ${mostDepended}</div>
${filters}
<div id="network-view">
<div id="graph-crumb" class="graph-crumb"></div>
<div class="network-wrap"><canvas id="net-canvas"></canvas><div id="net-panel" class="net-panel" hidden></div></div>
</div>
<div id="layers-view" hidden>
<div class="graph-scroll">${graphSvg(graph, idRoutes)}</div>
</div>
<script id="graph-data" type="application/json">${JSON.stringify(data).replaceAll("</", "<\\/")}</script>`;
}

function indexPage(pages: SitePage[], graph: ArtifactGraph, projectLabel: string): string {
  const artifacts = pages.filter((page) => page.artifact && page.kind === "artifact");
  const statuses = new Map<string, number>();
  for (const page of artifacts) statuses.set(page.artifact!.status, (statuses.get(page.artifact!.status) ?? 0) + 1);
  const cards = [
    `<div class="card"><div class="card-number">${artifacts.length}</div><div class="card-label">artifacts</div></div>`,
    ...[...statuses.entries()].sort().map(([status, count]) => `<div class="card"><div class="card-number">${count}</div><div class="card-label">${escapeHtml(status)}</div></div>`),
    `<div class="card"><div class="card-number">${graph.edges.length}</div><div class="card-label">relations</div></div>`
  ].join("");
  const byLayer = new Map<number, SitePage[]>();
  for (const page of artifacts) {
    const layer = layerOf(page.sourceFile);
    const list = byLayer.get(layer) ?? [];
    list.push(page);
    byLayer.set(layer, list);
  }
  const table = (entries: SitePage[]): string => {
    const rows = entries.sort((a, b) => a.artifact!.id.localeCompare(b.artifact!.id)).map((page) => {
      const artifact = page.artifact!;
      return `<tr data-search="${escapeHtml(`${artifact.id} ${artifact.title} ${artifact.artifact_type} ${artifact.status}`.toLowerCase())}">` +
        `<td><a href="${page.route}">${escapeHtml(artifact.id)}</a></td>` +
        `<td>${escapeHtml(artifact.title)}</td><td><code>${escapeHtml(artifact.artifact_type)}</code></td><td>${badge(artifact.status)}</td></tr>`;
    }).join("");
    return `<table class="index-table"><thead><tr><th>ID</th><th>Title</th><th>Type</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`;
  };
  const sections = [...byLayer.keys()].sort().map((layer) => {
    // Mirror the repository's own grouping: root singletons first, then one
    // subsection per subdirectory (features/, data/, unit-tests/backend/, …).
    const byGroup = new Map<string, SitePage[]>();
    for (const page of byLayer.get(layer) ?? []) {
      const group = path.posix.dirname(page.sourceFile).split("/").slice(1).join("/");
      const list = byGroup.get(group) ?? [];
      list.push(page);
      byGroup.set(group, list);
    }
    const parts: string[] = [`<h2>${LAYER_LABELS[layer] ?? `Layer ${layer}`}</h2>`];
    for (const group of [...byGroup.keys()].sort((a, b) => (a === "" ? -1 : b === "" ? 1 : a.localeCompare(b)))) {
      if (group !== "") parts.push(`<h3 class="group-heading">${escapeHtml(group)}/</h3>`);
      parts.push(table(byGroup.get(group)!));
    }
    return parts.join("");
  }).join("");
  return `<h1>${escapeHtml(projectLabel)}</h1>
<p class="muted">Read-only projection of the documentation repository. Generated by <code>ai-saas-sdlc docs build</code>; the Markdown artifacts remain the only authority.</p>
<div class="cards">${cards}</div>
<input id="filter" type="search" placeholder="Filter by ID, title, type or status…" autocomplete="off">
${sections}`;
}

const SITE_CSS = `:root { color-scheme: light dark; --bg: #ffffff; --fg: #1a202c; --muted: #64748b; --line: #e2e8f0; --panel: #f8fafc; --accent: #2563eb; }
@media (prefers-color-scheme: dark) { :root { --bg: #0f172a; --fg: #e2e8f0; --muted: #94a3b8; --line: #1e293b; --panel: #111c33; --accent: #60a5fa; } }
* { box-sizing: border-box; }
body { margin: 0; font: 15px/1.6 system-ui, "Segoe UI", sans-serif; background: var(--bg); color: var(--fg); }
.layout { display: grid; grid-template-columns: 290px 1fr; min-height: 100vh; }
.sidebar { border-right: 1px solid var(--line); padding: 16px 12px; overflow-y: auto; height: 100vh; position: sticky; top: 0; background: var(--panel); }
.nav-head { font-weight: 700; margin-bottom: 10px; }
.nav-top a { display: block; padding: 3px 8px; border-radius: 6px; text-decoration: none; color: var(--accent); }
.sidebar details { margin-top: 8px; }
.sidebar summary { cursor: pointer; font-weight: 600; padding: 3px 6px; }
.sidebar ul { list-style: none; margin: 2px 0; padding-left: 14px; }
.sidebar .nav-dir > details > summary { font-weight: 500; color: var(--muted); font-size: 13px; }
.group-heading { color: var(--muted); font-size: 15px; margin: 18px 0 4px; font-family: ui-monospace, monospace; }
.sidebar li { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sidebar a.nav-item { color: var(--fg); text-decoration: none; font-size: 13px; }
.sidebar a.current { color: var(--accent); font-weight: 600; }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 4px; margin-right: 5px; }
.content { padding: 28px 40px; max-width: 1560px; min-width: 0; }
h1 { font-size: 26px; line-height: 1.3; }
table { border-collapse: collapse; width: 100%; margin: 14px 0; font-size: 13.5px; display: block; overflow-x: auto; }
th, td { border: 1px solid var(--line); padding: 6px 9px; text-align: left; vertical-align: top; }
th { background: var(--panel); }
code { background: var(--panel); border: 1px solid var(--line); border-radius: 4px; padding: 1px 4px; font-size: 12.5px; }
pre.source { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 14px; overflow-x: auto; }
pre.source code { border: 0; background: none; }
pre { white-space: pre-wrap; word-break: break-word; }
.src { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 10px 0; font: 12.5px/1.55 ui-monospace, "Cascadia Code", Consolas, monospace; }
.src-line { display: flex; align-items: baseline; }
.src-line:hover { background: color-mix(in srgb, var(--accent) 7%, transparent); }
.src-line:target { background: color-mix(in srgb, var(--accent) 16%, transparent); }
.src-no { flex: 0 0 3.4em; text-align: right; padding-right: 12px; color: var(--muted); opacity: 0.6; text-decoration: none; user-select: none; font-size: 11.5px; }
.src-text { flex: 1; white-space: pre-wrap; word-break: break-word; padding-right: 14px; min-width: 0; }
.lang-tag { font-size: 12px; font-weight: 500; color: var(--muted); border: 1px solid var(--line); border-radius: 10px; padding: 1px 9px; vertical-align: middle; margin-left: 8px; }
.mermaid-holder { border: 1px solid var(--line); background: var(--panel); border-radius: 10px; padding: 16px; overflow-x: auto; }
pre.mermaid { display: flex; justify-content: center; background: none; margin: 0; }
pre.mermaid svg { max-width: 100%; height: auto; }
.source-details { margin-top: 14px; }
.source-details > summary { cursor: pointer; font-weight: 600; font-size: 17px; margin-bottom: 8px; }
.tok-key { color: #0369a1; } .tok-str { color: #15803d; } .tok-num { color: #b45309; } .tok-bool { color: #7c3aed; } .tok-cmt { color: var(--muted); font-style: italic; } .tok-kw { color: #be185d; font-weight: 600; } .tok-punct { color: var(--muted); }
@media (prefers-color-scheme: dark) { .tok-key { color: #7dd3fc; } .tok-str { color: #86efac; } .tok-num { color: #fcd34d; } .tok-kw { color: #f9a8d4; } .tok-bool { color: #c4b5fd; } }
.badge { border-radius: 10px; padding: 1px 9px; font-size: 12px; font-weight: 600; }
.status-active { background: #16a34a22; color: #16a34a; } .dot.status-active { background: #16a34a; }
.status-draft { background: #d9770622; color: #d97706; } .dot.status-draft { background: #d97706; }
.status-superseded { background: #64748b22; color: #64748b; } .dot.status-superseded { background: #64748b; }
.status-other { background: #2563eb22; color: var(--accent); } .dot.status-other { background: var(--accent); }
.meta-panel { border: 1px solid var(--line); background: var(--panel); border-radius: 10px; padding: 12px 16px; margin: 14px 0 22px; }
.meta-row { display: flex; gap: 10px; padding: 3px 0; flex-wrap: wrap; }
.meta-label { min-width: 130px; color: var(--muted); font-size: 13px; }
.chip, a.id-link { color: var(--accent); text-decoration: none; }
.chip { border: 1px solid var(--line); border-radius: 10px; padding: 0 8px; font-size: 12.5px; background: var(--bg); }
a.id-link { border-bottom: 1px dotted var(--accent); }
.muted { color: var(--muted); }
.cards { display: flex; gap: 12px; flex-wrap: wrap; margin: 18px 0; }
.card { border: 1px solid var(--line); background: var(--panel); border-radius: 10px; padding: 10px 20px; text-align: center; }
.card-number { font-size: 24px; font-weight: 700; }
.card-label { color: var(--muted); font-size: 12.5px; }
#filter { width: 100%; padding: 9px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); color: var(--fg); margin: 6px 0 10px; }
.banner { border: 1px solid #d97706; background: #d9770614; color: inherit; border-radius: 8px; padding: 9px 14px; margin: 12px 0; }
.graph-scroll { overflow: auto; border: 1px solid var(--line); border-radius: 10px; background: var(--panel); }
.graph-controls { display: flex; gap: 16px; flex-wrap: wrap; margin: 10px 0; font-size: 13.5px; align-items: center; }
.node-box { fill: var(--bg); stroke: var(--line); stroke-width: 1.2; }
.node-box.status-active { stroke: #16a34a; } .node-box.status-draft { stroke: #d97706; } .node-box.status-superseded { stroke-dasharray: 4 3; }
.node-label { font: 11px ui-monospace, monospace; fill: var(--fg); }
.layer-label { font: 600 13px system-ui; fill: var(--muted); }
.edge { fill: none; stroke-width: 1.1; opacity: 0.5; }
.edge-depends_on { stroke: #64748b; } .edge-writes_to { stroke: #d97706; } .edge-decision { stroke: #7c3aed; stroke-dasharray: 5 3; } .edge-supersedes { stroke: #dc2626; stroke-dasharray: 2 3; }
.arrow-head { fill: #64748b; }
.edge.hidden, .node.hidden { display: none; }
.network-wrap { position: relative; border: 1px solid var(--line); border-radius: 10px; background: var(--panel); overflow: hidden; }
#net-canvas { display: block; width: 100%; }
.net-panel { position: absolute; top: 12px; right: 12px; width: 300px; max-height: calc(100% - 24px); overflow-y: auto; background: var(--bg); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; box-shadow: 0 6px 22px rgba(0,0,0,0.14); font-size: 13px; }
.net-title { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-weight: 600; }
.net-open { color: var(--accent); text-decoration: none; font-size: 12.5px; white-space: nowrap; }
.net-sub { color: var(--muted); margin-top: 4px; }
.net-section { font-weight: 600; margin: 10px 0 4px; }
.net-list { display: flex; flex-direction: column; gap: 3px; }
.net-jump { text-align: left; background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 3px 8px; cursor: pointer; color: var(--fg); font: inherit; font-size: 12.5px; }
.net-jump:hover { border-color: var(--accent); }
.rank-row { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin: 8px 0; }
.graph-crumb { display: flex; gap: 8px; align-items: center; margin: 8px 0; font-size: 13.5px; min-height: 26px; }
.crumb-link { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 3px 10px; cursor: pointer; color: var(--accent); font: inherit; font-size: 13px; }
.crumb-link:hover { border-color: var(--accent); }
.crumb-here { font-weight: 600; }
.crumb-sep { color: var(--muted); }
.net-close { position: absolute; top: 6px; right: 8px; background: none; border: 0; color: var(--muted); font-size: 20px; line-height: 1; cursor: pointer; padding: 2px 6px; }
.net-close:hover { color: var(--fg); }
.network-wrap:fullscreen { border: 0; border-radius: 0; }
.network-wrap:fullscreen #net-canvas { background: var(--panel); }
.rank-chip { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 2px 10px; cursor: pointer; color: var(--fg); font: inherit; font-size: 12.5px; }
.rank-chip:hover { border-color: var(--accent); }
.view-switch { display: inline-flex; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.view-button { background: var(--bg); color: var(--fg); border: 0; padding: 5px 14px; cursor: pointer; font: inherit; font-size: 13px; }
.view-button.active { background: var(--accent); color: #fff; }
#graph-search { padding: 5px 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); color: var(--fg); }
.node.dimmed, .edge.dimmed { opacity: 0.12; }
.edge.focus { opacity: 1; stroke-width: 2; }
tr[hidden] { display: none; }
@media (max-width: 900px) { .layout { grid-template-columns: 1fr; } .sidebar { position: static; height: auto; } }
`;

const SITE_JS = `(function () {
  if (window.mermaid) {
    document.querySelectorAll("code.language-mermaid").forEach(function (code) {
      var holder = document.createElement("pre");
      holder.className = "mermaid";
      holder.textContent = code.textContent;
      var pre = code.closest("pre") || code;
      pre.parentNode.replaceChild(holder, pre);
    });
    var dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    window.mermaid.initialize({ startOnLoad: false, theme: dark ? "dark" : "default" });
    window.mermaid.run({ querySelector: ".mermaid" }).catch(function (error) {
      console.warn("mermaid render failed", error);
    });
  }
  var filter = document.getElementById("filter");
  if (filter) filter.addEventListener("input", function () {
    var query = filter.value.trim().toLowerCase();
    document.querySelectorAll("tr[data-search]").forEach(function (row) {
      row.hidden = query !== "" && row.getAttribute("data-search").indexOf(query) < 0;
    });
  });
  var dataElement = document.getElementById("graph-data");
  if (dataElement) initNetwork(JSON.parse(dataElement.textContent));

  function initNetwork(data) {
    var canvas = document.getElementById("net-canvas");
    var panel = document.getElementById("net-panel");
    if (!canvas || !canvas.getContext) return;
    var context = canvas.getContext("2d");
    var layerColors = ["#64748b", "#0891b2", "#2563eb", "#7c3aed", "#d97706", "#dc2626"];

    var groups = [];
    var groupInfo = {};
    data.nodes.forEach(function (node) {
      if (!groupInfo[node.group]) {
        groupInfo[node.group] = { name: node.group, layer: node.layer, count: 0 };
        groups.push(node.group);
      }
      groupInfo[node.group].count += 1;
    });
    groups.sort(function (a, b) {
      return groupInfo[a].layer - groupInfo[b].layer || a.localeCompare(b);
    });
    var anchors = {};
    var ringRadius = Math.max(260, 70 * Math.sqrt(groups.length) * 1.6);
    groups.forEach(function (group, index) {
      var angle = (index / groups.length) * 2 * Math.PI - Math.PI / 2;
      anchors[group] = { x: Math.cos(angle) * ringRadius, y: Math.sin(angle) * ringRadius };
    });

    var groupIndex = {};
    var nodes = data.nodes.map(function (node) {
      var seed = groupIndex[node.group] = (groupIndex[node.group] || 0) + 1;
      var angle = seed * 2.399963;
      var radius = 12 + 13 * Math.sqrt(seed);
      var anchor = anchors[node.group];
      return Object.assign({}, node, {
        x: anchor.x + Math.cos(angle) * radius,
        y: anchor.y + Math.sin(angle) * radius,
        vx: 0, vy: 0,
        size: 5 + Math.min(14, 2.2 * Math.sqrt(node.inDeg))
      });
    });
    var byId = {};
    nodes.forEach(function (node) { byId[node.id] = node; });
    var edges = data.edges.filter(function (edge) { return byId[edge.from] && byId[edge.to]; });
    var neighbors = {};
    edges.forEach(function (edge) {
      (neighbors[edge.from] = neighbors[edge.from] || {})[edge.to] = true;
      (neighbors[edge.to] = neighbors[edge.to] || {})[edge.from] = true;
    });

    // Cluster aggregation: one meta-node per document cluster, one meta-edge
    // per ordered cluster pair carrying per-relation link counts.
    var metaNodes = groups.map(function (group) {
      var info = groupInfo[group];
      return {
        id: group, group: group, meta: true,
        title: group, status: "active", layer: info.layer, count: info.count, route: null,
        x: anchors[group].x, y: anchors[group].y, vx: 0, vy: 0,
        size: 14 + 4 * Math.sqrt(info.count)
      };
    });
    var metaById = {};
    metaNodes.forEach(function (node) { metaById[node.id] = node; });
    var metaEdgeMap = {};
    edges.forEach(function (edge) {
      var from = byId[edge.from].group, to = byId[edge.to].group;
      if (from === to) return;
      var key = from < to ? from + "\\u0000" + to : to + "\\u0000" + from;
      var entry = metaEdgeMap[key] || (metaEdgeMap[key] = { from: from < to ? from : to, to: from < to ? to : from, counts: {} });
      entry.counts[edge.relation] = (entry.counts[edge.relation] || 0) + 1;
    });
    var metaEdges = Object.keys(metaEdgeMap).map(function (key) { return metaEdgeMap[key]; });
    function metaEdgeCount(edge) {
      var total = 0;
      for (var relation in edge.counts) if (enabledRelations[relation]) total += edge.counts[relation];
      return total;
    }
    var metaNeighbors = {};
    metaEdges.forEach(function (edge) {
      (metaNeighbors[edge.from] = metaNeighbors[edge.from] || {})[edge.to] = true;
      (metaNeighbors[edge.to] = metaNeighbors[edge.to] || {})[edge.from] = true;
    });

    var view = { x: 0, y: 0, scale: 1 };
    var alpha = 1;
    var selected = null;
    var hovered = null;
    var enabledRelations = { depends_on: true, writes_to: true, decision: true, supersedes: true };
    var statusFilter = "";
    var mode = "clusters";
    var focusGroup = "";
    var active = { nodes: metaNodes, edges: [] };

    function rebuild() {
      selected = null; hovered = null; panel.hidden = true;
      if (mode === "clusters") {
        active = { nodes: metaNodes, edges: metaEdges };
      } else if (focusGroup === "") {
        active = { nodes: nodes, edges: edges };
      } else {
        // Members first, then exactly one hop out: a neighbor joins only when
        // the other endpoint is a member, never transitively.
        var members = {};
        nodes.forEach(function (node) { if (node.group === focusGroup) members[node.id] = true; });
        var included = {};
        edges.forEach(function (edge) {
          if (members[edge.from] && !members[edge.to]) included[edge.to] = true;
          if (members[edge.to] && !members[edge.from]) included[edge.from] = true;
        });
        var visible = nodes.filter(function (node) { return members[node.id] || included[node.id]; });
        active = {
          nodes: visible,
          edges: edges.filter(function (edge) { return members[edge.from] || members[edge.to]; })
        };
      }
      alpha = Math.max(alpha, 0.6);
    }

    function resize() {
      var wrap = canvas.parentElement;
      var box = wrap.getBoundingClientRect();
      var ratio = window.devicePixelRatio || 1;
      var height = document.fullscreenElement === wrap ? window.innerHeight : Math.max(480, window.innerHeight - 320);
      canvas.width = box.width * ratio;
      canvas.height = height * ratio;
      canvas.style.height = height + "px";
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      view.width = box.width;
      view.height = height;
    }
    resize();
    window.addEventListener("resize", function () { resize(); alpha = Math.max(alpha, 0.05); });
    view.x = view.width / 2 - 300;
    view.y = view.height / 2;

    function anchorFor(node) {
      if (mode === "clusters") return anchors[node.group];
      if (focusGroup === "") return anchors[node.group];
      if (node.group === focusGroup) return { x: 0, y: 0 };
      var ring = anchors[node.group];
      var length = Math.sqrt(ring.x * ring.x + ring.y * ring.y) || 1;
      return { x: ring.x / length * 340, y: ring.y / length * 340 };
    }

    function step() {
      if (alpha > 0.003) {
        var list = active.nodes;
        var anchorPull = mode === "clusters" ? 0.004 : focusGroup === "" ? 0.02 : 0.012;
        var rest = mode === "clusters" ? 220 : focusGroup === "" ? 70 : 110;
        for (var i = 0; i < list.length; i++) {
          var a = list[i];
          for (var j = i + 1; j < list.length; j++) {
            var b = list[j];
            var dx = a.x - b.x, dy = a.y - b.y;
            var d2 = dx * dx + dy * dy + 0.01;
            if (d2 > 90000) continue;
            var force = (mode === "clusters" ? 2600 : 900) / d2;
            var dist = Math.sqrt(d2);
            var fx = force * dx / dist, fy = force * dy / dist;
            a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
          }
          var anchor = anchorFor(a);
          a.vx += anchorPull * (anchor.x - a.x);
          a.vy += anchorPull * (anchor.y - a.y);
        }
        active.edges.forEach(function (edge) {
          var from = (active.nodes[0] && active.nodes[0].meta) ? metaById[edge.from] : byId[edge.from];
          var to = (active.nodes[0] && active.nodes[0].meta) ? metaById[edge.to] : byId[edge.to];
          if (!from || !to) return;
          var dx = to.x - from.x, dy = to.y - from.y;
          var dist = Math.sqrt(dx * dx + dy * dy) || 1;
          var stretch = (mode === "clusters" ? 0.004 : 0.006) * (dist - rest);
          var fx = stretch * dx / dist, fy = stretch * dy / dist;
          from.vx += fx; from.vy += fy; to.vx -= fx; to.vy -= fy;
        });
        list.forEach(function (node) {
          if (node.fixed) { node.vx = 0; node.vy = 0; return; }
          node.vx *= 0.82; node.vy *= 0.82;
          node.x += node.vx * alpha; node.y += node.vy * alpha;
        });
        alpha *= 0.995;
      }
      draw();
      requestAnimationFrame(step);
    }

    function nodeVisible(node) { return node.meta || statusFilter === "" || node.status === statusFilter; }

    function drawClusterHulls() {
      var bounds = {};
      active.nodes.forEach(function (node) {
        var box = bounds[node.group] || (bounds[node.group] = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
        box.minX = Math.min(box.minX, node.x - node.size);
        box.minY = Math.min(box.minY, node.y - node.size);
        box.maxX = Math.max(box.maxX, node.x + node.size);
        box.maxY = Math.max(box.maxY, node.y + node.size);
      });
      for (var group in bounds) {
        var box = bounds[group];
        var pad = 22;
        var color = layerColors[groupInfo[group].layer] || "#64748b";
        context.globalAlpha = 0.07;
        context.fillStyle = color;
        context.beginPath();
        if (context.roundRect) context.roundRect(box.minX - pad, box.minY - pad - 12, box.maxX - box.minX + 2 * pad, box.maxY - box.minY + 2 * pad + 12, 16);
        else context.rect(box.minX - pad, box.minY - pad - 12, box.maxX - box.minX + 2 * pad, box.maxY - box.minY + 2 * pad + 12);
        context.fill();
        context.globalAlpha = 0.35;
        context.strokeStyle = color;
        context.lineWidth = 1;
        context.stroke();
        context.globalAlpha = 0.8;
        context.fillStyle = color;
        context.font = "600 11px system-ui, sans-serif";
        context.fillText(group, box.minX - pad + 6, box.minY - pad - 1);
      }
      context.globalAlpha = 1;
    }

    function draw() {
      context.clearRect(0, 0, view.width, view.height);
      context.save();
      context.translate(view.x, view.y);
      context.scale(view.scale, view.scale);
      var focusId = hovered || selected;
      var isMeta = mode === "clusters";
      var neighborMap = isMeta ? metaNeighbors : neighbors;
      if (mode === "network" && focusGroup === "") drawClusterHulls();
      active.edges.forEach(function (edge) {
        var count = 0;
        if (isMeta) {
          count = metaEdgeCount(edge);
          if (count === 0) return;
        } else if (!enabledRelations[edge.relation]) return;
        var from = isMeta ? metaById[edge.from] : byId[edge.from];
        var to = isMeta ? metaById[edge.to] : byId[edge.to];
        var focused = focusId && (edge.from === focusId || edge.to === focusId);
        context.strokeStyle = isMeta ? "#94a3b8" : edge.relation === "writes_to" ? "#d97706" : edge.relation === "decision" ? "#7c3aed" : edge.relation === "supersedes" ? "#dc2626" : "#94a3b8";
        context.globalAlpha = focusId ? (focused ? 0.9 : 0.06) : (isMeta ? 0.5 : 0.28);
        context.lineWidth = isMeta ? 0.8 + 1.4 * Math.log(1 + count) : focused ? 1.6 : 0.7;
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.stroke();
        if (isMeta && focused) {
          context.globalAlpha = 1;
          context.font = "600 11px system-ui, sans-serif";
          context.fillStyle = getComputedStyle(document.body).color;
          context.fillText(String(count), (from.x + to.x) / 2 + 4, (from.y + to.y) / 2 - 4);
        }
      });
      active.nodes.forEach(function (node) {
        var focused = focusId && (node.id === focusId || (neighborMap[focusId] && neighborMap[focusId][node.id]));
        var external = !node.meta && focusGroup !== "" && node.group !== focusGroup;
        context.globalAlpha = (focusId && !focused ? 0.15 : 1) * (nodeVisible(node) ? 1 : 0.15) * (external ? 0.5 : 1);
        context.fillStyle = layerColors[node.layer] || "#64748b";
        context.beginPath();
        context.arc(node.x, node.y, node.size, 0, 2 * Math.PI);
        context.fill();
        if (external) {
          context.strokeStyle = layerColors[node.layer] || "#64748b";
          context.lineWidth = 1.4;
          context.setLineDash([4, 3]);
          context.beginPath();
          context.arc(node.x, node.y, node.size + 2, 0, 2 * Math.PI);
          context.stroke();
          context.setLineDash([]);
        }
        if (!node.meta && node.status !== "active") {
          context.strokeStyle = node.status === "draft" ? "#d97706" : "#94a3b8";
          context.lineWidth = 2;
          context.setLineDash(node.status === "draft" ? [] : [3, 2]);
          context.beginPath();
          context.arc(node.x, node.y, node.size, 0, 2 * Math.PI);
          context.stroke();
          context.setLineDash([]);
        }
        if (node.id === selected) {
          context.strokeStyle = "#0ea5e9";
          context.lineWidth = 2.5;
          context.beginPath();
          context.arc(node.x, node.y, node.size + 3, 0, 2 * Math.PI);
          context.stroke();
        }
        if (node.meta) {
          context.fillStyle = getComputedStyle(document.body).color;
          context.font = "600 12px system-ui, sans-serif";
          context.textAlign = "center";
          context.fillText(node.group, node.x, node.y + node.size + 14);
          context.font = "10px ui-monospace, monospace";
          context.fillText(node.count + " docs", node.x, node.y + node.size + 27);
          context.textAlign = "start";
        }
      });
      if (!isMeta) drawDocumentLabels(focusId, neighborMap);
      context.restore();
      context.globalAlpha = 1;
    }

    // Labels claim space greedily in priority order; a label that would sit
    // on an already-placed one tries right, then left, then below the node,
    // and otherwise stays hidden until the node is hovered or selected.
    function drawDocumentLabels(focusId, neighborMap) {
      var placedRects = [];
      function collides(rect) {
        for (var i = 0; i < placedRects.length; i++) {
          var other = placedRects[i];
          if (rect.x < other.x + other.w && other.x < rect.x + rect.w && rect.y < other.y + other.h && other.y < rect.y + rect.h) return true;
        }
        return false;
      }
      var bodyStyle = getComputedStyle(document.body);
      context.font = "10px ui-monospace, monospace";
      var ordered = active.nodes.slice().sort(function (a, b) {
        function priority(node) {
          if (node.id === hovered) return 4;
          if (node.id === selected) return 3;
          if (focusId && neighborMap[focusId] && neighborMap[focusId][node.id]) return 2;
          return Math.min(1, node.size / 20);
        }
        return priority(b) - priority(a) || b.size - a.size;
      });
      ordered.forEach(function (node) {
        var focused = focusId && (node.id === focusId || (neighborMap[focusId] && neighborMap[focusId][node.id]));
        if (focusId && !focused) return;
        if (!nodeVisible(node)) return;
        if (!(view.scale > 0.55 || focused || node.size > 10)) return;
        var external = focusGroup !== "" && node.group !== focusGroup;
        var text = node.id + (external ? "  (" + node.group + ")" : "");
        var width = context.measureText(text).width;
        var height = 12;
        var candidates = [
          { x: node.x + node.size + 4, y: node.y - height / 2 },
          { x: node.x - node.size - 4 - width, y: node.y - height / 2 },
          { x: node.x - width / 2, y: node.y + node.size + 3 }
        ];
        var spot = null;
        for (var i = 0; i < candidates.length && !spot; i++) {
          var rect = { x: candidates[i].x - 2, y: candidates[i].y - 1, w: width + 4, h: height + 2 };
          if (!collides(rect)) { spot = candidates[i]; placedRects.push(rect); }
        }
        var forced = node.id === hovered || node.id === selected || node.id === focusId;
        if (!spot && forced) { spot = candidates[0]; placedRects.push({ x: spot.x - 2, y: spot.y - 1, w: width + 4, h: height + 2 }); }
        if (!spot) return;
        context.globalAlpha = 0.85;
        context.fillStyle = bodyStyle.backgroundColor && bodyStyle.backgroundColor !== "rgba(0, 0, 0, 0)" ? bodyStyle.backgroundColor : "#ffffff";
        context.fillRect(spot.x - 2, spot.y - 1, width + 4, height + 2);
        context.globalAlpha = external ? 0.75 : 1;
        context.fillStyle = bodyStyle.color;
        context.fillText(text, spot.x, spot.y + height - 3);
      });
      context.globalAlpha = 1;
    }

    function toWorld(event) {
      var box = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - box.left - view.x) / view.scale,
        y: (event.clientY - box.top - view.y) / view.scale
      };
    }
    function pick(event) {
      var point = toWorld(event);
      for (var i = active.nodes.length - 1; i >= 0; i--) {
        var node = active.nodes[i];
        var dx = point.x - node.x, dy = point.y - node.y;
        if (dx * dx + dy * dy <= (node.size + 4) * (node.size + 4)) return node;
      }
      return null;
    }

    function fitView() {
      var radius = mode === "clusters" ? ringRadius + 160 : focusGroup === "" ? ringRadius + 260 : 420;
      view.scale = Math.min(1.1, Math.min(view.width, view.height) / (2 * radius));
      view.x = view.width / 2;
      view.y = view.height / 2;
    }

    function syncControls() {
      var buttons = { clusters: document.getElementById("view-clusters"), network: document.getElementById("view-network"), layers: document.getElementById("view-layers") };
      for (var key in buttons) if (buttons[key]) buttons[key].classList.toggle("active", key === (layersVisible ? "layers" : mode));
      var groupSelect = document.getElementById("group-filter");
      if (groupSelect) groupSelect.value = focusGroup;
      var crumb = document.getElementById("graph-crumb");
      if (!crumb) return;
      if (mode === "clusters") {
        crumb.innerHTML = "<span class='crumb-here'>Clusters overview</span><span class='muted'> — click a cluster for its contents, double-click to focus it</span>";
      } else if (focusGroup === "") {
        crumb.innerHTML = "<button class='crumb-link' data-go='clusters'>← Clusters</button><span class='crumb-sep'>/</span><span class='crumb-here'>All documents</span>";
      } else {
        crumb.innerHTML = "<button class='crumb-link' data-go='clusters'>← Clusters</button><span class='crumb-sep'>/</span><button class='crumb-link' data-go='all'>All documents</button><span class='crumb-sep'>/</span><span class='crumb-here'>" + focusGroup + "</span><span class='muted'> (+ direct neighbors)</span>";
      }
      crumb.querySelectorAll(".crumb-link").forEach(function (button) {
        button.addEventListener("click", function () {
          setMode(button.getAttribute("data-go") === "clusters" ? "clusters" : "network", "");
        });
      });
    }

    function closePanel() {
      panel.hidden = true;
      selected = null;
    }

    var layersVisible = false;
    function setMode(newMode, newFocus) {
      mode = newMode;
      focusGroup = newFocus;
      layersVisible = false;
      document.getElementById("network-view").hidden = false;
      document.getElementById("layers-view").hidden = true;
      rebuild();
      resize();
      fitView();
      syncControls();
    }

    var dragging = null, panning = null;
    canvas.addEventListener("mousedown", function (event) {
      var node = pick(event);
      if (node) { dragging = node; node.fixed = true; }
      else panning = { x: event.clientX - view.x, y: event.clientY - view.y };
    });
    window.addEventListener("mousemove", function (event) {
      if (dragging) {
        var point = toWorld(event);
        dragging.x = point.x; dragging.y = point.y;
        alpha = Math.max(alpha, 0.08);
      } else if (panning) {
        view.x = event.clientX - panning.x;
        view.y = event.clientY - panning.y;
      } else {
        var node = pick(event);
        hovered = node ? node.id : null;
        canvas.style.cursor = node ? "pointer" : "default";
      }
    });
    window.addEventListener("mouseup", function () {
      if (dragging) { dragging.fixed = false; dragging = null; }
      panning = null;
    });
    canvas.addEventListener("wheel", function (event) {
      event.preventDefault();
      var factor = event.deltaY < 0 ? 1.12 : 0.89;
      var box = canvas.getBoundingClientRect();
      var cx = event.clientX - box.left, cy = event.clientY - box.top;
      view.x = cx - (cx - view.x) * factor;
      view.y = cy - (cy - view.y) * factor;
      view.scale *= factor;
    }, { passive: false });
    canvas.addEventListener("click", function (event) {
      var node = pick(event);
      if (node) select(node.id);
      else closePanel();
    });
    canvas.addEventListener("dblclick", function (event) {
      var node = pick(event);
      if (!node) return;
      if (node.meta) setMode("network", node.group);
      else if (node.route) window.open(node.route, "_blank", "noopener");
    });

    function centerOn(node) {
      view.x = view.width / 2 - node.x * view.scale;
      view.y = view.height / 2 - node.y * view.scale;
    }

    function selectDocument(id) {
      var node = byId[id];
      if (!node) return;
      var inActive = active.nodes.indexOf(node) >= 0;
      if (mode === "clusters" || !inActive) {
        setMode("network", focusGroup === "" && mode !== "clusters" ? "" : node.group);
      }
      selected = id;
      var incoming = edges.filter(function (edge) { return edge.to === id; });
      var outgoing = edges.filter(function (edge) { return edge.from === id; });
      function list(items, key) {
        if (!items.length) return "<span class='muted'>none</span>";
        return items.map(function (edge) {
          var other = key === "from" ? edge.from : edge.to;
          return "<button class='net-jump' data-node='" + other + "'><code>" + other + "</code> <span class='muted'>" + edge.relation + " · " + byId[other].group + "</span></button>";
        }).join("");
      }
      panel.innerHTML =
        "<button class='net-close' title='Close (Esc)'>×</button>" +
        "<div class='net-title'><code>" + node.id + "</code> " + (node.route ? "<a class='net-open' href='" + node.route + "' target='_blank' rel='noopener'>Open document →</a>" : "") + "</div>" +
        "<div class='net-sub'>" + node.title + "</div>" +
        "<div class='net-sub'><code>" + node.type + "</code> · " + node.status + " · cluster <code>" + node.group + "</code> · depended on by <strong>" + node.inDeg + "</strong></div>" +
        "<div class='net-section'>Depends on / declares</div><div class='net-list'>" + list(outgoing, "to") + "</div>" +
        "<div class='net-section'>Referenced by</div><div class='net-list'>" + list(incoming, "from") + "</div>";
      panel.hidden = false;
      panel.querySelector(".net-close").addEventListener("click", closePanel);
      panel.querySelectorAll(".net-jump").forEach(function (button) {
        button.addEventListener("click", function () { selectDocument(button.getAttribute("data-node")); });
      });
      centerOn(node);
      alpha = Math.max(alpha, 0.02);
    }

    function selectCluster(group) {
      selected = group;
      var info = groupInfo[group];
      var members = nodes.filter(function (node) { return node.group === group; })
        .sort(function (a, b) { return b.inDeg - a.inDeg; });
      var links = metaEdges.filter(function (edge) { return (edge.from === group || edge.to === group) && metaEdgeCount(edge) > 0; })
        .map(function (edge) { return { other: edge.from === group ? edge.to : edge.from, count: metaEdgeCount(edge) }; })
        .sort(function (a, b) { return b.count - a.count; });
      panel.innerHTML =
        "<button class='net-close' title='Close (Esc)'>×</button>" +
        "<div class='net-title'><code>" + group + "</code></div>" +
        "<div class='net-sub'>" + info.count + " documents</div>" +
        "<button class='net-focus view-button active' data-group='" + group + "'>Focus this cluster →</button>" +
        "<div class='net-section'>Documents</div><div class='net-list'>" +
        members.map(function (node) { return "<button class='net-member' data-node='" + node.id + "'><code>" + node.id + "</code> <span class='muted'>×" + node.inDeg + "</span></button>"; }).join("") +
        "</div>" +
        "<div class='net-section'>Linked clusters</div><div class='net-list'>" +
        (links.length === 0 ? "<span class='muted'>none</span>" : links.map(function (link) { return "<button class='net-cluster-jump' data-group='" + link.other + "'><code>" + link.other + "</code> <span class='muted'>" + link.count + " links</span></button>"; }).join("")) +
        "</div>";
      panel.hidden = false;
      panel.querySelector(".net-close").addEventListener("click", closePanel);
      panel.querySelector(".net-focus").addEventListener("click", function () { setMode("network", group); });
      panel.querySelectorAll(".net-member").forEach(function (button) {
        button.addEventListener("click", function () { selectDocument(button.getAttribute("data-node")); });
      });
      panel.querySelectorAll(".net-cluster-jump").forEach(function (button) {
        button.addEventListener("click", function () { selectCluster(button.getAttribute("data-group")); });
      });
      var metaNode = metaById[group];
      if (mode === "clusters" && metaNode) centerOn(metaNode);
    }

    function select(id) {
      var node = (mode === "clusters" ? metaById[id] : byId[id]) || byId[id] || metaById[id];
      if (!node) { panel.hidden = true; return; }
      if (node.meta) selectCluster(node.id);
      else selectDocument(node.id);
    }

    document.querySelectorAll(".rank-chip").forEach(function (chip) {
      chip.addEventListener("click", function () { selectDocument(chip.getAttribute("data-node")); });
    });
    var search = document.getElementById("graph-search");
    if (search) search.addEventListener("input", function () {
      var query = search.value.trim().toUpperCase();
      if (query.length < 2) return;
      var match = nodes.find(function (node) { return node.id.indexOf(query) >= 0; });
      if (match) selectDocument(match.id);
    });
    document.querySelectorAll(".edge-toggle").forEach(function (box) {
      box.addEventListener("change", function () { enabledRelations[box.value] = box.checked; });
    });
    var statusSelect = document.getElementById("status-filter");
    if (statusSelect) statusSelect.addEventListener("change", function () { statusFilter = statusSelect.value; });
    var groupSelect = document.getElementById("group-filter");
    if (groupSelect) groupSelect.addEventListener("change", function () {
      if (groupSelect.value === "") setMode(mode === "clusters" ? "clusters" : "network", "");
      else setMode("network", groupSelect.value);
    });
    var buttonClusters = document.getElementById("view-clusters");
    var buttonNetwork = document.getElementById("view-network");
    var buttonLayers = document.getElementById("view-layers");
    if (buttonClusters) buttonClusters.addEventListener("click", function () { setMode("clusters", ""); });
    if (buttonNetwork) buttonNetwork.addEventListener("click", function () { setMode("network", focusGroup); });
    if (buttonLayers) buttonLayers.addEventListener("click", function () {
      layersVisible = true;
      document.getElementById("network-view").hidden = true;
      document.getElementById("layers-view").hidden = false;
      syncControls();
    });

    // Escape walks one step back out: close the detail panel first, then
    // leave the current view for the clusters overview.
    window.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || document.fullscreenElement) return;
      if (!panel.hidden) closePanel();
      else if (mode === "network") setMode("clusters", "");
    });
    var fullButton = document.getElementById("graph-full");
    if (fullButton) fullButton.addEventListener("click", function () {
      var wrap = canvas.parentElement;
      if (document.fullscreenElement) document.exitFullscreen();
      else if (wrap.requestFullscreen) wrap.requestFullscreen();
    });
    document.addEventListener("fullscreenchange", function () {
      resize();
      fitView();
      alpha = Math.max(alpha, 0.05);
    });

    rebuild();
    fitView();
    syncControls();
    step();
  }

  var graph = document.getElementById("graph");
  if (!graph) return;
  function applyFilters() {
    var enabled = {};
    document.querySelectorAll(".edge-toggle").forEach(function (box) { enabled[box.value] = box.checked; });
    graph.querySelectorAll(".edge").forEach(function (edge) {
      var relation = edge.getAttribute("class").match(/edge-([a-z_]+)/);
      edge.classList.toggle("hidden", relation ? !enabled[relation[1]] : false);
    });
    var status = document.getElementById("status-filter").value;
    graph.querySelectorAll(".node").forEach(function (node) {
      node.classList.toggle("dimmed", status !== "" && node.getAttribute("data-status") !== status);
    });
  }
  document.querySelectorAll(".edge-toggle").forEach(function (box) { box.addEventListener("change", applyFilters); });
  var statusFilter = document.getElementById("status-filter");
  if (statusFilter) statusFilter.addEventListener("change", applyFilters);
  graph.querySelectorAll(".node").forEach(function (node) {
    node.addEventListener("mouseenter", function () {
      var id = node.getAttribute("data-id");
      graph.querySelectorAll(".edge").forEach(function (edge) {
        var connected = edge.getAttribute("data-from") === id || edge.getAttribute("data-to") === id;
        edge.classList.toggle("focus", connected);
        edge.classList.toggle("dimmed", !connected);
      });
    });
    node.addEventListener("mouseleave", function () {
      graph.querySelectorAll(".edge").forEach(function (edge) {
        edge.classList.remove("focus");
        edge.classList.remove("dimmed");
      });
    });
  });
})();
`;

function resolveOutDir(root: string, out?: string): string {
  const resolved = path.resolve(root, out ?? path.join(projectPaths(root).cache, "site"));
  if (path.resolve(resolved) === path.resolve(root)) throw new SdlcError("Docs site output cannot be the project root.");
  if (isWithin(root, resolved)) {
    const relative = toPosix(path.relative(root, resolved));
    const managed = /^(0[0-5]-[a-z-]+|generated)(\/|$)/.test(relative);
    if (managed) throw new SdlcError(`Docs site output cannot live inside managed content: ${relative}`);
  }
  return resolved;
}

export async function buildDocsSite(root: string, options: DocsSiteOptions = {}): Promise<DocsSiteResult> {
  const outDir = resolveOutDir(root, options.out);
  if (!(await pathExists(projectPaths(root).config))) {
    throw new SdlcError(`Not an initialized documentation repository (missing ${path.basename(projectPaths(root).config)}): ${root}`);
  }
  const artifacts = await scanArtifacts(root);
  const graph = buildGraph(artifacts);
  const backlinks = collectBacklinks(graph);

  const pages: SitePage[] = [];
  for (const artifact of artifacts) {
    const isMarkdown = artifact.file.endsWith(".md");
    pages.push({
      route: routeFor(artifact.file),
      sourceFile: artifact.file,
      title: artifact.title || artifact.id,
      kind: isMarkdown ? "artifact" : "source",
      markdown: isMarkdown ? artifact.body : undefined,
      raw: isMarkdown ? undefined : artifact.body,
      artifact
    });
  }
  pages.push(...await collectSystemPages(root));
  pages.push(...await collectReportPages(root));

  const idRoutes = new Map<string, string>();
  for (const page of pages) if (page.artifact?.id) idRoutes.set(page.artifact.id, page.route);
  const matcher = buildIdMatcher([...idRoutes.keys()]);
  const projectLabel = await projectLabelFor(root);

  const mermaidSource = options.mermaidAsset && await pathExists(options.mermaidAsset)
    ? await readFile(options.mermaidAsset, "utf8")
    : null;

  let linkedTotal = 0;
  const rendered = new Map<string, string>();
  for (const page of pages) {
    let content: string;
    let withMermaid = false;
    if (page.markdown !== undefined) {
      let html = renderMarkdown(page.artifact ? stripLeadingHeading(page.markdown) : page.markdown);
      html = addHeadingAnchors(html);
      html = addRowAnchors(html);
      const linkified = linkifyIds(html, matcher, idRoutes, page.route);
      linkedTotal += linkified.linked;
      const header = page.artifact
        ? `<h1>${escapeHtml(page.artifact.id)} — ${escapeHtml(page.title)}</h1>` + supersededBanner(page.artifact, backlinks.get(page.artifact.id), idRoutes, page.route) + metadataPanel(page.artifact, backlinks.get(page.artifact.id), idRoutes, page.route)
        : `<h1>${escapeHtml(page.title)}</h1>`;
      content = header + linkified.html;
      withMermaid = mermaidSource !== null && content.includes("language-mermaid");
    } else {
      const header = page.artifact
        ? `<h1>${escapeHtml(page.artifact.id)} — ${escapeHtml(page.title)}</h1>` + metadataPanel(page.artifact, backlinks.get(page.artifact.id), idRoutes, page.route)
        : `<h1>${escapeHtml(page.title)}</h1><p class="muted"><code>${escapeHtml(page.sourceFile)}</code></p>`;
      content = header + sourceView(page, mermaidSource !== null);
      withMermaid = mermaidSource !== null && sourceLanguage(page.sourceFile) === "mermaid";
    }
    rendered.set(page.route, pageShell(page.title, page.route, buildNavigation(pages, page.route, projectLabel), content, projectLabel, withMermaid));
  }
  if (mermaidSource !== null) rendered.set("assets/mermaid.min.js", mermaidSource);

  rendered.set("index.html", pageShell("Overview", "index.html", buildNavigation(pages, "index.html", projectLabel), indexPage(pages, graph, projectLabel), projectLabel));
  const titles = new Map(artifacts.map((artifact) => [artifact.id, artifact.title || artifact.id]));
  rendered.set("graph.html", pageShell("Dependency graph", "graph.html", buildNavigation(pages, "graph.html", projectLabel), graphPage(graph, idRoutes, titles), projectLabel));
  rendered.set("assets/site.css", SITE_CSS);
  rendered.set("assets/site.js", SITE_JS);

  await writeSite(root, outDir, rendered);
  return {
    out: outDir,
    pages: rendered.size - 2,
    artifact_pages: pages.filter((page) => page.kind === "artifact").length,
    report_pages: pages.filter((page) => page.kind === "report").length,
    linked_ids: linkedTotal
  };
}

function supersededBanner(artifact: Artifact, backlinks: Backlinks | undefined, idRoutes: Map<string, string>, route: string): string {
  if (artifact.status !== "superseded" && artifact.status !== "retired") return "";
  const successors = backlinks?.superseded_by ?? [];
  const link = successors.length > 0 ? ` Successor: ${linkChips(successors, idRoutes, route)}` : "";
  return `<div class="banner">This artifact is <strong>${escapeHtml(artifact.status)}</strong> and no longer normative.${link}</div>`;
}

async function projectLabelFor(root: string): Promise<string> {
  try {
    const raw = await readFile(projectPaths(root).config, "utf8");
    const parsed = YAML.parse(raw) as { project_id?: string } | null;
    if (parsed?.project_id) return parsed.project_id;
  } catch {
    // Fall back to the directory name when the config is missing or invalid.
  }
  return path.basename(root);
}

async function writeSite(root: string, outDir: string, rendered: Map<string, string>): Promise<void> {
  const manifestPath = path.join(outDir, MANIFEST_FILE);
  if (await pathExists(outDir)) {
    if (await pathExists(manifestPath)) {
      const previous = JSON.parse(await readFile(manifestPath, "utf8")) as { files?: string[] };
      for (const file of previous.files ?? []) {
        const target = path.join(outDir, file);
        if (isWithin(outDir, target)) await rm(target, { force: true });
      }
    } else {
      const existing = await fg(["**/*"], { cwd: outDir, onlyFiles: true, dot: true });
      if (existing.length > 0) throw new SdlcError(`Docs site output directory is not empty and was not produced by docs build: ${outDir}`);
    }
  }
  const files = [...rendered.keys()].sort((a, b) => a.localeCompare(b));
  for (const file of files) {
    const target = path.join(outDir, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, rendered.get(file) ?? "", "utf8");
  }
  await writeFile(manifestPath, `${JSON.stringify({ schema_version: 1, files }, null, 2)}\n`, "utf8");
  // The cache directory is engine-owned scratch space; keep it out of git the
  // same way build caches conventionally self-ignore.
  const cacheDir = projectPaths(root).cache;
  if (isWithin(cacheDir, outDir)) {
    await mkdir(cacheDir, { recursive: true });
    await writeFile(path.join(cacheDir, ".gitignore"), "*\n", "utf8");
  }
}
