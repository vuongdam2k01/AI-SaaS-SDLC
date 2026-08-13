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
