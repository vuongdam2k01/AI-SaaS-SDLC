import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ArtifactPattern, PatternCatalog } from "./pattern-catalog.js";
import { loadPatternCatalog } from "./pattern-catalog.js";
import { SdlcError } from "./errors.js";
import { isWithin, prepareSafeManagedPath } from "./paths.js";
import { loadActiveFlow, pathExists } from "./state.js";
import { withProjectLock } from "./project-lock.js";
import { assertFlowAllowsArtifactType } from "./baseline-flow-rules.js";
import { SCALABLE_LOCATIONS } from "./artifact-contracts.js";

function tokenValues(id: string, title: string, createdBy: string): Record<string, string> {
  const parts = id.split("-");
  const number = parts.at(-1) ?? "";
  const area = parts.slice(parts[0] === "UT" ? 2 : 1, -1).join("-") || number;
  return {
    ID: id,
    TITLE: title,
    CREATED_BY_CHANGE: createdBy,
    CHG_ID: createdBy,
    FLOW_OR_CHANGE_ID: createdBy,
    AREA: area,
    NNN: number,
    SEGMENT: area,
    ROLE: area,
    SLUG: area,
    API_ID: area,
    JOB_ID: area,
    TARGET_ID: "",
    FEATURE_OR_FLOW_ID: "",
    TRIGGER_ID: ""
  };
}

function render(template: string, values: Record<string, string>): string {
  let output = template.replace(/^title:\s*\{\{TITLE\}\}\s*$/m, `title: ${JSON.stringify(values.TITLE)}`);
  for (const [key, value] of Object.entries(values)) output = output.replaceAll(`{{${key}}}`, value);
  const frontmatterEnd = output.replace(/\r\n/g, "\n").indexOf("\n---\n", 4);
  if (frontmatterEnd > 0) {
    const head = output.slice(0, frontmatterEnd).replace(/\[(?:\s*,?\s*\{\{[^}]+\}\}\s*,?)*\]/g, "[]").replace(/:\s*\{\{[^}]+\}\}\s*$/gm, ":");
    output = head + output.slice(frontmatterEnd);
  }
  const unresolved = output.match(/\{\{[A-Z0-9_]+\}\}/g);
  if (unresolved) throw new SdlcError(`Pattern contains unsupported template tokens: ${[...new Set(unresolved)].join(", ")}`);
  return output.replace(/\r\n/g, "\n").replace(/\s+$/, "") + "\n";
}

function resolveTarget(root: string, pattern: ArtifactPattern, id: string): string {
  const relative = pattern.target.replaceAll("{{ID}}", id).replaceAll("{id}", id);
  if (relative.includes("{{") || path.isAbsolute(relative)) throw new SdlcError(`Pattern target is not instantiable: ${pattern.target}`);
  const target = path.resolve(root, relative);
  if (!isWithin(root, target)) throw new SdlcError(`Artifact target escapes project root: ${relative}`);
  const normalized = path.relative(root, target).replaceAll("\\", "/");
  const location = SCALABLE_LOCATIONS[pattern.artifact_type];
  if (!location || !location.test(normalized) || path.basename(normalized, ".md") !== id) throw new SdlcError(`Catalog target violates the approved location for ${pattern.artifact_type}: ${normalized}`);
  return target;
}

async function createUnlocked(root: string, catalog: PatternCatalog, artifactType: string, id: string, title: string): Promise<{ id: string; artifact_type: string; file: string }> {
  const flow = await loadActiveFlow(root);
  if (!flow) throw new SdlcError("Artifact creation requires an active semantic flow.");
  const pattern = catalog.patterns.find((item) => item.artifact_type === artifactType);
  if (!pattern) throw new SdlcError(`Unknown scalable artifact type: ${artifactType}`);
  if (artifactType === "test_result") throw new SdlcError("Test results are execution-backed and cannot be created from a pattern.");
  assertFlowAllowsArtifactType(flow.type, artifactType);
  if (!new RegExp(`^(?:${pattern.id_pattern})$`).test(id)) throw new SdlcError(`${id} does not match ${artifactType} ID contract ${pattern.id_pattern}.`);
  if (title.trim() === "" || /[\r\n\0]/.test(title) || title.includes("{{")) throw new SdlcError("Artifact title must be one non-empty line without template tokens.");
  const target = resolveTarget(root, pattern, id);
  await prepareSafeManagedPath(root, target);
  if (await pathExists(target)) throw new SdlcError(`Artifact already exists: ${path.relative(root, target)}`);
  const source = path.resolve(catalog.root, pattern.template);
  if (!isWithin(catalog.root, source)) throw new SdlcError(`Pattern source escapes catalog root: ${pattern.template}`);
  const createdBy = flow.change_id ?? flow.id;
  const content = render(await readFile(source, "utf8"), tokenValues(id, title.trim(), createdBy));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, { encoding: "utf8", flag: "wx" });
  return { id, artifact_type: artifactType, file: path.relative(root, target).replaceAll("\\", "/") };
}

export async function createArtifactFromPattern(root: string, catalog: PatternCatalog, artifactType: string, id: string, title: string): Promise<{ id: string; artifact_type: string; file: string }> {
  return withProjectLock(root, async () => {
    const fresh = await loadPatternCatalog(catalog.root, isWithin(root, catalog.root) ? root : undefined);
    return createUnlocked(root, fresh, artifactType, id, title);
  });
}
