import { spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import { readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Artifact, CommandDefinition, ExecutionRecord, ProjectConfig } from "./types.js";
import { gitCommit } from "./git.js";
import { assertSafeManagedPath, isRealPathWithin, prepareSafeManagedPath, projectPaths } from "./paths.js";
import { loadActiveFlow, loadCurrentState, pathExists, saveCurrentState } from "./state.js";
import { formatId, readJson, sha256, writeJsonAtomic } from "./utils.js";
import { isExecutionRecord } from "./record-validation.js";
import { samePlatformDeclaration } from "./execution-selection.js";
import { SdlcError } from "./errors.js";
import { renderResultArtifact } from "./result-artifact.js";
import { withProjectLock } from "./project-lock.js";
import { sourceSnapshotHash } from "./implementation-snapshot.js";
import { scanArtifacts } from "./artifacts.js";
import { joinCasesToSpecs, parseJunit, parseTap } from "./test-report.js";

type Level = "unit" | "integration" | "system";

const LEVEL_SPEC_TYPES: Record<Level, string[]> = {
  unit: ["unit_test_backend", "unit_test_frontend", "unit_test_job"],
  integration: ["integration_test"],
  system: ["system_test"]
};

interface VerificationPolicy {
  command_timeout_ms: number;
  output_max_bytes: number;
}

// Machine-local budgets, never product truth: a slow suite raises its own
// timeout in the git-ignored policy file without touching committed history.
// Zero disables the corresponding budget.
const DEFAULT_VERIFICATION_POLICY: VerificationPolicy = { command_timeout_ms: 600000, output_max_bytes: 2000000 };

export async function loadVerificationPolicy(root: string): Promise<VerificationPolicy> {
  const file = projectPaths(root).verificationPolicy;
  if (!(await pathExists(file))) return { ...DEFAULT_VERIFICATION_POLICY };
  await assertSafeManagedPath(root, file);
  const candidate = await readJson<unknown>(file);
  const allowed = Object.keys(DEFAULT_VERIFICATION_POLICY);
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)
    || !Object.keys(candidate).every((key) => allowed.includes(key))
    || !Object.values(candidate).every((value) => Number.isInteger(value) && (value as number) >= 0)) {
    throw new SdlcError(`Invalid ${file}: expected integer values for a subset of ${allowed.join(", ")}.`);
  }
  return { ...DEFAULT_VERIFICATION_POLICY, ...(candidate as Partial<VerificationPolicy>) };
}

// Re-exported from its shared home so existing importers keep working; the
// definition lives beside matchesDefinitionEvidence in execution-selection.ts.
export { samePlatformDeclaration } from "./execution-selection.js";

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

interface CommandRun {
  exitCode: number;
  output: string;
  started: string;
  ended: string;
  spawnError: boolean;
  timedOut: boolean;
  truncated: boolean;
}

async function runCommand(command: CommandDefinition, cwd: string, policy: VerificationPolicy): Promise<CommandRun> {
  const started = new Date().toISOString();
  return new Promise((resolve) => {
    const child = spawn(command.command, { cwd, shell: true, env: process.env });
    let output = "";
    let bytes = 0;
    let truncated = false;
    let timedOut = false;
    let settled = false;
    // Byte-accurate accounting with a per-stream decoder: the old code
    // compared UTF-16 code units against a byte budget and split multibyte
    // sequences at chunk boundaries — invisible on ASCII fixtures, corrupting
    // on real suites that emit box drawing and check marks across megabytes.
    // A sequence split exactly at the cap stays held in the decoder rather
    // than flushing as U+FFFD.
    const makeAppend = (): ((chunk: Buffer) => void) => {
      const decoder = new StringDecoder("utf8");
      return (chunk: Buffer): void => {
        if (policy.output_max_bytes > 0) {
          const remaining = policy.output_max_bytes - bytes;
          if (remaining <= 0) { truncated = true; return; }
          if (chunk.length > remaining) { truncated = true; chunk = chunk.subarray(0, remaining); }
        }
        bytes += chunk.length;
        output += decoder.write(chunk);
      };
    };
    const timer = policy.command_timeout_ms > 0
      ? setTimeout(() => {
          timedOut = true;
          // shell:true leaves grandchildren a plain kill cannot reach; on
          // Windows they would outlive the shell holding the working directory
          // open, so the whole tree is killed. Destroying the streams settles
          // `close` now with what was captured even if something survives.
          if (process.platform === "win32" && child.pid) {
            spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" }).on("error", () => child.kill());
          } else {
            child.kill();
          }
          child.stdout.destroy();
          child.stderr.destroy();
        }, policy.command_timeout_ms)
      : null;
    const settle = (run: CommandRun): void => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(run);
    };
    child.stdout.on("data", makeAppend());
    child.stderr.on("data", makeAppend());
    child.on("error", (error) => settle({ exitCode: 1, output: `${output}\n${String(error)}`, started, ended: new Date().toISOString(), spawnError: true, timedOut, truncated }));
    child.on("close", (code) => settle({ exitCode: code ?? 1, output, started, ended: new Date().toISOString(), spawnError: false, timedOut, truncated }));
  });
}

type ReportFields = Pick<ExecutionRecord, "report" | "report_error" | "cases">;

/**
 * Parse the command's declared report and join its cases to the level's
 * specification rows. A missing or unparseable report is recorded as
 * report_error and never changes the run's outcome — the exit code stays the
 * only verdict, exactly as the RESULT artifact states.
 */
async function ingestReport(definition: CommandDefinition, cwd: string, roots: string[], artifacts: Artifact[], level: Level): Promise<ReportFields> {
  if (!definition.report) return {};
  const target = path.resolve(cwd, definition.report.path);
  try {
    const confined = await Promise.all(roots.map(async (allowed) => {
      try { return await isRealPathWithin(allowed, target); } catch { return false; }
    }));
    if (!confined.some(Boolean)) throw new SdlcError(`report path resolves outside configured sources: ${definition.report.path}`);
    const content = await readFile(target, "utf8");
    const parsed = definition.report.format === "junit" ? parseJunit(content) : parseTap(content);
    const specs = artifacts.filter((artifact) => LEVEL_SPEC_TYPES[level].includes(artifact.artifact_type) && artifact.status === "active");
    return {
      report: {
        path: definition.report.path,
        format: definition.report.format,
        hash: sha256(content),
        total: parsed.total,
        passed: parsed.passed,
        failed: parsed.failed,
        skipped: parsed.skipped
      },
      cases: joinCasesToSpecs(parsed.cases, specs)
    };
  } catch (error) {
    return { report_error: `Declared ${definition.report.format} report not ingested: ${String(error)}` };
  }
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
  const policy = await loadVerificationPolicy(root);
  const artifacts = planned.some(({ definition }) => definition.report) ? await scanArtifacts(root) : [];
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
    const result = await runCommand(definition, cwd, { ...policy, command_timeout_ms: definition.timeout_ms ?? policy.command_timeout_ms });
    const reportFields = await ingestReport(definition, cwd, roots, artifacts, level);
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
      host: { os: process.platform, release: os.release(), arch: os.arch(), node: process.versions.node },
      // Flags and report fields are written only when observed, so a record
      // without them stays byte-identical to what earlier engines wrote.
      ...(result.timedOut ? { timed_out: true } : {}),
      ...(result.truncated ? { output_truncated: true } : {}),
      ...(result.spawnError ? { spawn_error: true } : {}),
      // Written only when a large passed set exists; the RESULT renderer caps
      // its passed rows on this field alone, so every record without it —
      // including everything older engines wrote — renders byte-identically.
      ...((reportFields.cases?.filter((item) => item.status === "passed").length ?? 0) > 50 ? { case_row_cap: 50 } : {}),
      ...reportFields
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
