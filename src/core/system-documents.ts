import { readFile } from "node:fs/promises";
import path from "node:path";
import { allSections, completedRows, headingKey, markdownTables, meaningful, sections } from "./markdown.js";
import type { PatternContentContract, SystemDocumentContract } from "./pattern-catalog.js";
import { loadPatternCatalog } from "./pattern-catalog.js";
import { assertSafeManagedPath } from "./paths.js";
import { pathExists } from "./state.js";
import type { ValidationFinding } from "./types.js";

function tableMatches(columns: string[], required: string[]): boolean {
  return required.every((column, index) => headingKey(columns[index] ?? "") === headingKey(column));
}

/**
 * What one `00-system` document owes, expressed as the reasons it can fall short.
 *
 * The four documents under `00-system` state the repository's own rules —
 * authority, lifecycle, vocabulary and what validation means — and until now
 * nothing checked them. `scanArtifacts` reads only layers 01 through 05, so a
 * project could gut its own document rules and every command would still report
 * a clean repository. That is the failure these contracts close, and they close
 * it without making the documents artifacts: they stay out of the graph, the
 * baseline manifest and every projection, so no existing repository sees its
 * artifact count or generated views move.
 */
function checkDocument(relative: string, body: string, contract: PatternContentContract): string[] {
  const problems: string[] = [];
  const byHeading = new Map(sections(body).map((section) => [headingKey(section.title), section]));
  const allByHeading = new Map(allSections(body).map((section) => [headingKey(section.title), section]));
  for (const heading of contract.required_headings) {
    const section = byHeading.get(headingKey(heading));
    if (!section) problems.push(`missing section "${heading}"`);
    else if (!meaningful(section.body)) problems.push(`empty section "${heading}"`);
  }
  for (const required of contract.required_tables) {
    const section = allByHeading.get(headingKey(required.heading));
    if (!section) continue;
    const table = markdownTables(section.body).find((candidate) => tableMatches(candidate.columns, required.columns));
    if (!table) problems.push(`missing the required table under "${required.heading}"`);
    else if (completedRows(table).length < required.min_rows) problems.push(`fewer than ${required.min_rows} completed row(s) under "${required.heading}"`);
  }
  for (const local of contract.local_ids) {
    let matcher: RegExp;
    try { matcher = new RegExp(local.pattern, "gm"); } catch { continue; }
    if (new Set(body.match(matcher) ?? []).size < local.minimum) problems.push(`fewer than ${local.minimum} ${local.namespace} ID(s)`);
  }
  return problems.map((problem) => `${relative} ${problem}`);
}

/**
 * Reported as warnings, unlike every other content contract.
 *
 * These documents ship with the project template and a repository initialized
 * under an older template legitimately carries an older copy — `patterns
 * migrate` re-pins contracts, not system documentation. An error would leave
 * that repository unable to baseline for a shortfall it did not author and
 * cannot repair by editing its own product content. The warning is the durable
 * record instead, and closing it means bringing the document forward.
 */
export async function systemDocumentFindings(root: string): Promise<ValidationFinding[]> {
  const catalogRoot = path.join(root, "00-system", "patterns");
  if (!(await pathExists(path.join(catalogRoot, "catalog.yaml"))) && !(await pathExists(path.join(catalogRoot, "catalog.yml")))) return [];
  let documents: SystemDocumentContract[];
  try {
    documents = (await loadPatternCatalog(catalogRoot, root)).system_documents;
  } catch {
    // A broken or tampered pin is already reported as PATTERN_CATALOG_INVALID by
    // the content-contract pass; repeating it here would double-count one fault.
    return [];
  }
  const findings: ValidationFinding[] = [];
  for (const document of documents) {
    const relative = document.path.replaceAll("\\", "/");
    const file = path.join(root, relative);
    if (!(await pathExists(file))) {
      findings.push({ severity: "warning", code: "SYSTEM_DOCUMENT_INCOMPLETE", message: `${relative} is declared by the pinned catalog and absent from this repository; restore it from the project template.`, file: relative });
      continue;
    }
    await assertSafeManagedPath(root, file);
    const problems = checkDocument(relative, await readFile(file, "utf8"), document.content);
    for (const problem of problems) {
      findings.push({ severity: "warning", code: "SYSTEM_DOCUMENT_INCOMPLETE", message: `${problem}; this repository's own rules are stated here, so a gap here is a gap in every rule downstream work is graded against.`, file: relative });
    }
  }
  return findings;
}
