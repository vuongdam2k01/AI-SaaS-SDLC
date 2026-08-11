import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Artifact, ValidationFinding } from "./types.js";
import { isLiveStatus } from "./types.js";
import type { ArtifactPattern, PatternContentContract, PatternTableContract } from "./pattern-catalog.js";
import { loadPatternCatalog } from "./pattern-catalog.js";
import { pathExists } from "./state.js";
import { CANONICAL_TYPES, FIXED_TYPES, SCALABLE_LOCATIONS } from "./artifact-contracts.js";
import { allSections, completedRows, headingKey, markdownTables, meaningful, sections } from "./markdown.js";

function deriveContract(template: string): PatternContentContract {
  const templateSections = sections(template);
  const requiredTables: PatternTableContract[] = [];
  for (const section of allSections(template)) {
    for (const table of markdownTables(section.body)) requiredTables.push({ heading: section.title, columns: table.columns, min_rows: 1 });
  }
  return {
    required_headings: templateSections.map((section) => section.title),
    required_tables: requiredTables,
    local_ids: [],
    placeholder_patterns: []
  };
}

function mergedContract(pattern: ArtifactPattern, derived: PatternContentContract): PatternContentContract {
  return {
    required_headings: pattern.content.required_headings.length > 0 ? pattern.content.required_headings : derived.required_headings,
    required_tables: pattern.content.required_tables.length > 0 ? pattern.content.required_tables : derived.required_tables,
    local_ids: pattern.content.local_ids,
    placeholder_patterns: pattern.content.placeholder_patterns
  };
}

function regexForTemplate(value: string): RegExp {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\{\\\{[A-Z0-9_]+\\\}\\\}/g, "[\\s\\S]+?");
  return new RegExp(`^${escaped.replace(/\s+/g, "\\s+")}$`, "i");
}

function tableMatches(columns: string[], required: string[]): boolean {
  const actual = columns.map(headingKey);
  return required.every((column) => actual.includes(headingKey(column)));
}

function placeholderPatterns(contract: PatternContentContract): RegExp[] {
  const defaults = ["\\{\\{[^}]+\\}\\}", "\\[TODO(?::[^\\]]*)?\\]", "<[a-z][^>\\n]{1,100}>", "\\bTBD\\b", "^-\\s*\\[ \\]"];
  return [...defaults, ...contract.placeholder_patterns].map((source) => new RegExp(source, "im"));
}

async function validateAgainstContract(artifact: Artifact, contract: PatternContentContract, template?: string): Promise<ValidationFinding[]> {
  const findings: ValidationFinding[] = [];
  const actualSections = sections(artifact.body);
  const byHeading = new Map(actualSections.map((section) => [headingKey(section.title), section]));
  const allByHeading = new Map(allSections(artifact.body).map((section) => [headingKey(section.title), section]));
  const templateByHeading = new Map(sections(template ?? "").map((section) => [headingKey(section.title), section]));
  for (const heading of contract.required_headings) {
    const section = byHeading.get(headingKey(heading));
    if (!section) findings.push({ severity: "error", code: "CONTENT_HEADING_MISSING", message: `${artifact.id} is missing required section: ${heading}`, file: artifact.file });
    else if (!meaningful(section.body)) findings.push({ severity: "error", code: "CONTENT_SECTION_EMPTY", message: `${artifact.id} has an empty required section: ${heading}`, file: artifact.file });
    else {
      const templateSection = templateByHeading.get(headingKey(heading));
      if (templateSection && meaningful(templateSection.body) && regexForTemplate(templateSection.body).test(section.body)) {
        findings.push({ severity: "error", code: "CONTENT_TEMPLATE_UNCHANGED", message: `${artifact.id} retains unchanged template content in: ${heading}`, file: artifact.file });
      }
    }
  }
  for (const required of contract.required_tables) {
    const section = allByHeading.get(headingKey(required.heading));
    if (!section) continue;
    const table = markdownTables(section.body).find((candidate) => tableMatches(candidate.columns, required.columns));
    if (!table) findings.push({ severity: "error", code: "CONTENT_TABLE_MISSING", message: `${artifact.id} is missing the required table under ${required.heading}`, file: artifact.file });
    else {
      const validRows = completedRows(table);
      if (validRows.length < required.min_rows) findings.push({ severity: "error", code: "CONTENT_TABLE_EMPTY", message: `${artifact.id} requires ${required.min_rows} completed row(s) under ${required.heading}`, file: artifact.file });
    }
  }
  const placeholderSurface = artifact.body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<https?:\/\/[^>]+>/gi, "")
    .replace(/<\/?(?:table|thead|tbody|tfoot|tr|th|td|br|details|summary)(?:\s[^>]*)?>/gi, "");
  for (const matcher of placeholderPatterns(contract)) if (matcher.test(placeholderSurface)) {
    findings.push({ severity: "error", code: "CONTENT_PLACEHOLDER", message: `${artifact.id} contains an unresolved placeholder matching ${matcher.source}`, file: artifact.file });
  }
  for (const local of contract.local_ids) {
    let matcher: RegExp;
    try { matcher = new RegExp(local.pattern, "gm"); } catch {
      findings.push({ severity: "error", code: "CONTENT_CONTRACT_INVALID", message: `${artifact.artifact_type} has an invalid local ID contract: ${local.namespace}`, file: artifact.file });
      continue;
    }
    const ids = new Set(artifact.body.match(matcher) ?? []);
    if (ids.size < local.minimum) findings.push({ severity: "error", code: "CONTENT_LOCAL_ID_MISSING", message: `${artifact.id} requires at least ${local.minimum} ${local.namespace} ID(s)`, file: artifact.file });
  }
  return findings;
}

async function validateArtifact(artifact: Artifact, pattern: ArtifactPattern, catalogRoot: string): Promise<ValidationFinding[]> {
  const template = await readFile(path.join(catalogRoot, pattern.template), "utf8");
  return validateAgainstContract(artifact, mergedContract(pattern, deriveContract(template)), template);
}

export async function validateActiveArtifactContent(root: string, artifacts: Artifact[]): Promise<ValidationFinding[]> {
  const catalogRoot = path.join(root, "00-system", "patterns");
  if (!(await pathExists(path.join(catalogRoot, "catalog.yaml"))) && !(await pathExists(path.join(catalogRoot, "catalog.yml")))) {
    return [{ severity: "error", code: "PATTERN_SNAPSHOT_MISSING", message: "Pinned pattern snapshot is missing; an explicit migration is required before validation or baselining." }];
  }
  const catalog = await loadPatternCatalog(catalogRoot, root);
  const patterns = new Map(catalog.patterns.map((pattern) => [pattern.artifact_type, pattern]));
  const foundations = new Map(catalog.foundations.map((foundation) => [foundation.artifact_type, foundation]));
  const findings: ValidationFinding[] = [];
  for (const artifact of artifacts.filter((item) => isLiveStatus(item.status))) {
    const pattern = patterns.get(artifact.artifact_type);
    if (pattern) {
      findings.push(...await validateArtifact(artifact, pattern, catalog.root));
      continue;
    }
    const foundation = foundations.get(artifact.artifact_type);
    if (foundation) {
      if (artifact.file !== foundation.path.replaceAll("\\", "/")) findings.push({ severity: "error", code: "CONTENT_CONTRACT_PATH", message: `${artifact.id} does not match its foundation contract path ${foundation.path}`, file: artifact.file });
      findings.push(...await validateAgainstContract(artifact, foundation.content));
    } else if (CANONICAL_TYPES.has(artifact.artifact_type)) {
      findings.push({ severity: "error", code: "CONTENT_CONTRACT_MISSING", message: `${artifact.id} has no pinned foundation content contract.`, file: artifact.file });
    } else if (SCALABLE_LOCATIONS[artifact.artifact_type] && !FIXED_TYPES.has(artifact.artifact_type)) {
      // The engine knows this type but the repository's pin predates it. Without
      // this finding the artifact would silently escape every content contract,
      // which is worse than an unknown type: it looks validated and is not.
      findings.push({ severity: "error", code: "CONTENT_CONTRACT_UNPINNED", message: `${artifact.id} has scalable type ${artifact.artifact_type}, which this repository's pinned pattern catalog predates; re-initialize or migrate the pinned catalog before activating it.`, file: artifact.file });
    }
  }
  return findings;
}
