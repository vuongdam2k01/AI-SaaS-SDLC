import type { Artifact } from "./types.js";

/**
 * Dependency-free parsers for the two report formats a verification command
 * may declare, plus the case→specification join computed at execution time.
 * JUnit XML is emitted by nearly every real runner (vitest, jest, pytest, go,
 * dotnet, gradle); TAP is the trivial line protocol. Parsing is a strict
 * subset by design: a report the subset cannot read is recorded as a
 * report_error, never guessed at.
 */

export interface ReportCase {
  name: string;
  status: "passed" | "failed" | "skipped";
  /** Milliseconds when the report carries a time; null when it does not. */
  time_ms: number | null;
  /** The specification whose Implementation-mapping row matched, or null. */
  spec_id: string | null;
  /** The row's case IDs (TC-*), or null when no unambiguous row matched. */
  case_ids: string[] | null;
}

export interface ParsedReport {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  cases: Array<Pick<ReportCase, "name" | "status" | "time_ms">>;
}

function decodeXmlEntities(value: string): string {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&apos;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");
}

function attribute(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\b${name}="([^"]*)"`)) ?? tag.match(new RegExp(`\\b${name}='([^']*)'`));
  return match ? decodeXmlEntities(match[1] ?? "") : null;
}

export function parseJunit(content: string): ParsedReport {
  const source = content.replace(/<!--[\s\S]*?-->/g, "");
  const cases: ParsedReport["cases"] = [];
  const matcher = /<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g;
  for (const match of source.matchAll(matcher)) {
    const attributes = match[1] ?? "";
    const body = match[3] ?? "";
    const classname = attribute(attributes, "classname");
    const bare = attribute(attributes, "name") ?? "";
    const name = classname && !bare.startsWith(classname) ? `${classname} > ${bare}` : bare;
    const status: ReportCase["status"] = /<skipped\b/.test(body) ? "skipped" : /<(?:failure|error)\b/.test(body) ? "failed" : "passed";
    const seconds = Number(attribute(attributes, "time"));
    cases.push({ name, status, time_ms: Number.isFinite(seconds) ? Math.round(seconds * 1000) : null });
  }
  if (cases.length === 0 && !/<testsuite\b/.test(source)) throw new Error("Not a JUnit report: no <testsuite> or <testcase> elements found.");
  return summarize(cases);
}

export function parseTap(content: string): ParsedReport {
  const cases: ParsedReport["cases"] = [];
  let sawPlanOrResult = false;
  for (const line of content.split(/\r?\n/)) {
    if (/^\s*1\.\.\d+/.test(line)) { sawPlanOrResult = true; continue; }
    const match = line.match(/^\s*(not )?ok\b\s*\d*\s*(?:-\s*)?(.*)$/);
    if (!match) continue;
    sawPlanOrResult = true;
    const directive = match[2]?.match(/#\s*(SKIP|TODO)/i);
    const name = (match[2] ?? "").replace(/#\s*(SKIP|TODO).*$/i, "").trim();
    cases.push({ name, status: directive ? "skipped" : match[1] ? "failed" : "passed", time_ms: null });
  }
  if (!sawPlanOrResult) throw new Error("Not a TAP report: no plan or ok/not ok lines found.");
  return summarize(cases);
}

function summarize(cases: ParsedReport["cases"]): ParsedReport {
  return {
    total: cases.length,
    passed: cases.filter((item) => item.status === "passed").length,
    failed: cases.filter((item) => item.status === "failed").length,
    skipped: cases.filter((item) => item.status === "skipped").length,
    cases
  };
}

export interface MappingRow {
  spec_id: string;
  case_ids: string[];
  symbol: string;
  test_path: string;
}

/**
 * The Implementation-mapping rows of one specification body:
 * `| Case IDs | Test path | Test name or symbol | Production symbol |`.
 * The symbol column is the join key a report's case names are matched against.
 */
/** A divider cell, including the alignment forms a markdown formatter writes. */
const DIVIDER_CELL = /^:?-+:?$/;

/** Cell text as the parser reads it: backticks are decoration, not content. */
function cellValue(cell: string | undefined): string {
  return (cell ?? "").replace(/`/g, "").trim();
}

function mappingTableLines(spec: Artifact): string[] {
  const normalized = spec.body.replace(/\r\n/g, "\n");
  const section = normalized.split(/^## Implementation mapping\s*$/m)[1];
  if (!section) return [];
  const lines: string[] = [];
  let fenced = false;
  for (const line of (section.split(/^## /m)[0] ?? "").split("\n")) {
    // A fenced block inside the section is an example, not mapping: it must
    // neither be parsed as a live row nor reported as an ignored one.
    if (/^\s*(?:```|~~~)/.test(line)) { fenced = !fenced; continue; }
    if (!fenced) lines.push(line);
  }
  return lines;
}

export function implementationMappingRows(spec: Artifact): MappingRow[] {
  const rows: MappingRow[] = [];
  for (const line of mappingTableLines(spec)) {
    const cells = line.split("|").map((cell) => cell.trim());
    // A table line splits into ["", cell, cell, cell, cell, ""]; skip the
    // header ("Case IDs" or the singular authors sometimes write) and its
    // divider.
    if (cells.length < 6 || /^Case IDs?$/.test(cells[1] ?? "") || DIVIDER_CELL.test(cells[1] ?? "")) continue;
    const caseIds = [...(cells[1] ?? "").matchAll(/\bTC-[0-9]+\b/g)].map((match) => match[0]);
    const symbol = cellValue(cells[3]);
    const testPath = cellValue(cells[2]);
    if (caseIds.length === 0 || symbol.length === 0 || symbol.startsWith("<") || testPath.startsWith("<")) continue;
    rows.push({ spec_id: spec.id, case_ids: caseIds, symbol, test_path: testPath });
  }
  return rows;
}

export interface IgnoredMappingRow {
  spec_id: string;
  snippet: string;
  reason: string;
}

/**
 * The rows `implementationMappingRows` silently drops, classified. A silent
 * drop is indistinguishable from "not written yet" to the author, so each
 * dropped row that carries real content becomes a named reason; untouched
 * template rows (every filled cell still a `<placeholder>`) stay silent —
 * they are scaffolding, not mistakes.
 */
export function ignoredImplementationMappingRows(spec: Artifact): IgnoredMappingRow[] {
  const ignored: IgnoredMappingRow[] = [];
  for (const line of mappingTableLines(spec)) {
    const trimmed = line.trim();
    const bounded = trimmed.startsWith("|");
    // A table written without leading and trailing pipes is valid markdown and
    // is dropped whole by the parser, so it is diagnosed rather than ignored.
    if (!bounded && (trimmed.match(/\|/g) ?? []).length < 3) continue;
    const cells = trimmed.split("|").map((cell) => cell.trim());
    const content = bounded ? cells.slice(1, -1) : cells;
    const first = content[0] ?? "";
    if (/^Case IDs?$/.test(first) || DIVIDER_CELL.test(cellValue(first))) continue;
    if (content.every((cell) => { const value = cellValue(cell); return value.length === 0 || value.startsWith("<") || DIVIDER_CELL.test(value); })) continue;
    let reason: string | null = null;
    if (!bounded) reason = "table rows must use leading and trailing pipes";
    else if (content.length < 4) reason = "expected at least four columns";
    else if ([...first.matchAll(/\bTC-[0-9]+\b/g)].length === 0) reason = "no TC-nn case ID in the first column";
    else if (cellValue(content[1]).length === 0 || cellValue(content[1]).startsWith("<")) reason = "test path is empty or a placeholder";
    else if (cellValue(content[2]).length === 0 || cellValue(content[2]).startsWith("<")) reason = "test symbol is empty or a placeholder";
    if (reason) ignored.push({ spec_id: spec.id, snippet: trimmed.slice(0, 120), reason });
  }
  return ignored;
}

/**
 * Join report cases to specification rows by the declared symbol. Exact name
 * equality wins; otherwise rows whose symbol the case name contains (runners
 * prepend suite names) compete, and the strictly longest symbol takes it — a
 * row naming "rejects a double decision" beats one naming "decision". A tie
 * is ambiguity, and ambiguity resolves to null: a wrong join is worse than an
 * absent one.
 */
export function joinCasesToSpecs(cases: ParsedReport["cases"], specs: Artifact[]): ReportCase[] {
  const rows = specs.flatMap((spec) => implementationMappingRows(spec));
  return cases.map((reportCase) => {
    const exact = rows.filter((row) => row.symbol === reportCase.name);
    const candidates = exact.length > 0 ? exact : rows.filter((row) => row.symbol.length > 0 && reportCase.name.includes(row.symbol));
    const sorted = [...candidates].sort((a, b) => b.symbol.length - a.symbol.length);
    const winner = sorted.length === 1 || (sorted.length > 1 && sorted[0]!.symbol.length > sorted[1]!.symbol.length) ? sorted[0] : undefined;
    if (!winner) return { ...reportCase, spec_id: null, case_ids: null };
    return { ...reportCase, spec_id: winner.spec_id, case_ids: winner.case_ids };
  });
}
