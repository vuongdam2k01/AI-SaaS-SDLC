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
  // Both rows derive from the record alone. This function is re-rendered on
  // every machine that validates, and its digest is compared against the
  // stored artifact, so reading the local environment here would break every
  // committed result the moment another machine validates the repository.
  // A record without the optional fields must render byte-identically to the
  // output of the engine that wrote it.
  const fingerprint = record.host ? tableCell(`${record.host.os} ${record.host.release} ${record.host.arch}; node ${record.host.node}`) : NOT_REPORTED;
  const declaredPlatforms = record.platforms ? `\n| Declared platform evidence | ${tableCell(record.platforms.join(", "))} |` : "";
  const flags = [
    record.spawn_error ? "spawn error — the command never ran; an environment failure, not a test failure" : null,
    record.timed_out ? "timed out at the machine-local budget and was killed" : null,
    record.output_truncated ? "output truncated at the machine-local byte budget" : null
  ].filter((value): value is string => value !== null);
  const executionFlags = flags.length > 0 ? `\n| Execution flags | ${tableCell(flags.join("; "))} |` : "";
  const evidence = `${record.output_file} (SHA-256 ${record.output_hash})`;
  const failedCases = (record.cases ?? []).filter((item) => item.status === "failed");
  const failure = record.exit_code === 0
    ? `| Command ${record.command_id} | No command-level failure observed; exit code was 0. | Exit code 0 | ${tableCell(evidence)} | none recorded by execution engine |`
    : failedCases.length > 0
      ? failedCases.map((item) => `| ${tableCell(`${item.spec_id ?? "unmatched specification"}${item.case_ids ? ` ${item.case_ids.join(", ")}` : ""}`)} | ${tableCell(`Reported failed: ${item.name}`)} | Case passes in the declared report | ${tableCell(evidence)} | none recorded by execution engine |`).join("\n")
      : `| Command ${record.command_id}; case mapping ${NOT_REPORTED} | Configured command exited with code ${record.exit_code}. | Exit code 0 | ${tableCell(evidence)} | none recorded by execution engine |`;
  const aggregate = record.report
    ? { total: String(record.report.total), passed: String(record.report.passed), failed: String(record.report.failed), skipped: String(record.report.skipped) }
    : { total: NOT_REPORTED, passed: NOT_REPORTED, failed: NOT_REPORTED, skipped: NOT_REPORTED };
  // The cap is keyed on the record field alone — never on the case count —
  // because this artifact is re-rendered and hash-compared on every validate:
  // a content-conditional cap would invalidate committed results written by
  // earlier engines. Failed and skipped rows are never capped; failures are
  // the evidence this artifact exists to carry.
  const allCases = record.cases ?? [];
  let passedShown = 0;
  const visibleCases = record.case_row_cap === undefined
    ? allCases
    : allCases.filter((item) => item.status !== "passed" || passedShown++ < record.case_row_cap!);
  const hiddenPassed = allCases.length - visibleCases.length;
  const caseRows = visibleCases.map((item) =>
    `| ${tableCell(item.spec_id ?? "not matched to a specification")} | ${tableCell(item.case_ids?.join(", ") ?? "—")} | ${item.status} | ${item.time_ms === null ? "not reported" : `${item.time_ms} ms`} | ${tableCell(item.name)} |`
  ).join("\n") + (hiddenPassed > 0 ? `\n| capped at ${record.case_row_cap} passed rows | — | passed | not shown | ${tableCell(`${hiddenPassed} more passed cases; the full set is in ${recordFile}`)} |` : "");
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
| Environment fingerprint | ${fingerprint} |${declaredPlatforms}${executionFlags}

## Aggregate result

| Metric | Value |
|---|---|
| Total test cases | ${aggregate.total} |
| Passed test cases | ${aggregate.passed} |
| Failed test cases | ${aggregate.failed} |
| Skipped test cases | ${aggregate.skipped} |
| Command executions | 1 |
| Command outcome | ${outcome} |
| Duration | ${duration(record)} |

## Case results

| Test spec ID | Case ID | Outcome | Duration | Evidence reference |
|---|---|---|---|---|
${caseRows || `| ${NOT_REPORTED} | ${NOT_REPORTED} | ${NOT_REPORTED} | ${NOT_REPORTED} | ${tableCell(recordFile)} |`}

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
${record.report ? `- Declared ${record.report.format} report: \`${record.report.path}\` (SHA-256 \`${record.report.hash}\`); case rows above are parsed from it and joined to specification mapping rows at execution time.\n` : ""}${record.report_error ? `- ${tableCell(record.report_error)}\n` : ""}`;
}
