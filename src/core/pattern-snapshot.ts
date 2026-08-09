import { readFile } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { SdlcError } from "./errors.js";
import { assertSafeManagedPath, isWithin } from "./paths.js";
import { pathExists } from "./state.js";
import { readJson, sha256 } from "./utils.js";

interface PatternSnapshot { schema_version: 1; catalog_hash: string; files: number }

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
  const hashes: string[] = [];
  for (const relative of files.sort()) {
    const file = path.join(catalogRoot, relative);
    await assertSafeManagedPath(projectRoot, file);
    hashes.push(`00-system/patterns/${relative.replaceAll("\\", "/")}:${sha256(await readFile(file, "utf8"))}`);
  }
  if (hashes.length !== snapshot.files || sha256(hashes.join("\n")) !== snapshot.catalog_hash) throw new SdlcError("Pinned pattern snapshot was modified; migrate or reinitialize patterns instead of editing them in place.");
}
