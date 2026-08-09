import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { Artifact } from "../src/core/types.js";
import { initializeProject } from "../src/core/template.js";
import { refreshProject } from "../src/core/project.js";
import { createBaseline } from "../src/core/baseline.js";
import { closeFlow, startFlow } from "../src/core/state.js";
import { completeFoundationArtifacts } from "./fixtures/complete-saas/fixture.js";

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
    ...(overrides.execution_id ? { execution_id: overrides.execution_id } : {})
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
