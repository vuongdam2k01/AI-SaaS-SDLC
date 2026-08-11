import { spawn } from "node:child_process";
import { readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { CommandDefinition, ExecutionRecord, ProjectConfig } from "./types.js";
import { gitCommit } from "./git.js";
import { isRealPathWithin, prepareSafeManagedPath, projectPaths } from "./paths.js";
import { loadActiveFlow, loadCurrentState, pathExists, saveCurrentState } from "./state.js";
import { formatId, readJson, sha256, writeJsonAtomic } from "./utils.js";
import { isExecutionRecord } from "./record-validation.js";
import { SdlcError } from "./errors.js";
import { renderResultArtifact } from "./result-artifact.js";
import { withProjectLock } from "./project-lock.js";
import { sourceSnapshotHash } from "./implementation-snapshot.js";

type Level = "unit" | "integration" | "system";

/** Order-insensitive equality for platform declarations; absence equals empty. */
export function samePlatformDeclaration(a: string[] | undefined, b: string[] | undefined): boolean {
  const left = [...(a ?? [])].sort();
  const right = [...(b ?? [])].sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function allowedRoots(root: string, config: ProjectConfig): string[] {
  return [root, ...config.implementation_sources.map((source) => path.resolve(root, source.path))];
}

async function executionsForFlow(root: string, flowId: string): Promise<ExecutionRecord[]> {
  const directory = projectPaths(root).executions;
  if (!(await pathExists(directory))) return [];
  const files = (await readdir(directory)).filter((name) => name.endsWith(".json")).sort();
  const records: ExecutionRecord[] = [];
  for (const name of files) {
    try {
      const candidate = await readJson<unknown>(path.join(directory, name));
      if (isExecutionRecord(candidate) && candidate.flow_id === flowId) records.push(candidate);
    } catch {
      // A record that cannot be read is a provenance problem for `validate` to
      // report, not a reason to re-run a command here.
    }
  }
  return records;
}

async function runCommand(command: CommandDefinition, cwd: string): Promise<{ exitCode: number; output: string; started: string; ended: string }> {
  const started = new Date().toISOString();
  return new Promise((resolve) => {
    const child = spawn(command.command, { cwd, shell: true, env: process.env });
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.on("error", (error) => resolve({ exitCode: 1, output: `${output}\n${String(error)}`, started, ended: new Date().toISOString() }));
    child.on("close", (code) => resolve({ exitCode: code ?? 1, output, started, ended: new Date().toISOString() }));
  });
}

async function executeVerificationUnlocked(root: string, config: ProjectConfig, levels: Level[]): Promise<ExecutionRecord[]> {
  const state = await loadCurrentState(root);
  const flow = await loadActiveFlow(root);
  if (!flow || (flow.type !== "evolution" && flow.type !== "reconciliation")) throw new SdlcError("Verification execution is only allowed inside Product Evolution or Reconciliation.");
  const roots = allowedRoots(root, config);
  const records: ExecutionRecord[] = [];
  const planned: Array<{ level: Level; definition: CommandDefinition; cwd: string }> = [];
  for (const level of levels) {
    for (const definition of config.verification[level]) {
      const cwd = path.resolve(root, definition.cwd);
      const checks = await Promise.all(roots.map(async (allowed) => {
        try { return await isRealPathWithin(allowed, cwd); } catch { return false; }
      }));
      if (!checks.some(Boolean)) throw new SdlcError(`Verification cwd is missing or outside configured sources: ${definition.cwd}`);
      planned.push({ level, definition, cwd });
    }
  }
  const priorForFlow = await executionsForFlow(root, flow.id);
  for (const { level, definition, cwd } of planned) {
    // An identical command over an identical source tree inside the same flow
    // cannot observe anything the earlier run did not. Re-running it would add a
    // record that carries no new information and inflate the evidence set, so the
    // existing record is reused instead.
    const sourceSnapshotBefore = await sourceSnapshotHash(cwd);
    const prior = priorForFlow.find((record) => record.command_id === definition.id
      && record.command === definition.command
      && record.source_snapshot_hash === sourceSnapshotBefore
      && samePlatformDeclaration(record.platforms, definition.platforms));
    if (prior) {
      records.push(prior);
      continue;
    }
    const id = formatId("EXEC", state.next_execution);
    const logFile = path.join(projectPaths(root).executions, `${id}.log`);
    const recordFile = path.join(projectPaths(root).executions, `${id}.json`);
    const resultFile = path.join(root, "04-verification", "results", `RESULT-${id}.md`);
    if (await pathExists(logFile) || await pathExists(recordFile) || await pathExists(resultFile)) throw new SdlcError(`Execution ID ${id} is already reserved; repair state without overwriting provenance.`);
    await prepareSafeManagedPath(root, logFile);
    await prepareSafeManagedPath(root, recordFile);
    await prepareSafeManagedPath(root, resultFile);
    state.next_execution += 1;
    await saveCurrentState(root, state);
    const sourceCommit = gitCommit(cwd);
    const sourceSnapshot = sourceSnapshotBefore;
    const result = await runCommand(definition, cwd);
    const record: ExecutionRecord = {
      schema_version: 1,
      id,
      flow_id: flow.id,
      level,
      command_id: definition.id,
      command: definition.command,
      cwd: definition.cwd,
      started_at: result.started,
      ended_at: result.ended,
      exit_code: result.exitCode,
      output_hash: sha256(result.output),
      output_file: `.ai-saas-sdlc/executions/${id}.log`,
      git_commit: sourceCommit,
      source_snapshot_hash: sourceSnapshot,
      // The declaration is the command author's claim; the host is what this
      // machine observed. They are recorded separately and never merged, so an
      // Android declaration executed on a win32 host stays auditable.
      ...(definition.platforms ? { platforms: definition.platforms } : {}),
      host: { os: process.platform, release: os.release(), arch: os.arch(), node: process.versions.node }
    };
    // Recheck immediately before persistence in case a directory changed during execution.
    await prepareSafeManagedPath(root, logFile);
    await prepareSafeManagedPath(root, recordFile);
    await prepareSafeManagedPath(root, resultFile);
    await writeFile(logFile, result.output, "utf8");
    await writeJsonAtomic(recordFile, record);
    await writeFile(resultFile, renderResultArtifact(record, flow.change_id ?? flow.id), "utf8");
    records.push(record);
  }
  return records;
}

export async function executeVerification(root: string, config: ProjectConfig, levels: Level[]): Promise<ExecutionRecord[]> {
  return withProjectLock(root, () => executeVerificationUnlocked(root, config, levels));
}
