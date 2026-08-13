import path from "node:path";
import { readdir } from "node:fs/promises";
import type { Artifact, BaselineManifest, ChangeRecord, ProjectConfig } from "./types.js";
import { scanArtifacts } from "./artifacts.js";
import { loadConfig } from "./config.js";
import { loadExecutionRecords } from "./execution-records.js";
import { loadQueryRecords, loadRetrievalRecords } from "./retrieval-records.js";
import { buildGraph } from "./graph.js";
import { calculateImpact, type ImpactReport } from "./impact.js";
import { buildProjections, applyProjections, changeImpactProjection } from "./projections.js";
import { loadActiveFlow, pathExists } from "./state.js";
import { assertSafeManagedPath, projectPaths } from "./paths.js";
import { readJson } from "./utils.js";
import { isBaselineManifest } from "./record-validation.js";
import { SdlcError } from "./errors.js";
import fg from "fast-glob";
import { isChangeRecord } from "./record-validation.js";
import { withProjectLock } from "./project-lock.js";

export async function loadBaseline(root: string): Promise<BaselineManifest | null> {
  const file = projectPaths(root).baseline;
  if (!(await pathExists(file))) return null;
  await assertSafeManagedPath(root, file);
  const baseline = await readJson<BaselineManifest>(file);
  if (!isBaselineManifest(baseline)) throw new SdlcError(`Invalid baseline manifest schema: ${file}`);
  return baseline;
}

export async function projectSnapshot(root: string): Promise<{
  artifacts: Artifact[];
  baseline: BaselineManifest | null;
  impact: ImpactReport;
}> {
  const artifacts = await scanArtifacts(root);
  const baseline = await loadBaseline(root);
  const graph = buildGraph(artifacts);
  return { artifacts, baseline, impact: calculateImpact(artifacts, graph, baseline) };
}

async function refreshProjectUnlocked(root: string, check: boolean): Promise<string[]> {
  const artifacts = await scanArtifacts(root);
  const graph = buildGraph(artifacts);
  const baseline = await loadBaseline(root);
  const impact = calculateImpact(artifacts, graph, baseline);
  const flow = await loadActiveFlow(root);
  const activeChange = flow?.change_id && impact.direct.length > 0 ? flow.change_id : null;
  // A config that fails to parse is reported by validate; projections still
  // render, with the platform-coverage command columns empty.
  let config: ProjectConfig | null = null;
  try { config = await loadConfig(root); } catch { config = null; }
  const records = await loadExecutionRecords(root);
  const retrievals = await loadRetrievalRecords(root);
  const queries = await loadQueryRecords(root);
  const projections = buildProjections(artifacts, graph, impact, baseline, activeChange, config, records, retrievals, queries);
  if (await pathExists(projectPaths(root).changes)) {
    await assertSafeManagedPath(root, path.join(projectPaths(root).changes, ".managed-probe"));
    for (const entry of await readdir(projectPaths(root).changes, { withFileTypes: true })) if (entry.isSymbolicLink() && /^CHG-.*\.json$/.test(entry.name)) throw new SdlcError(`Change record cannot be a symlink: ${entry.name}`);
    const changeFiles = await fg("CHG-*.json", { cwd: projectPaths(root).changes, absolute: true, followSymbolicLinks: false });
    for (const file of changeFiles) {
      await assertSafeManagedPath(root, file);
      try {
        const change = await readJson<ChangeRecord>(file);
        if (isChangeRecord(change) && change.impact) {
          projections[`change-impact/${change.id}.md`] = changeImpactProjection(change.id, change.impact);
        }
      } catch {
        // Invalid change JSON is reported when its flow/baseline is used.
      }
    }
  }
  return applyProjections(root, projections, check);
}

export async function refreshProject(root: string, check: boolean): Promise<string[]> {
  return check ? refreshProjectUnlocked(root, true) : withProjectLock(root, () => refreshProjectUnlocked(root, false));
}

export async function loadChange(root: string, id: string): Promise<ChangeRecord | null> {
  if (!/^CHG-[0-9]{3,}$/.test(id)) throw new SdlcError(`Invalid change ID: ${id}`);
  const file = path.join(projectPaths(root).changes, `${id}.json`);
  if (!(await pathExists(file))) return null;
  await assertSafeManagedPath(root, file);
  const change = await readJson<ChangeRecord>(file);
  if (!isChangeRecord(change)) throw new SdlcError(`Invalid change record schema: ${file}`);
  return change;
}
