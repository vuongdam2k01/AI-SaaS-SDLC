import { afterEach, describe, expect, it } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cleanup, pluginRoot, repinPatternSnapshot, tempProject } from "./helpers.js";
import { resolveCatalog } from "../src/core/pattern-catalog.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

describe("pinned-catalog version skew", () => {
  it("diagnoses an engine older than the pin instead of reporting a malformed catalog", async () => {
    const root = await tempProject();
    roots.push(root);
    const pinned = path.join(root, "00-system", "patterns", "catalog.yaml");
    // A future generation carrying a shape this engine predates. The observed
    // field failure: engine 1.20.0 parsing a generation-6 pin died on
    // "malformed required table contract" and the reader was sent to debug a
    // healthy repository instead of updating the plugin.
    const body = (await readFile(pinned, "utf8"))
      .replace(/^version: \d+$/m, "version: 99")
      .replace("min_rows: 1", "min_rows: from-the-future");
    await writeFile(pinned, body, "utf8");
    await repinPatternSnapshot(root);
    await expect(resolveCatalog(root, pluginRoot)).rejects.toThrow(/generation 99.*update the plugin/s);
  });

  it("keeps the honest parse error when the pin is not newer than the engine", async () => {
    const root = await tempProject();
    roots.push(root);
    const pinned = path.join(root, "00-system", "patterns", "catalog.yaml");
    const body = (await readFile(pinned, "utf8")).replace("min_rows: 1", "min_rows: locally-broken");
    await writeFile(pinned, body, "utf8");
    await repinPatternSnapshot(root);
    // Same generation, genuinely broken pin: the skew diagnosis must not
    // paper over real corruption with "update the plugin".
    await expect(resolveCatalog(root, pluginRoot)).rejects.toThrow(/malformed/i);
  });
});
