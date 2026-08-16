/**
 * End-to-end coverage through the packaged binary.
 *
 * Everything here is ground no unit test holds: that generation-5 tables reach a
 * real instance created by `artifact create`, that the closure warnings behave
 * across a whole flow (appear, never block, clear when routed to a question),
 * that a contract tightened after a baseline cannot strand a sealed decision
 * record, and that the counts and versions the shipped documentation states
 * match what the code emits. Every engine state transition runs through
 * bin/ai-saas-sdlc, never through src/, because that is what an installed user
 * actually executes.
 */
import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cleanup, establishGenesis, pluginRoot, repinPatternSnapshot, tempProject } from "./helpers.js";
import { addApprovalFeature, materializePatternArtifact } from "./fixtures/complete-saas/fixture.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

function cli(root: string, args: string[]) {
  return spawnSync(process.execPath, [path.join(pluginRoot, "bin", "ai-saas-sdlc"), ...args], {
    cwd: root, encoding: "utf8", env: { ...process.env, CLAUDE_PLUGIN_ROOT: pluginRoot }
  });
}

function findings(root: string): { severity: string; code: string; message: string; file?: string }[] {
  const run = cli(root, ["validate", "--all", "--json"]);
  return JSON.parse(run.stdout).findings;
}

const SEMANTIC_TYPES = [
  ["feature", "FTR-CERT-001"], ["use_case", "UC-CERT-001"], ["business_flow", "FLOW-CERT-001"],
  ["screen", "SCR-CERT-001"], ["component", "CMP-CERT-001"], ["subsystem", "SUB-CERT-001"],
  ["api_processing", "API-CERT-001"], ["entity", "ENT-CERT-001"], ["external_integration", "INT-CERT-001"],
  ["job", "JOB-CERT-001"], ["event", "EVT-CERT-001"], ["platform_target", "PLT-CERT-001"],
  ["unit_test_backend", "UT-API-CERT-001"], ["unit_test_frontend", "UT-UI-CERT-001"],
  ["unit_test_job", "UT-JOB-CERT-001"], ["integration_test", "IT-CERT-001"], ["system_test", "ST-CERT-001"],
  ["issue", "ISS-CERT-001"], ["architectural_decision", "ADR-CERT-001"]
] as const;

/** New generation-5 identified tables, per type, as they must appear in an instance. */
const GENERATION_5_MARKERS: Record<string, string[]> = {
  screen: ["| AX-01 |", "## Accessibility"],
  component: ["| AX-01 |"],
  api_processing: ["| TX-01 |", "| TX-05 |"],
  job: ["| CC-01 |", "| CC-05 |"],
  event: ["| EM-01 |", "| DL-01 |", "| EP-01 |"],
  external_integration: ["| AU-01 |", "| RL-01 |", "| OB-01 |"],
  entity: ["| OW-01 |", "| T-01 |", "| REL-01 |", "| RT-01 |"],
  subsystem: ["| B-01 |"],
  use_case: ["| G-01 |"],
  business_flow: ["| EE-01 |"],
  architectural_decision: ["| DEC-01 |", "| FC-01 |"],
  unit_test_backend: ["| EX-01 |", "constraint"],
  unit_test_frontend: ["| EX-01 |"],
  unit_test_job: ["| EX-01 |"],
  integration_test: ["| State guarantee |"],
  system_test: ["| TC-01 |"]
};

describe("generation 5 reaches instances created through the binary", () => {

  it("gives every created instance the identified tables and detail rule its type declares", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    cli(root, ["flow", "start", "--type", "evolution", "--input", "Certification sweep"]);

    const missing: string[] = [];
    for (const [type, id] of SEMANTIC_TYPES) {
      const created = cli(root, ["artifact", "create", "--type", type, "--id", id, "--title", `Cert ${type}`, "--json"]);
      if (created.status !== 0) { missing.push(`${type}: not created`); continue; }
      const body = await readFile(path.join(root, JSON.parse(created.stdout).file), "utf8");
      for (const marker of GENERATION_5_MARKERS[type] ?? []) {
        if (!body.includes(marker)) missing.push(`${type} lacks ${marker}`);
      }
      // Every contract comment carries its consumer-derived detail rule.
      if (!body.includes("Detail rule:")) missing.push(`${type} lacks a Detail rule`);
    }
    expect(missing).toEqual([]);
  });
});

describe("closure warnings across a whole flow", () => {
  it("stays clean on a complete closure, names an unclaimed action, never blocks, and clears once a question routes it", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    cli(root, ["flow", "start", "--type", "evolution", "--input", "Approval decisions"]);
    await addApprovalFeature(root);
    expect(cli(root, ["refresh", "--json"]).status).toBe(0);

    const closureCodes = ["ACCESS_UNVERIFIED", "INVARIANT_UNVERIFIED", "ERROR_UNVERIFIED", "UX_UNVERIFIED", "SCREEN_BEHAVIOR_UNCLAIMED"];
    expect(findings(root).filter((f) => closureCodes.includes(f.code))).toEqual([]);

    // Both projections exist and are reproducible.
    expect(await readFile(path.join(root, "generated", "screen-coverage.md"), "utf8")).toContain("SCR-APPROVAL-001#E-01");
    expect(await readFile(path.join(root, "generated", "foundation-coverage.md"), "utf8")).toContain("ACCESS-001");
    expect(cli(root, ["refresh", "--check", "--json"]).status).toBe(0);

    // B3: a new action nothing claims.
    const screenFile = path.join(root, "03-design", "screens", "SCR-APPROVAL-001.md");
    const screen = (await readFile(screenFile, "utf8")).replace(/\r\n/g, "\n");
    const at = screen.indexOf("\n", screen.indexOf("| E-02 | Activate B-02."));
    await writeFile(screenFile, `${screen.slice(0, at)}\n| E-03 | Activate Withdraw. | ACCESS-002; pending. | API-APPROVAL-001 | announce withdrawn | show safe API error; retain state |${screen.slice(at)}`, "utf8");
    cli(root, ["refresh", "--json"]);

    const unclaimed = findings(root).filter((f) => f.code === "SCREEN_BEHAVIOR_UNCLAIMED");
    expect(unclaimed).toHaveLength(1);
    expect(unclaimed[0]?.severity).toBe("warning");
    expect(unclaimed[0]?.message).toContain("SCR-APPROVAL-001#E-03");
    // A warning never blocks: validate still exits 0 and a baseline is legal.
    expect(cli(root, ["validate", "--all", "--json"]).status).toBe(0);
    expect(cli(root, ["baseline", "create", "--json"]).status).toBe(0);

    // B4: routing the undefined behavior to a question closes it.
    const ledgerFile = path.join(root, "05-control", "questions.md");
    const ledger = (await readFile(ledgerFile, "utf8")).replace(/\r\n/g, "\n");
    const rowAt = ledger.lastIndexOf("\n", ledger.indexOf("## Resolution recording"));
    await writeFile(ledgerFile, `${ledger.slice(0, rowAt)}\n| QST-900 | What does SCR-APPROVAL-001#E-03 do when the request is already terminal? | Withdrawal after a decision is undefined. | SCR-APPROVAL-001 | Product decision | owner-decision | ACCESS-CONTROL | open |${ledger.slice(rowAt)}`, "utf8");
    cli(root, ["refresh", "--json"]);
    expect(findings(root).filter((f) => f.code === "SCREEN_BEHAVIOR_UNCLAIMED")).toEqual([]);
  });

});

describe("a contract tightened after a baseline", () => {
  it("cannot strand an accepted decision record, while still holding a mutable artifact to the new shape", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    cli(root, ["flow", "start", "--type", "evolution", "--input", "Approval decisions"]);
    await addApprovalFeature(root);
    // The subject of this check: a decision record that is accepted, and
    // therefore immutable, once the baseline seals it.
    await materializePatternArtifact(root, {
      type: "architectural_decision",
      id: "ADR-APPROVAL-001",
      title: "Approval consistency model",
      dependsOn: ["ARCHITECTURE-OVERVIEW", "SYSTEM-INVARIANTS"],
      adrStatus: "accepted"
    });
    cli(root, ["refresh", "--json"]);
    expect(cli(root, ["baseline", "create", "--json"]).status).toBe(0);
    cli(root, ["flow", "close", "--json"]);
    const manifest = JSON.parse(await readFile(path.join(root, "generated", "baseline-manifest.json"), "utf8"));
    const sealed = manifest.artifacts.find((entry: { id: string }) => entry.id === "ADR-APPROVAL-001");
    expect(sealed?.adr_status, "the ADR must be baselined and accepted, or this check proves nothing").toBe("accepted");

    // A future generation tightens both an immutable family and a mutable one.
    const file = path.join(root, "00-system", "patterns", "catalog.yaml");
    const catalog = (await readFile(file, "utf8"))
      .replace("      - {heading: Decision, columns: [Local ID, Concern, Statement], min_rows: 1}",
        "      - {heading: Decision, columns: [Local ID, Concern, Statement], min_rows: 1}\n      - {heading: Purpose and boundary, columns: [Local ID, Future], min_rows: 1}")
      .replace("      - {heading: Accessibility, columns: [Local ID, Requirement, Applies to, Observable evidence, UX rule], min_rows: 1}",
        "      - {heading: Accessibility, columns: [Local ID, Requirement, Applies to, Observable evidence, UX rule], min_rows: 1}\n      - {heading: Purpose and boundary, columns: [Local ID, Future], min_rows: 1}");
    await writeFile(file, catalog, "utf8");
    await repinPatternSnapshot(root);

    const after = findings(root);
    const adrErrors = after.filter((f) => f.severity === "error" && f.file?.includes("ADR-APPROVAL-001"));
    const screenErrors = after.filter((f) => f.severity === "error" && f.file?.includes("SCR-APPROVAL-001"));
    // The accepted ADR is sealed: no error it could never repair.
    expect(adrErrors).toEqual([]);
    // The control: a live, mutable screen is still held to the new contract.
    expect(screenErrors.length).toBeGreaterThan(0);
    expect(screenErrors.some((f) => f.code === "CONTENT_TABLE_MISSING")).toBe(true);
  });
});

describe("the shipped surface states what the code does", () => {
  it("reaches the derivation protocol from every place that derives cases", async () => {
    const citations = [
      "resources/protocols/test-derivation.md",
      "resources/flow-playbooks/product-evolution.md",
      "resources/flow-playbooks/reconciliation.md"
    ];
    for (const relative of citations) {
      const body = await readFile(path.join(pluginRoot, relative), "utf8");
      expect(body, relative).toContain("resources/protocols/test-case-derivation.md");
    }
  });

  it("matches the warning table to the codes the engine actually emits", async () => {
    const table = await readFile(path.join(pluginRoot, "resources", "project-template", "00-system", "validation-rules.md"), "utf8");
    const documented = new Set([...table.matchAll(/^\| `([A-Z_]+)` \|/gm)].map((match) => match[1]!));
    expect(documented.size).toBe(36);
    for (const code of [
      "ACCESS_UNVERIFIED", "INVARIANT_UNVERIFIED", "ERROR_UNVERIFIED", "UX_UNVERIFIED", "SCREEN_BEHAVIOR_UNCLAIMED", "SYSTEM_DOCUMENT_INCOMPLETE",
      "IMPACT_UNCLASSIFIED", "DOCUMENTATION_DRIFT", "SPEC_EXECUTION_UNATTRIBUTED", "CLAIM_WITHOUT_DEPENDENCY", "DESIGN_TOKENS_UNCOMMITTED",
      "CONFIG_KEY_UNDECLARED", "CONFIG_REQUIREMENT_UNSUPPLIED", "CONFIG_DECLARATION_UNKNOWN", "QUESTION_AWAITING_OWNER"
    ]) {
      expect(documented.has(code), code).toBe(true);
    }
    expect(table).toContain("Thirty-six exist");
  });

  it("carries one identical version in all five places that carry it", async () => {
    const read = async (relative: string) => JSON.parse(await readFile(path.join(pluginRoot, relative), "utf8"));
    const expected = (await read("package.json")).version;
    expect(expected).toBe("1.28.0");
    expect((await read(".claude-plugin/plugin.json")).version).toBe(expected);
    expect((await read(".codex-plugin/plugin.json")).version).toBe(expected);
    const marketplace = await read(".claude-plugin/marketplace.json");
    expect(marketplace.version).toBe(expected);
    expect(marketplace.plugins[0].version).toBe(expected);
    expect(await readFile(path.join(pluginRoot, "src", "cli", "main.ts"), "utf8")).toContain(`.version("${expected}")`);
  });
});
