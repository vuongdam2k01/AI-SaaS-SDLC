import { Command, Option } from "commander";
import { resolve } from "node:path";
import { initializeProject } from "../core/template.js";
import { loadCurrentState, loadActiveFlow, startFlow, closeFlow, checkpointFlow } from "../core/state.js";
import { flowGuidance } from "../core/flow-guidance.js";
import { FLOW_STAGES, type FlowStage } from "../core/types.js";
import { projectSnapshot, refreshProject } from "../core/project.js";
import { ensureEnginePointerIgnored, recordEnginePointer } from "../core/engine-pointer.js";
import { scanArtifacts } from "../core/artifacts.js";
import { buildGraph } from "../core/graph.js";
import { validateProject } from "../core/validation.js";
import { selectTests } from "../core/test-selection.js";
import { loadConfig } from "../core/config.js";
import { executeVerification } from "../core/verification.js";
import { createBaseline, syncRepresentationChanges } from "../core/baseline.js";
import { SdlcError } from "../core/errors.js";
import { withProjectLock } from "../core/project-lock.js";
import { resolveRuntimeRoot } from "../core/runtime-root.js";
import { resolveCatalog } from "../core/pattern-catalog.js";
import { createArtifactFromPattern } from "../core/artifact-instantiation.js";
import { STALE_AFTER_BASELINES, baselinesOpen, openQuestions } from "../core/question-ledger.js";

const program = new Command();
const root = process.cwd();
const runtimeRoot = resolveRuntimeRoot(import.meta.url);

if (Number(process.versions.node.split(".")[0]) < 22) {
  throw new SdlcError(`Node.js 22 or newer is required; found ${process.versions.node}.`);
}

function print(value: unknown, json = false): void {
  if (json || typeof value !== "string") console.log(JSON.stringify(value, null, 2));
  else console.log(value);
}

program.name("ai-saas-sdlc").description("Deterministic engine for AI SaaS SDLC documentation flows.").version("1.3.0");

program.command("init")
  .description("Initialize a centralized documentation repository.")
  .option("--project-id <id>", "Stable project identifier")
  .option("--idea <text>", "Raw idea preserved verbatim", "")
  .action(async (options: { projectId?: string; idea: string }) => {
    const projectId = options.projectId ?? root.split(/[\\/]/).at(-1)?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ?? "saas-project";
    await withProjectLock(root, async () => {
      await initializeProject(
        root,
        resolve(runtimeRoot, "resources", "project-template"),
        projectId,
        options.idea,
        resolve(runtimeRoot, "resources", "artifact-patterns")
      );
      await refreshProject(root, false);
      await recordEnginePointer(root, runtimeRoot, program.version() ?? "0.0.0");
      await ensureEnginePointerIgnored(root);
    });
    print(`Initialized AI SaaS SDLC documentation repository: ${projectId}`);
  });

const patterns = program.command("patterns").description("Inspect the pinned scalable artifact pattern catalog.");
patterns.command("list")
  .option("--json", "Emit JSON")
  .action(async (options: { json?: boolean }) => {
    const catalog = await resolveCatalog(root, runtimeRoot);
    const entries = catalog.patterns.map((pattern) => ({
      artifact_type: pattern.artifact_type,
      id_pattern: pattern.id_pattern,
      target: pattern.target,
      template: pattern.template
    }));
    print(options.json ? { version: catalog.version, patterns: entries } : entries.map((entry) => `${entry.artifact_type}\t${entry.id_pattern}\t${entry.target}`).join("\n"), Boolean(options.json));
  });

const artifact = program.command("artifact").description("Instantiate scalable artifacts from the pinned pattern catalog.");
artifact.command("create")
  .requiredOption("--type <type>", "Catalog artifact_type")
  .requiredOption("--id <id>", "Permanent artifact ID")
  .requiredOption("--title <title>", "Human-readable title")
  .option("--json", "Emit JSON")
  .action(async (options: { type: string; id: string; title: string; json?: boolean }) => {
    const result = await createArtifactFromPattern(root, await resolveCatalog(root, runtimeRoot), options.type, options.id, options.title);
    print(options.json ? result : `Created ${result.id} at ${result.file}`, Boolean(options.json));
  });

program.command("state")
  .description("Show current baseline and active flow.")
  .option("--json", "Emit JSON")
  .action(async (options: { json?: boolean }) => {
    const current = await loadCurrentState(root);
    const flow = await loadActiveFlow(root);
    // Age, not just presence. An author reading state can otherwise see twenty
    // open questions and no indication which of them the product has already
    // moved on without.
    const questions = openQuestions(await scanArtifacts(root)).map((question) => ({
      id: question.id,
      first_baseline: current.question_first_baseline?.[question.id] ?? null,
      baselines_open: baselinesOpen(current.question_first_baseline?.[question.id], current.active_baseline),
      stale: (baselinesOpen(current.question_first_baseline?.[question.id], current.active_baseline) ?? 0) >= STALE_AFTER_BASELINES
    })).sort((a, b) => (b.baselines_open ?? -1) - (a.baselines_open ?? -1) || a.id.localeCompare(b.id));
    print({ current, active_flow: flow, open_questions: questions }, Boolean(options.json));
  });

const flow = program.command("flow").description("Manage one of the four temporal flows.");
flow.command("start")
  .requiredOption("--type <type>", "genesis|reassessment|evolution|reconciliation")
  .option("--input <text>", "Raw flow trigger", "")
  .option("--until <stage>", "Stop this turn at behavior|design|tests|implementation|baseline")
  .option("--json", "Emit JSON")
  .action(async (options: { type: string; input: string; until?: string; json?: boolean }) => {
    if (options.until !== undefined && !FLOW_STAGES.includes(options.until as FlowStage)) {
      throw new SdlcError(`Unsupported flow stage: ${options.until}. Expected ${FLOW_STAGES.join("|")}.`);
    }
    print(await startFlow(root, options.type, options.input, options.until as FlowStage | undefined), Boolean(options.json));
  });
flow.command("checkpoint")
  .description("Record the checkpoint an open flow has reached, and optionally retarget where it stops.")
  .requiredOption("--stage <stage>", "behavior|design|tests|implementation|baseline")
  .option("--until <stage>", "Retarget where this turn stops")
  .option("--json", "Emit JSON")
  .action(async (options: { stage: string; until?: string; json?: boolean }) => {
    print(await checkpointFlow(root, options.stage, options.until), Boolean(options.json));
  });
flow.command("next")
  .description("Report the open flow's progress and the exact command to run next.")
  .option("--json", "Emit JSON")
  .action(async (options: { json?: boolean }) => print(await flowGuidance(root), Boolean(options.json)));
flow.command("close")
  .option("--json", "Emit JSON")
  .action(async (options: { json?: boolean }) => print(await closeFlow(root), Boolean(options.json)));

program.command("impact")
  .description("Compute direct changes and reverse dependency closure.")
  .option("--json", "Emit JSON")
  .action(async (options: { json?: boolean }) => print((await projectSnapshot(root)).impact, Boolean(options.json)));

program.command("validate")
  .description("Validate schemas, IDs, lifecycle, references, immutable artifacts and results.")
  .option("--active", "Validate during the active flow")
  .option("--all", "Validate the full repository")
  .option("--json", "Emit JSON")
  .action(async (options: { json?: boolean }) => {
    const artifacts = await scanArtifacts(root);
    const report = await validateProject(root, artifacts);
    const drift = await refreshProject(root, true);
    if (drift.length > 0) {
      report.findings.push({ severity: "error", code: "GENERATED_DRIFT", message: `Generated projections are out of sync: ${drift.join(", ")}` });
      report.valid = false;
    }
    print(report, Boolean(options.json));
    if (!report.valid) process.exitCode = 1;
  });

const tests = program.command("tests").description("Derive verification requirements from impact.");
tests.command("select")
  .option("--json", "Emit JSON")
  .action(async (options: { json?: boolean }) => {
    const snapshot = await projectSnapshot(root);
    print(selectTests(snapshot.artifacts, buildGraph(snapshot.artifacts), snapshot.impact.affected), Boolean(options.json));
  });

program.command("verify")
  .description("Execute only verification commands declared in sdlc.config.yaml.")
  .addOption(new Option("--unit", "Run UT commands"))
  .addOption(new Option("--integration", "Run IT commands"))
  .addOption(new Option("--system", "Run ST commands"))
  .addOption(new Option("--all", "Run UT, IT and ST commands"))
  .requiredOption("--execute", "Confirm execution of declared commands")
  .option("--json", "Emit JSON")
  .action(async (options: { unit?: boolean; integration?: boolean; system?: boolean; all?: boolean; json?: boolean }) => {
    const levels = options.all || (!options.unit && !options.integration && !options.system)
      ? ["unit", "integration", "system"] as const
      : ([options.unit && "unit", options.integration && "integration", options.system && "system"].filter(Boolean) as Array<"unit" | "integration" | "system">);
    const records = await executeVerification(root, await loadConfig(root), [...levels]);
    print(records, Boolean(options.json));
    if (records.some((record) => record.exit_code !== 0)) process.exitCode = 1;
  });

const baseline = program.command("baseline").description("Manage verified semantic baselines.");
baseline.command("create").option("--json", "Emit JSON").action(async (options: { json?: boolean }) => print(await createBaseline(root), Boolean(options.json)));

program.command("refresh")
  .description("Regenerate deterministic projections.")
  .option("--check", "Report drift without writing")
  .option("--editorial", "Explicitly accept body-only editorial changes without a product flow")
  .option("--json", "Emit JSON")
  .action(async (options: { check?: boolean; editorial?: boolean; json?: boolean }) => {
    if (options.check && options.editorial) throw new SdlcError("--check and --editorial cannot be combined.");
    if (options.editorial) await syncRepresentationChanges(root);
    const drift = await refreshProject(root, Boolean(options.check));
    if (!options.check) await recordEnginePointer(root, runtimeRoot, program.version() ?? "0.0.0");
    print({ synchronized: drift.length === 0, drift }, Boolean(options.json));
    if (options.check && drift.length > 0) process.exitCode = 1;
  });

program.command("migrate")
  .description("Check or apply documentation schema migrations.")
  .option("--check", "Check only")
  .option("--json", "Emit JSON")
  .action(async (options: { json?: boolean }) => {
    const config = await loadConfig(root);
    const state = await loadCurrentState(root);
    const result = { current_schema: 1, migration_required: config.schema_version !== 1 || state.schema_version !== 1 };
    print(result, Boolean(options.json));
    if (result.migration_required) process.exitCode = 1;
  });

program.parseAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = error instanceof SdlcError ? error.exitCode : 1;
});
