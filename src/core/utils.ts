import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export function normalizeText(value: string): string {
  return value.replace(/\r\n/g, "\n");
}

export function sha256(value: string): string {
  return createHash("sha256").update(normalizeText(value)).digest("hex");
}

export function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}

export function formatId(prefix: string, value: number, width = 3): string {
  return `${prefix}-${String(value).padStart(width, "0")}`;
}

export function stableJson(value: unknown): string {
  return `${JSON.stringify(sortValue(value), null, 2)}\n`;
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, sortValue(nested)])
    );
  }
  return value;
}

export async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}

export async function writeJsonAtomic(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, stableJson(value), "utf8");
  await rename(temp, file);
}

export function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

