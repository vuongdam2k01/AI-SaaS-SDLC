import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { SdlcError } from "./errors.js";
import { assertSafeManagedPath, isWithin } from "./paths.js";
import { pathExists } from "./state.js";
import { readJson, sha256, stableJson } from "./utils.js";

interface PatternSnapshot { schema_version: 1; catalog_hash: string; files: number }

/**
 * The hash lines a snapshot commits to: every pinned file, path-sorted, each
 * paired with the digest of its content. Verification and writing share this
 * function so a snapshot can never be written in a shape verification rejects.
 */
async function snapshotHashes(catalogRoot: string): Promise<string[]> {
  const files = await fg("**/*", { cwd: catalogRoot, onlyFiles: true, dot: true, followSymbolicLinks: false, ignore: ["snapshot.json"] });
  const hashes: string[] = [];
  for (const relative of files.sort()) {
    const content = await readFile(path.join(catalogRoot, relative), "utf8");
    hashes.push(`00-system/patterns/${relative.replaceAll("\\", "/")}:${sha256(content)}`);
  }
  return hashes;
}

/**
 * Re-pins the snapshot over whatever now sits in the pinned directory.
 *
 * Initialization writes the snapshot exclusively, so an existing pin can never
 * be replaced by accident. Migration is the one operation that must replace it,
 * and it does so only after copying a new catalog in — the pin follows the
 * files, never the other way round.
 */
export async function writePatternSnapshot(catalogRoot: string): Promise<number> {
  const hashes = await snapshotHashes(catalogRoot);
  await writeFile(path.join(catalogRoot, "snapshot.json"), stableJson({ schema_version: 1, catalog_hash: sha256(hashes.join("\n")), files: hashes.length }), "utf8");
  return hashes.length;
}

function isSnapshot(value: unknown): value is PatternSnapshot {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return row.schema_version === 1 && typeof row.catalog_hash === "string" && Number.isInteger(row.files);
}

export async function verifyPatternSnapshot(projectRoot: string, catalogRoot: string): Promise<void> {
  if (!isWithin(projectRoot, catalogRoot)) throw new SdlcError("Pinned pattern catalog must be inside the documentation repository.");
  const snapshotFile = path.join(catalogRoot, "snapshot.json");
  if (!(await pathExists(snapshotFile))) throw new SdlcError("Pinned pattern snapshot metadata is missing.");
  await assertSafeManagedPath(projectRoot, snapshotFile);
  const snapshot = await readJson<unknown>(snapshotFile);
  if (!isSnapshot(snapshot)) throw new SdlcError("Pinned pattern snapshot metadata is invalid.");
  const files = await fg("**/*", { cwd: catalogRoot, onlyFiles: true, dot: true, followSymbolicLinks: false, ignore: ["snapshot.json"] });
  for (const relative of files.sort()) await assertSafeManagedPath(projectRoot, path.join(catalogRoot, relative));
  const hashes = await snapshotHashes(catalogRoot);
  if (hashes.length !== snapshot.files || sha256(hashes.join("\n")) !== snapshot.catalog_hash) throw new SdlcError("Pinned pattern snapshot was modified; migrate or reinitialize patterns instead of editing them in place.");
}
