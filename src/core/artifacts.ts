import { readFile } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import type { Artifact } from "./types.js";
import { artifactMetadataIssues, parseFrontmatter, toArtifactMeta } from "./frontmatter.js";
import { sha256, toPosix } from "./utils.js";
import { assertSafeManagedPath } from "./paths.js";

const artifactGlobs = [
  "01-discovery/**/*.md",
  "02-product/**/*.md",
  "03-design/**/*.md",
  "04-verification/**/*.md",
  "05-control/**/*.md"
];

const fixedContracts = [
  { id: "SDLC-CONFIG", artifact_type: "engine_configuration", title: "SDLC Configuration", file: "sdlc.config.yaml", baseDependencies: [] },
  { id: "OPENAPI-CONTRACT", artifact_type: "openapi_contract", title: "OpenAPI Contract", file: "03-design/interfaces/openapi.yaml", baseDependencies: ["ARCHITECTURE-OVERVIEW", "ERROR-CATALOG"] },
  { id: "PHYSICAL-SCHEMA", artifact_type: "physical_schema", title: "Physical Schema", file: "03-design/data/schema.dbml", baseDependencies: ["ARCHITECTURE-OVERVIEW", "SYSTEM-INVARIANTS"] },
  { id: "SCREEN-TRANSITIONS", artifact_type: "screen_transitions", title: "Screen Transitions", file: "03-design/screen-transitions.mmd", baseDependencies: ["UX-RULES"] }
] as const;

export async function scanArtifacts(root: string): Promise<Artifact[]> {
  const files = await fg(artifactGlobs, {
    cwd: root,
    onlyFiles: true,
    ignore: ["**/.gitkeep"],
    dot: false,
    followSymbolicLinks: false
  });
  const artifacts: Artifact[] = [];
  for (const relative of files.sort((a, b) => a.localeCompare(b))) {
    const file = path.join(root, relative);
    await assertSafeManagedPath(root, file);
    const content = await readFile(file, "utf8");
    const parsed = parseFrontmatter(content, relative);
    const metadata = toArtifactMeta(parsed.data);
    if (!/^[A-Z][A-Z0-9-]*$/.test(metadata.id)) throw new Error(`Unsafe artifact ID in ${relative}: ${metadata.id || "<missing>"}`);
    artifacts.push({ ...metadata, file: toPosix(relative), body: parsed.body, hash: sha256(content), metadata_issues: artifactMetadataIssues(parsed.data) });
  }
  const idsByType = (type: string) => artifacts
    .filter((artifact) => artifact.artifact_type === type && artifact.status !== "retired" && artifact.status !== "superseded")
    .map((artifact) => artifact.id);
  for (const contract of fixedContracts) {
    const file = path.join(root, contract.file);
    await assertSafeManagedPath(root, file);
    const content = await readFile(file, "utf8");
    const dynamic = contract.artifact_type === "openapi_contract" ? idsByType("api_processing")
      : contract.artifact_type === "physical_schema" ? idsByType("entity")
        : contract.artifact_type === "screen_transitions" ? idsByType("screen") : [];
    artifacts.push({
      id: contract.id,
      artifact_type: contract.artifact_type,
      title: contract.title,
      status: "active",
      created_by_change: contract.id === "SDLC-CONFIG" ? "INIT" : "GENESIS",
      depends_on: [...contract.baseDependencies, ...dynamic],
      decisions: [],
      supersedes: null,
      writes_to: [],
      implementation: [],
      file: contract.file,
      body: content,
      hash: sha256(content),
      metadata_issues: []
    });
  }
  return artifacts;
}

export function artifactMap(artifacts: Artifact[]): Map<string, Artifact> {
  return new Map(artifacts.map((artifact) => [artifact.id, artifact]));
}
