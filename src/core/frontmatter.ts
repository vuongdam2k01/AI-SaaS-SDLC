import YAML from "yaml";
import type { ArtifactMeta } from "./types.js";
import { SdlcError } from "./errors.js";

export function parseFrontmatter(content: string, file: string): { data: Record<string, unknown>; body: string } {
  // Windows editors and PowerShell's default UTF-8 writer prepend a byte order
  // mark. It is invisible to the author, and without stripping it the file reads
  // as having no frontmatter at all, which fails every artifact in the
  // repository over an edit the author cannot see.
  const withoutBom = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  if (!withoutBom.startsWith("---\n") && !withoutBom.startsWith("---\r\n")) {
    throw new SdlcError(`Missing YAML frontmatter: ${file}`);
  }
  const normalized = withoutBom.replace(/\r\n/g, "\n");
  const end = normalized.indexOf("\n---\n", 4);
  if (end < 0) throw new SdlcError(`Unclosed YAML frontmatter: ${file}`);
  const raw = normalized.slice(4, end);
  const parsed = YAML.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new SdlcError(`Frontmatter must be a mapping: ${file}`);
  }
  return { data: parsed as Record<string, unknown>, body: normalized.slice(end + 5) };
}

function stringArray(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) return [];
  return value as string[];
}

export function artifactMetadataIssues(data: Record<string, unknown>): string[] {
  const issues: string[] = [];
  const allowed = new Set(["id", "artifact_type", "title", "status", "created_by_change", "depends_on", "decisions", "supersedes", "writes_to", "implementation", "adr_status", "execution_id", "host_os"]);
  for (const field of Object.keys(data)) if (!allowed.has(field)) issues.push(`unknown frontmatter field: ${field}`);
  for (const field of ["id", "artifact_type", "title", "status", "created_by_change"]) {
    if (typeof data[field] !== "string" || data[field].length === 0) issues.push(`${field} must be a non-empty string`);
  }
  if (!("supersedes" in data)) issues.push("supersedes must be present as a string or null");
  for (const field of ["depends_on", "decisions", "writes_to", "implementation"]) {
    if (field === "writes_to" || field === "implementation") {
      if (data[field] === undefined) continue;
    }
    const value = data[field];
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) issues.push(`${field} must be an array of strings`);
    else if (new Set(value).size !== value.length) issues.push(`${field} must not contain duplicates`);
  }
  if (data.supersedes !== undefined && data.supersedes !== null && typeof data.supersedes !== "string") issues.push("supersedes must be a string or null");
  if (data.adr_status !== undefined && typeof data.adr_status !== "string") issues.push("adr_status must be a string");
  if (data.execution_id !== undefined && typeof data.execution_id !== "string") issues.push("execution_id must be a string");
  if (data.host_os !== undefined && (typeof data.host_os !== "string" || !/^[a-z][a-z0-9]*$/.test(data.host_os))) issues.push("host_os must be a lowercase host token such as win32, darwin or linux");
  return issues;
}

export function toArtifactMeta(data: Record<string, unknown>): ArtifactMeta {
  return {
    id: typeof data.id === "string" ? data.id : "",
    artifact_type: typeof data.artifact_type === "string" ? data.artifact_type : "",
    title: typeof data.title === "string" ? data.title : "",
    status: typeof data.status === "string" ? data.status : "",
    created_by_change: typeof data.created_by_change === "string" ? data.created_by_change : "",
    depends_on: stringArray(data.depends_on),
    decisions: stringArray(data.decisions),
    supersedes: typeof data.supersedes === "string" && data.supersedes.length > 0 ? data.supersedes : null,
    writes_to: stringArray(data.writes_to),
    implementation: stringArray(data.implementation),
    ...(typeof data.adr_status === "string" ? { adr_status: data.adr_status } : {}),
    ...(typeof data.execution_id === "string" ? { execution_id: data.execution_id } : {}),
    ...(typeof data.host_os === "string" ? { host_os: data.host_os } : {})
  };
}
