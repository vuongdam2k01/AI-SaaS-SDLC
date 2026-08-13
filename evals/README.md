# Forward evals

The six cases grade installed-skill behavior from three captured surfaces: the initialized documentation repository, the host tool trace, and the final response. A fluent response cannot compensate for missing files, uninspected sources, direct RESULT writes, or prohibited procedure. The implementation case additionally requires a wired sibling codebase fixture (a minimal `node:test` scaffold with one deliberately red suite), so its capture includes real failed-then-repaired execution records.

Model execution is intentionally optional and external to deterministic CI. Run each prompt in a fresh repository with only the packaged Claude or Codex plugin installed. Capture host tool events as a JSON array (each event should expose `tool` or `name`) and retain the output repository. Save the session's final response(s) as a markdown file inside the output repository root as part of the capture: several required output markers — the `--intent implementation` invocation, the `suggested_segment` guidance, PASS/MISSING/EXTRA grading — exist only in the model's closing reports, never in engine-persisted files, so the harness can audit them only when the response travels with the repository.

Audit a capture before applying the semantic grader:

```text
node evals/harness.mjs --case genesis --output <repository> --trace <tool-trace.json>
```

The harness enforces auditable minimum files, tool use, required output markers, and prohibited trace patterns from `manifest.json`. It does not call a model, invent tool evidence, or award the semantic score. Apply the case grader to the captured artifacts and trace after the deterministic audit passes.

For host parity, rerun Genesis or Evolution once through each packaged adapter from fresh identical input. The deterministic dual-host tests assert manifest/root/playbook equivalence; the eval grader checks that both hosts still produce equivalent canonical domain artifacts despite host-specific tool names.

Never publish captured secrets, private source text, or paid model output as repository fixtures.
