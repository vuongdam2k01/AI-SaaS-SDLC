import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { pluginRoot } from "./helpers.js";

interface EvalCase {
  prompt: string;
  grader: string;
  required_tools: string[];
  required_files: string[];
  required_output_patterns: string[];
  forbidden_trace_patterns: string[];
}

describe("forward eval contracts", () => {
  it("ships five artifact-and-trace cases with auditable semantic graders", async () => {
    const manifest = JSON.parse(await readFile(path.join(pluginRoot, "evals", "manifest.json"), "utf8")) as {
      schema_version: number;
      cases: Record<string, EvalCase>;
    };
    expect(manifest.schema_version).toBe(1);
    expect(Object.keys(manifest.cases).sort()).toEqual(["anti-procedure", "evolution", "genesis", "reconciliation", "research-tools"]);
    for (const [name, definition] of Object.entries(manifest.cases)) {
      const prompt = await readFile(path.join(pluginRoot, "evals", definition.prompt), "utf8");
      const grader = await readFile(path.join(pluginRoot, "evals", definition.grader), "utf8");
      expect(prompt.length, `${name} prompt depth`).toBeGreaterThan(900);
      expect(prompt).toMatch(/Initial state:/);
      expect(prompt).toMatch(/Prohibited:/);
      expect(grader.length, `${name} grader depth`).toBeGreaterThan(700);
      expect(grader).toMatch(/Score 0–10/);
      expect(grader).toMatch(/critical/i);
      expect(definition.required_tools.length).toBeGreaterThan(0);
      expect(definition.required_files.length).toBeGreaterThan(1);
      expect(definition.required_output_patterns.length).toBeGreaterThan(1);
      expect(definition.forbidden_trace_patterns.length).toBeGreaterThan(1);
    }
  });

  it("rejects an empty captured run instead of manufacturing eval evidence", async () => {
    const output = await mkdtemp(path.join(os.tmpdir(), "eval-output-"));
    const trace = path.join(output, "trace.json");
    await writeFile(trace, "[]\n", "utf8");
    try {
      const result = spawnSync(process.execPath, [path.join(pluginRoot, "evals", "harness.mjs"), "--case", "genesis", "--output", output, "--trace", trace], { encoding: "utf8" });
      expect(result.status).toBe(1);
      const audit = JSON.parse(result.stdout);
      expect(audit.passed).toBe(false);
      expect(audit.tool_events).toBe(0);
      expect(audit.failures).toEqual(expect.arrayContaining([
        "missing required tool family: search",
        "missing required tool family: fetch",
        "missing required file: 01-discovery/evidence-ledger.md"
      ]));
    } finally {
      await rm(output, { recursive: true, force: true });
    }
  });
});
