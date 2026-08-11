import { readFile } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import type { Artifact } from "./types.js";
import { artifactMetadataIssues, parseFrontmatter, toArtifactMeta } from "./frontmatter.js";
import { sha256, toPosix } from "./utils.js";
import { assertSafeManagedPath } from "./paths.js";
import { CONTRACT_KINDS, deriveContractId, discoverContractFiles } from "./contract-authorities.js";

const artifactGlobs = [
  "01-discovery/**/*.md",
  "02-product/**/*.md",
  "03-design/**/*.md",
  "04-verification/**/*.md",
  "05-control/**/*.md"
];

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
  const pushContract = async (id: string, artifactType: string, title: string, relative: string, dependsOn: string[]) => {
    const file = path.join(root, relative);
    await assertSafeManagedPath(root, file);
    const content = await readFile(file, "utf8");
    artifacts.push({
      id,
      artifact_type: artifactType,
      title,
      status: "active",
      created_by_change: id === "SDLC-CONFIG" ? "INIT" : "GENESIS",
      depends_on: dependsOn,
      decisions: [],
      supersedes: null,
      writes_to: [],
      implementation: [],
      file: relative,
      body: content,
      hash: sha256(content),
      metadata_issues: []
    });
  };
  await pushContract("SDLC-CONFIG", "engine_configuration", "SDLC Configuration", "sdlc.config.yaml", []);
  const discovered = await discoverContractFiles(root);
  for (const kind of CONTRACT_KINDS) {
    const siblings = discovered.get(kind.artifact_type) ?? [];
    // With one file per family the canonical contract keeps its auto-derived
    // consumer edges. With siblings present, ownership is author-declared on
    // each instance instead, so auto-population stops for the whole family.
    const dynamic = siblings.length === 0 ? idsByType(kind.instance_type) : [];
    await pushContract(kind.canonical_id, kind.artifact_type, kind.canonical_title, kind.canonical_file, [...kind.base_dependencies, ...dynamic]);
    for (const sibling of siblings) {
      await pushContract(deriveContractId(kind, sibling), kind.artifact_type, `${kind.title_label}: ${path.posix.basename(sibling)}`, sibling, [...kind.base_dependencies]);
    }
  }
  return artifacts;
}

export function artifactMap(artifacts: Artifact[]): Map<string, Artifact> {
  return new Map(artifacts.map((artifact) => [artifact.id, artifact]));
}
