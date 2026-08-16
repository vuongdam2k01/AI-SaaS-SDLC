import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { SdlcError } from "./errors.js";
import { assertSafeManagedPath, isWithin } from "./paths.js";
import { pathExists } from "./state.js";
import { CANONICAL_MARKDOWN, SCALABLE_EXAMPLE_IDS, SCALABLE_LOCATIONS } from "./artifact-contracts.js";
import { verifyPatternSnapshot } from "./pattern-snapshot.js";

export interface PatternTableContract {
  heading: string;
  columns: string[];
  min_rows: number;
}

export interface PatternLocalIdContract {
  namespace: string;
  pattern: string;
  minimum: number;
}

export interface PatternContentContract {
  required_headings: string[];
  required_tables: PatternTableContract[];
  local_ids: PatternLocalIdContract[];
  placeholder_patterns: string[];
}

export interface ArtifactPattern {
  artifact_type: string;
  template: string;
  target: string;
  id_pattern: string;
  content: PatternContentContract;
}

export interface FoundationPattern {
  artifact_type: string;
  path: string;
  content: PatternContentContract;
}

/**
 * A `00-system` document: shipped system documentation the engine does not scan
 * as an artifact, and therefore something no content contract reached before.
 * It has a path and a shape but no artifact type, because it never enters the
 * graph, the baseline manifest or any projection.
 */
export interface SystemDocumentContract {
  path: string;
  content: PatternContentContract;
}

export interface PatternCatalog {
  version: string;
  root: string;
  patterns: ArtifactPattern[];
  foundations: FoundationPattern[];
  system_documents: SystemDocumentContract[];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
}

function normalizeTable(value: unknown): PatternTableContract | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const columns = strings(row.columns);
  const minimum = row.min_rows === undefined ? 1 : Number(row.min_rows);
  if (typeof row.heading !== "string" || row.heading.trim() === "" || columns.length === 0 || !Number.isInteger(minimum) || minimum < 0) return null;
  return { heading: row.heading, columns, min_rows: minimum };
}

function normalizeLocalId(value: unknown): PatternLocalIdContract | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const minimum = row.minimum === undefined ? 1 : Number(row.minimum);
  if (typeof row.pattern !== "string" || row.pattern.trim() === "" || row.pattern.includes("\\\\") || !Number.isInteger(minimum) || minimum < 0) return null;
  try { new RegExp(row.pattern, "gm"); } catch { return null; }
  return {
    namespace: typeof row.namespace === "string" ? row.namespace : row.pattern,
    pattern: row.pattern,
    minimum
  };
}

function normalizeContent(artifactType: string, content: Record<string, unknown>, requireHeadings = false): PatternContentContract {
  if (content.required_headings !== undefined && (!Array.isArray(content.required_headings) || strings(content.required_headings).length !== content.required_headings.length)) throw new SdlcError(`${artifactType} required_headings must be an array of strings.`);
  if (content.required_tables !== undefined && !Array.isArray(content.required_tables)) throw new SdlcError(`${artifactType} required_tables must be an array of table contracts.`);
  const tables = (Array.isArray(content.required_tables) ? content.required_tables : []).map(normalizeTable);
  if (tables.some((item) => item === null)) throw new SdlcError(`${artifactType} contains a malformed required table contract.`);
  const rawLocalIds = content.local_ids ?? content.local_id_patterns;
  if (rawLocalIds !== undefined && !Array.isArray(rawLocalIds)) throw new SdlcError(`${artifactType} local_ids must be an array of namespace contracts.`);
  const localIds = (Array.isArray(rawLocalIds) ? rawLocalIds : []).map(normalizeLocalId);
  if (localIds.some((item) => item === null)) throw new SdlcError(`${artifactType} contains a malformed local ID contract.`);
  if (content.placeholder_patterns !== undefined && (!Array.isArray(content.placeholder_patterns) || strings(content.placeholder_patterns).length !== content.placeholder_patterns.length)) throw new SdlcError(`${artifactType} placeholder_patterns must be an array of regex strings.`);
  for (const source of strings(content.placeholder_patterns)) {
    try { new RegExp(source, "im"); } catch { throw new SdlcError(`${artifactType} contains an invalid placeholder regex: ${source}`); }
  }
  const requiredHeadings = strings(content.required_headings);
  if (requireHeadings && requiredHeadings.length === 0) throw new SdlcError(`${artifactType} foundation contract requires required_headings.`);
  return {
    required_headings: requiredHeadings,
    required_tables: tables as PatternTableContract[],
    local_ids: localIds as PatternLocalIdContract[],
    placeholder_patterns: strings(content.placeholder_patterns)
  };
}

function normalizePattern(value: unknown, fallbackType?: string): ArtifactPattern | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const artifactType = typeof row.artifact_type === "string" ? row.artifact_type : fallbackType;
  const template = typeof row.template === "string" ? row.template : typeof row.source === "string" ? row.source : "";
  const target = typeof row.target === "string" ? row.target : typeof row.instance_path === "string" ? row.instance_path : "";
  const idPattern = typeof row.id_pattern === "string" ? row.id_pattern : typeof row.id_regex === "string" ? row.id_regex : "";
  if (!artifactType || !template || !target || !idPattern) return null;
  const content = row.content && typeof row.content === "object" ? row.content as Record<string, unknown> : row;
  return {
    artifact_type: artifactType,
    template,
    target,
    id_pattern: idPattern,
    content: normalizeContent(artifactType, content)
  };
}

function normalizeSystemDocument(value: unknown, fallbackPath?: string): SystemDocumentContract | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const targetPath = typeof row.path === "string" ? row.path : fallbackPath;
  if (!targetPath) return null;
  const content = row.content && typeof row.content === "object" ? row.content as Record<string, unknown> : row;
  return { path: targetPath, content: normalizeContent(targetPath, content, true) };
}

function normalizeFoundation(value: unknown, fallbackType?: string): FoundationPattern | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const artifactType = typeof row.artifact_type === "string" ? row.artifact_type : fallbackType;
  const targetPath = typeof row.path === "string" ? row.path : "";
  if (!artifactType || !targetPath) return null;
  const content = row.content && typeof row.content === "object" ? row.content as Record<string, unknown> : row;
  return { artifact_type: artifactType, path: targetPath, content: normalizeContent(artifactType, content, true) };
}

async function assertSourceFile(root: string, file: string): Promise<void> {
  if (!isWithin(root, file)) throw new SdlcError(`Pattern source escapes its catalog root: ${file}`);
  const info = await lstat(file);
  if (info.isSymbolicLink() || !info.isFile()) throw new SdlcError(`Pattern source must be a regular file: ${file}`);
  const [realRoot, realFile] = await Promise.all([realpath(root), realpath(file)]);
  if (!isWithin(realRoot, realFile)) throw new SdlcError(`Pattern source resolves outside its catalog root: ${file}`);
}

export async function loadPatternCatalog(catalogRoot: string, projectRoot?: string): Promise<PatternCatalog> {
  const root = path.resolve(catalogRoot);
  if (projectRoot) await verifyPatternSnapshot(projectRoot, root);
  const candidates = [path.join(root, "catalog.yaml"), path.join(root, "catalog.yml")];
  const file = (await Promise.all(candidates.map(async (candidate) => await pathExists(candidate) ? candidate : null))).find(Boolean);
  if (!file) throw new SdlcError(`Pattern catalog is missing from ${root}.`);
  if (projectRoot) await assertSafeManagedPath(projectRoot, file);
  else await assertSourceFile(root, file);
  const raw = YAML.parse(await readFile(file, "utf8")) as unknown;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new SdlcError(`Pattern catalog must be a mapping: ${file}`);
  const data = raw as Record<string, unknown>;
  const collection = data.patterns ?? data.artifact_patterns;
  const entries = Array.isArray(collection)
    ? collection.map((item) => normalizePattern(item))
    : collection && typeof collection === "object"
      ? Object.entries(collection as Record<string, unknown>).map(([type, item]) => normalizePattern(item, type)) : [];
  const patterns = entries.filter(Boolean) as ArtifactPattern[];
  if (patterns.length === 0 || patterns.length !== entries.length) throw new SdlcError(`Pattern catalog contains incomplete entries: ${file}`);
  if (new Set(patterns.map((item) => item.artifact_type)).size !== patterns.length) throw new SdlcError("Pattern catalog artifact types must be unique.");
  for (const pattern of patterns) {
    try { new RegExp(pattern.id_pattern); } catch { throw new SdlcError(`Invalid ID pattern for ${pattern.artifact_type}: ${pattern.id_pattern}`); }
    if (path.isAbsolute(pattern.template) || path.isAbsolute(pattern.target) || pattern.target.includes("..")) throw new SdlcError(`Unsafe catalog path for ${pattern.artifact_type}.`);
    const exampleId = SCALABLE_EXAMPLE_IDS[pattern.artifact_type];
    const exampleTarget = pattern.target.replaceAll("{{ID}}", exampleId ?? "").replaceAll("{id}", exampleId ?? "").replaceAll("\\", "/");
    if (!exampleId || exampleTarget.includes("{{") || !SCALABLE_LOCATIONS[pattern.artifact_type]?.test(exampleTarget)) throw new SdlcError(`Catalog target violates the approved location for ${pattern.artifact_type}: ${pattern.target}`);
    await assertSourceFile(root, path.resolve(root, pattern.template));
  }
  const foundationCollection = data.foundations;
  const foundationEntries = Array.isArray(foundationCollection)
    ? foundationCollection.map((item) => normalizeFoundation(item))
    : foundationCollection && typeof foundationCollection === "object"
      ? Object.entries(foundationCollection as Record<string, unknown>).map(([type, item]) => normalizeFoundation(item, type)) : [];
  const foundations = foundationEntries.filter(Boolean) as FoundationPattern[];
  if (foundations.length !== foundationEntries.length) throw new SdlcError(`Pattern catalog contains incomplete foundation entries: ${file}`);
  for (const foundation of foundations) {
    if (path.isAbsolute(foundation.path) || foundation.path.split(/[\\/]/).includes("..")) throw new SdlcError(`Unsafe foundation path for ${foundation.artifact_type}.`);
    const normalizedPath = foundation.path.replaceAll("\\", "/");
    const canonical = CANONICAL_MARKDOWN[normalizedPath as keyof typeof CANONICAL_MARKDOWN];
    if (!canonical || canonical[1] !== foundation.artifact_type) throw new SdlcError(`Foundation contract does not match a canonical path and type: ${foundation.path} (${foundation.artifact_type}).`);
  }
  if (new Set(foundations.map((item) => item.artifact_type)).size !== foundations.length) throw new SdlcError("Foundation artifact types must be unique.");
  if (new Set(foundations.map((item) => item.path.replaceAll("\\", "/"))).size !== foundations.length) throw new SdlcError("Foundation paths must be unique.");
  const documentCollection = data.system_documents;
  const documentEntries = Array.isArray(documentCollection)
    ? documentCollection.map((item) => normalizeSystemDocument(item))
    : documentCollection && typeof documentCollection === "object"
      ? Object.entries(documentCollection as Record<string, unknown>).map(([documentPath, item]) => normalizeSystemDocument(item, documentPath)) : [];
  const systemDocuments = documentEntries.filter(Boolean) as SystemDocumentContract[];
  if (systemDocuments.length !== documentEntries.length) throw new SdlcError(`Pattern catalog contains incomplete system-document entries: ${file}`);
  for (const document of systemDocuments) {
    const normalizedPath = document.path.replaceAll("\\", "/");
    if (path.isAbsolute(document.path) || normalizedPath.split("/").includes("..")) throw new SdlcError(`Unsafe system-document path: ${document.path}.`);
    // Confined to 00-system and never into the pinned catalog: these contracts
    // describe shipped system documentation, and a path reaching anywhere else
    // would silently duplicate an authority that already has an owner.
    if (!normalizedPath.startsWith("00-system/") || normalizedPath.startsWith("00-system/patterns/")) throw new SdlcError(`System-document contracts cover 00-system documents only: ${document.path}.`);
  }
  if (new Set(systemDocuments.map((item) => item.path.replaceAll("\\", "/"))).size !== systemDocuments.length) throw new SdlcError("System-document paths must be unique.");
  return {
    version: String(data.version ?? data.schema_version ?? "1"), root,
    patterns: patterns.sort((a, b) => a.artifact_type.localeCompare(b.artifact_type)),
    foundations: foundations.sort((a, b) => a.artifact_type.localeCompare(b.artifact_type)),
    system_documents: systemDocuments.sort((a, b) => a.path.localeCompare(b.path))
  };
}

export async function resolveCatalog(root: string, runtimeRoot: string): Promise<PatternCatalog> {
  const pinned = path.join(root, "00-system", "patterns");
  const hasPinned = await pathExists(path.join(pinned, "catalog.yaml")) || await pathExists(path.join(pinned, "catalog.yml"));
  if (hasPinned) return loadPatternCatalog(pinned, root);
  if (await pathExists(path.join(root, "sdlc.config.yaml"))) throw new SdlcError("Initialized repository is missing its pinned pattern catalog; run an explicit migration before creating artifacts.");
  return loadPatternCatalog(path.join(runtimeRoot, "resources", "artifact-patterns"));
}
