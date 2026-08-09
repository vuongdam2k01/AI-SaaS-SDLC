# Forward evals

The five cases grade installed-skill behavior from three captured surfaces: the initialized documentation repository, the host tool trace, and the final response. A fluent response cannot compensate for missing files, uninspected sources, direct RESULT writes, or prohibited procedure.

Model execution is intentionally optional and external to deterministic CI. Run each prompt in a fresh repository with only the packaged Claude or Codex plugin installed. Capture host tool events as a JSON array (each event should expose `tool` or `name`) and retain the output repository.

Audit a capture before applying the semantic grader:

```text
node evals/harness.mjs --case genesis --output <repository> --trace <tool-trace.json>
```

The harness enforces auditable minimum files, tool use, required output markers, and prohibited trace patterns from `manifest.json`. It does not call a model, invent tool evidence, or award the semantic score. Apply the case grader to the captured artifacts and trace after the deterministic audit passes.

For host parity, rerun Genesis or Evolution once through each packaged adapter from fresh identical input. The deterministic dual-host tests assert manifest/root/playbook equivalence; the eval grader checks that both hosts still produce equivalent canonical domain artifacts despite host-specific tool names.

Never publish captured secrets, private source text, or paid model output as repository fixtures.
