import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Artifact, ExecutionRecord } from "./types.js";
import { assertSafeManagedPath, isRealPathWithin, isWithin, projectPaths } from "./paths.js";
import { pathExists } from "./state.js";
import { renderResultArtifact } from "./result-artifact.js";
import { sha256 } from "./utils.js";

export async function executionProvenanceIssues(root: string, record: ExecutionRecord): Promise<string[]> {
  const issues: string[] = [];
  const expectedOutput = `.ai-saas-sdlc/executions/${record.id}.log`;
  if (record.output_file.replaceAll("\\", "/") !== expectedOutput) issues.push(`output_file must be ${expectedOutput}`);
  if (Date.parse(record.ended_at) < Date.parse(record.started_at)) issues.push("ended_at precedes started_at");
  const logFile = path.resolve(root, record.output_file);
  if (!isWithin(projectPaths(root).executions, logFile)) issues.push("output_file escapes executions directory");
  else if (!(await pathExists(logFile))) issues.push("execution log is missing");
  else {
    try {
      await assertSafeManagedPath(root, logFile);
      if (!(await isRealPathWithin(projectPaths(root).executions, logFile))) issues.push("execution log escapes through a symlink");
      else if (sha256(await readFile(logFile, "utf8")) !== record.output_hash) issues.push("execution log digest does not match output_hash");
    } catch {
      issues.push("execution log cannot be resolved safely");
    }
  }
  return issues;
}

export function resultBindingIssues(artifact: Artifact, record: ExecutionRecord): string[] {
  const issues: string[] = [];
  if (artifact.id !== `RESULT-${record.id}`) issues.push(`result ID must be RESULT-${record.id}`);
  if (artifact.execution_id !== record.id) issues.push(`execution_id must be ${record.id}`);
  if (artifact.hash !== sha256(renderResultArtifact(record, artifact.created_by_change))) issues.push("result content does not match its execution record");
  return issues;
}
