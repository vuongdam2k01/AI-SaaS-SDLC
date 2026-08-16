import { afterEach, describe, expect, it } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { artifact, cleanup, establishGenesis, tempProject } from "./helpers.js";
import { addApprovalFeature } from "./fixtures/complete-saas/fixture.js";
import { closeFlow, startFlow } from "../src/core/state.js";
import { scanArtifacts } from "../src/core/artifacts.js";
import { validateProject } from "../src/core/validation.js";
import { createBaseline } from "../src/core/baseline.js";
import { refreshProject } from "../src/core/project.js";
import { committedDesignTokens, designTokenFindings, designTokensDeferred } from "../src/core/design-tokens.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

const TOKENLESS_UX_BODY = `# Shared UX rules

## Design tokens

| Token | Value | Applies to | Accessibility note |
|---|---|---|---|
`;

const COMMITTED_UX_BODY = `${TOKENLESS_UX_BODY}| DT-01 | #1A365D | primary text on background | adjusted for 4.5:1 on surface |
`;

// The row the observed defect actually shipped: completed by every placeholder
// heuristic, committing nothing. The identifier, not row presence, decides.
const NARRATIVE_UX_BODY = `${TOKENLESS_UX_BODY}| — | Not yet committed | — | The visual system is deliberately uncommitted |
`;

function ledgerBody(status: "open" | "resolved"): string {
  return `# Open question ledger

## Open questions

| Question ID | Question | Why it matters | Affected artifacts | Evidence needed | Resolution artifact | Status |
|---|---|---|---|---|---|---|
| QST-001 | Which visual direction fits the brand? | Every screen consumes it | UX-RULES#design-tokens | Owner decision | future ADR | ${status} |
`;
}

const LIVE_SCREEN = () => artifact({ id: "SCR-A-001", artifact_type: "screen", status: "active", body: "# SCR\n" });

describe("design token commitment", () => {
  it("owes nothing while no live screen exists", () => {
    expect(designTokenFindings([artifact({ id: "UX-RULES", artifact_type: "ux_rules", status: "active", body: TOKENLESS_UX_BODY })])).toEqual([]);
    expect(designTokenFindings([
      artifact({ id: "SCR-A-001", artifact_type: "screen", status: "draft", body: "# SCR\n" }),
      artifact({ id: "UX-RULES", artifact_type: "ux_rules", status: "active", body: TOKENLESS_UX_BODY })
    ])).toEqual([]);
  });

  it("reports a live screen rendering with no committed token", () => {
    const findings = designTokenFindings([LIVE_SCREEN(), artifact({ id: "UX-RULES", artifact_type: "ux_rules", status: "active", body: TOKENLESS_UX_BODY })]);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ severity: "warning", code: "DESIGN_TOKENS_UNCOMMITTED", file: "UX-RULES.md" });
    expect(findings[0]?.message).toContain("UX-RULES#design-tokens");
  });

  it("clears on a DT row, read from the ux_rules artifact in any status", () => {
    // The foundation may still be draft when the first screen goes live; the
    // section is the authority either way, like the question ledger.
    const draftUxRules = artifact({ id: "UX-RULES", artifact_type: "ux_rules", status: "draft", body: COMMITTED_UX_BODY });
    expect(committedDesignTokens([draftUxRules])).toBe(true);
    expect(designTokenFindings([LIVE_SCREEN(), draftUxRules])).toEqual([]);
  });

  it("does not accept a completed narrative row as a commitment", () => {
    const uxRules = artifact({ id: "UX-RULES", artifact_type: "ux_rules", status: "active", body: NARRATIVE_UX_BODY });
    expect(committedDesignTokens([uxRules])).toBe(false);
    expect(designTokenFindings([LIVE_SCREEN(), uxRules])).toHaveLength(1);
  });

  it("falls back to the canonical path when the ux_rules artifact is absent", () => {
    const findings = designTokenFindings([LIVE_SCREEN()]);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.file).toBe("03-design/ux-rules.md");
  });

  it("is suppressed by an open question citing the qualified section reference", () => {
    const artifacts = [
      LIVE_SCREEN(),
      artifact({ id: "UX-RULES", artifact_type: "ux_rules", status: "active", body: TOKENLESS_UX_BODY }),
      artifact({ id: "QUESTIONS", artifact_type: "question_ledger", status: "active", body: ledgerBody("open") })
    ];
    expect(designTokensDeferred(artifacts)).toBe(true);
    expect(designTokenFindings(artifacts)).toEqual([]);
  });

  it("stops being suppressed once the deferring question resolves", () => {
    const artifacts = [
      LIVE_SCREEN(),
      artifact({ id: "UX-RULES", artifact_type: "ux_rules", status: "active", body: TOKENLESS_UX_BODY }),
      artifact({ id: "QUESTIONS", artifact_type: "question_ledger", status: "active", body: ledgerBody("resolved") })
    ];
    expect(designTokensDeferred(artifacts)).toBe(false);
    expect(designTokenFindings(artifacts)).toHaveLength(1);
  });

  it("ignores a question that mentions design only in passing, without the qualified form", () => {
    const artifacts = [
      LIVE_SCREEN(),
      artifact({ id: "UX-RULES", artifact_type: "ux_rules", status: "active", body: TOKENLESS_UX_BODY }),
      artifact({
        id: "QUESTIONS",
        artifact_type: "question_ledger",
        status: "active",
        body: ledgerBody("open").replace("UX-RULES#design-tokens", "the visual design generally")
      })
    ];
    expect(designTokenFindings(artifacts)).toHaveLength(1);
  });
});

describe("design token commitment inside a repository", () => {
  it("stands as a warning on a live screen, never blocks the baseline, and clears on a committed row", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Add approval decisions");
    await addApprovalFeature(root);
    await refreshProject(root, false);
    const report = await validateProject(root, await scanArtifacts(root));
    const warning = report.findings.find((finding) => finding.code === "DESIGN_TOKENS_UNCOMMITTED");
    expect(warning?.severity).toBe("warning");
    expect(warning?.file).toBe("03-design/ux-rules.md");
    expect(report.valid).toBe(true);
    await createBaseline(root);
    await closeFlow(root);
    // Committing the tokens is the repair; the warning is not re-reported.
    const uxRulesFile = path.join(root, "03-design", "ux-rules.md");
    const uxRules = (await readFile(uxRulesFile, "utf8")).replace(/\r\n/g, "\n");
    await writeFile(uxRulesFile, uxRules.replace(
      "| Token | Value | Applies to | Accessibility note |\n|---|---|---|---|",
      "| Token | Value | Applies to | Accessibility note |\n|---|---|---|---|\n| DT-01 | #1A365D | primary text on background | adjusted for 4.5:1 on surface |"
    ), "utf8");
    await refreshProject(root, false);
    const repaired = await validateProject(root, await scanArtifacts(root));
    expect(repaired.findings.filter((finding) => finding.code === "DESIGN_TOKENS_UNCOMMITTED")).toEqual([]);
  });
});
