import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { Artifact } from "../src/core/types.js";
import { initializeProject } from "../src/core/template.js";
import { refreshProject } from "../src/core/project.js";
import { createBaseline } from "../src/core/baseline.js";
import { closeFlow, startFlow } from "../src/core/state.js";
import { completeFoundationArtifacts } from "./fixtures/complete-saas/fixture.js";
import { sha256, stableJson } from "../src/core/utils.js";
import fg from "fast-glob";

export const pluginRoot = process.cwd();

export async function tempProject(projectId = "test-project", idea = "A real SaaS idea"): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "ai-saas-sdlc-"));
  await initializeProject(root, path.join(pluginRoot, "resources", "project-template"), projectId, idea);
  await refreshProject(root, false);
  return root;
}

export async function cleanup(root: string): Promise<void> {
  await rm(root, { recursive: true, force: true });
}

/** Re-pin the snapshot exactly as `init` would, after rewriting the pinned catalog. */
export async function repinPatternSnapshot(root: string): Promise<void> {
  const catalogRoot = path.join(root, "00-system", "patterns");
  const files = await fg("**/*", { cwd: catalogRoot, onlyFiles: true, dot: true, followSymbolicLinks: false, ignore: ["snapshot.json"] });
  const hashes: string[] = [];
  for (const relative of files.sort()) {
    hashes.push(`00-system/patterns/${relative.replaceAll("\\", "/")}:${sha256(await readFile(path.join(catalogRoot, relative), "utf8"))}`);
  }
  await writeFile(path.join(catalogRoot, "snapshot.json"), stableJson({ schema_version: 1, catalog_hash: sha256(hashes.join("\n")), files: hashes.length }), "utf8");
}

export function artifact(overrides: Partial<Artifact> & Pick<Artifact, "id" | "artifact_type">): Artifact {
  return {
    id: overrides.id,
    artifact_type: overrides.artifact_type,
    title: overrides.title ?? overrides.id,
    status: overrides.status ?? "active",
    created_by_change: overrides.created_by_change ?? "CHG-001",
    depends_on: overrides.depends_on ?? [],
    decisions: overrides.decisions ?? [],
    supersedes: overrides.supersedes ?? null,
    writes_to: overrides.writes_to ?? [],
    implementation: overrides.implementation ?? [],
    file: overrides.file ?? `${overrides.id}.md`,
    body: overrides.body ?? "# Test\n",
    hash: overrides.hash ?? overrides.id,
    metadata_issues: overrides.metadata_issues ?? [],
    ...(overrides.adr_status ? { adr_status: overrides.adr_status } : {}),
    ...(overrides.execution_id ? { execution_id: overrides.execution_id } : {}),
    ...(overrides.host_os ? { host_os: overrides.host_os } : {})
  };
}

export async function activateFile(file: string): Promise<void> {
  const content = await readFile(file, "utf8");
  await writeFile(file, content.replace("status: draft", "status: active"), "utf8");
}

export async function establishGenesis(root: string): Promise<void> {
  await startFlow(root, "genesis", "Approval workflow SaaS");
  await prepareGenesisArtifacts(root);
  await createBaseline(root);
  await closeFlow(root);
}

export async function prepareGenesisArtifacts(root: string): Promise<void> {
  await completeFoundationArtifacts(root);
}
