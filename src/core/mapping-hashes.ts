import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Artifact, BaselineManifest, ProjectConfig } from "./types.js";
import { pathExists } from "./state.js";
import { sha256 } from "./utils.js";

/**
 * Content hashes for every mapped implementation path, keyed by the mapping
 * string itself (`<source-id>:<relative-path>`). Stored in the baseline
 * manifest so a later validate can say "this mapped file changed while its
 * artifact did not" — the one docs↔code drift signal a whole-tree snapshot
 * cannot express. Unresolvable mappings are skipped here; their existence
 * errors are validation's job.
 */
export async function collectMappingHashes(root: string, config: ProjectConfig, artifacts: Artifact[]): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  const sourceById = new Map(config.implementation_sources.map((source) => [source.id, path.resolve(root, source.path)]));
  const mappings = new Set(artifacts.flatMap((artifact) => artifact.implementation));
  for (const mapping of [...mappings].sort()) {
    const separator = mapping.indexOf(":");
    if (separator <= 0) continue;
    const sourceRoot = sourceById.get(mapping.slice(0, separator));
    if (!sourceRoot) continue;
    const target = path.resolve(sourceRoot, mapping.slice(separator + 1));
    if (!target.startsWith(sourceRoot) || !(await pathExists(target))) continue;
    try {
      hashes[mapping] = sha256(await readFile(target, "utf8"));
    } catch {
      // Unreadable target: IMPLEMENTATION_TARGET_MISSING territory, not ours.
    }
  }
  return hashes;
}

export interface DriftedMapping {
  mapping: string;
  artifacts: Artifact[];
}

/**
 * Mappings whose file content differs from the baseline while every artifact
 * declaring them is itself unchanged since that baseline — code moved, docs
 * did not. A mapping the baseline never hashed (pre-1.13.0 baselines, or one
 * added since) observes nothing and cannot drift.
 */
export async function driftedMappings(root: string, config: ProjectConfig, artifacts: Artifact[], baseline: BaselineManifest | null): Promise<DriftedMapping[]> {
  const stored = baseline?.implementation_hashes;
  if (!stored) return [];
  const baselineArtifactHashes = new Map((baseline?.artifacts ?? []).map((entry) => [entry.id, entry.hash]));
  const current = await collectMappingHashes(root, config, artifacts);
  const drifted: DriftedMapping[] = [];
  for (const [mapping, storedHash] of Object.entries(stored).sort(([a], [b]) => a.localeCompare(b))) {
    const currentHash = current[mapping];
    if (!currentHash || currentHash === storedHash) continue;
    const declaring = artifacts.filter((artifact) => artifact.implementation.includes(mapping));
    const unchanged = declaring.filter((artifact) => baselineArtifactHashes.get(artifact.id) === artifact.hash);
    if (declaring.length === 0 || unchanged.length !== declaring.length) continue;
    drifted.push({ mapping, artifacts: unchanged });
  }
  return drifted;
}

export interface DocumentationDrift {
  artifact: Artifact;
  mappings: string[];
}

/**
 * The other direction: an artifact whose own content moved since the baseline
 * while every implementation file it maps kept exactly the content the baseline
 * hashed — documents moved, code did not.
 *
 * The predicate driftedMappings uses cannot see this case, and worse, editing
 * the document is what silences it there: the moment an artifact changes, its
 * mappings stop qualifying as code-moved-alone. That asymmetry left the most
 * common degradation in a documentation-first repository — a specification
 * revised and never carried into the code implementing it — with no observer at
 * all. A mapping the baseline never hashed observes nothing, and a mapped file
 * that has gone missing is IMPLEMENTATION_TARGET_MISSING's business, not this
 * check's, so both suppress rather than accuse.
 */
export async function documentationDriftedArtifacts(root: string, config: ProjectConfig, artifacts: Artifact[], baseline: BaselineManifest | null): Promise<DocumentationDrift[]> {
  const stored = baseline?.implementation_hashes;
  if (!stored) return [];
  const baselineArtifactHashes = new Map((baseline?.artifacts ?? []).map((entry) => [entry.id, entry.hash]));
  const current = await collectMappingHashes(root, config, artifacts);
  const drifted: DocumentationDrift[] = [];
  for (const artifact of artifacts) {
    if (artifact.implementation.length === 0) continue;
    const baselineHash = baselineArtifactHashes.get(artifact.id);
    if (baselineHash === undefined || baselineHash === artifact.hash) continue;
    const observed = artifact.implementation.filter((mapping) => stored[mapping] !== undefined);
    if (observed.length === 0) continue;
    if (!observed.every((mapping) => current[mapping] !== undefined && current[mapping] === stored[mapping])) continue;
    drifted.push({ artifact, mappings: [...observed].sort() });
  }
  return drifted.sort((a, b) => a.artifact.id.localeCompare(b.artifact.id));
}
