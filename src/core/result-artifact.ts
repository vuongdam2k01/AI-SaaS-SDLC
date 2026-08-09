import type { ExecutionRecord } from "./types.js";

const NOT_REPORTED = "not reported by configured command";

function tableCell(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("|", "&#124;")
    .replace(/\r?\n/g, "&#10;");
}

function duration(record: ExecutionRecord): string {
  const milliseconds = Date.parse(record.ended_at) - Date.parse(record.started_at);
  return Number.isFinite(milliseconds) && milliseconds >= 0 ? `${milliseconds} ms` : "not available: invalid execution timestamps";
}

export function renderResultArtifact(record: ExecutionRecord, change: string): string {
  const outcome = record.exit_code === 0 ? "passed" : "failed";
  const recordFile = record.output_file.replace(/\.log$/, ".json");
  const evidence = `${record.output_file} (SHA-256 ${record.output_hash})`;
  const failure = record.exit_code === 0
    ? `| Command ${record.command_id} | No command-level failure observed; exit code was 0. | Exit code 0 | ${tableCell(evidence)} | none recorded by execution engine |`
    : `| Command ${record.command_id}; case mapping ${NOT_REPORTED} | Configured command exited with code ${record.exit_code}. | Exit code 0 | ${tableCell(evidence)} | none recorded by execution engine |`;
  return `---
id: RESULT-${record.id}
artifact_type: test_result
title: ${JSON.stringify(`Result for ${record.command_id}`)}
status: active
created_by_change: ${change}
depends_on: [TEST-POLICY]
decisions: []
implementation: []
supersedes:
execution_id: ${record.id}
---
# RESULT-${record.id} - Result for ${record.command_id}

## Execution identity

- Execution ID: ${record.id}
- Verification level: ${record.level}
- Configured command ID: ${record.command_id}
- Started at: ${record.started_at}
- Finished at: ${record.ended_at}
- Overall outcome: ${outcome} (derived from exit code ${record.exit_code})

## Execution provenance

| Field | Engine-recorded value |
|---|---|
| Source revision | ${tableCell(record.git_commit ?? "not available from source control")} |
| Source snapshot SHA-256 | ${record.source_snapshot_hash} |
| Flow ID | ${record.flow_id} |
| Change ID | ${change} |
| Command | ${tableCell(record.command)} |
| Working directory | ${tableCell(record.cwd)} |
| Toolchain | ${NOT_REPORTED} |
| Environment fingerprint | ${NOT_REPORTED} |

## Aggregate result

| Metric | Value |
|---|---|
| Total test cases | ${NOT_REPORTED} |
| Passed test cases | ${NOT_REPORTED} |
| Failed test cases | ${NOT_REPORTED} |
| Skipped test cases | ${NOT_REPORTED} |
| Command executions | 1 |
| Command outcome | ${outcome} |
| Duration | ${duration(record)} |

## Case results

| Test spec ID | Case ID | Outcome | Duration | Evidence reference |
|---|---|---|---|---|
| ${NOT_REPORTED} | ${NOT_REPORTED} | ${NOT_REPORTED} | ${NOT_REPORTED} | ${tableCell(recordFile)} |

## Failures and evidence

| Test spec and case | Observed failure | Expected behavior | Diagnostic evidence | Related issue |
|---|---|---|---|---|
${failure}

## Integrity contract

- Execution record: \`${recordFile}\`.
- Output log: \`${record.output_file}\`.
- Output log SHA-256: \`${record.output_hash}\`.
- Source snapshot SHA-256: \`${record.source_snapshot_hash}\`.
- This artifact is a deterministic projection of ${record.id} and is not user-created or user-editable.
- Command outcome is derived only from the recorded exit code; case counts and test-spec mappings are never inferred.
- Output sanitization status is ${NOT_REPORTED}; the referenced log preserves the command output recorded by the engine.
`;
}
