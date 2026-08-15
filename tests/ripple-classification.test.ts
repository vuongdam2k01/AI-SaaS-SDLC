import { afterEach, describe, expect, it } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { artifact, cleanup, establishGenesis, tempProject } from "./helpers.js";
import { buildGraph } from "../src/core/graph.js";
import { classifyImpact, unclassifiedImpactEntries } from "../src/core/ripple-classification.js";
import { isChangeRecord } from "../src/core/record-validation.js";
import { scanArtifacts } from "../src/core/artifacts.js";
import { validateProject } from "../src/core/validation.js";
import { createBaseline } from "../src/core/baseline.js";
import { closeFlow, startFlow } from "../src/core/state.js";
import { loadChange, projectSnapshot, refreshProject } from "../src/core/project.js";
import { addApprovalFeature, addSharedQueueFeature } from "./fixtures/complete-saas/fixture.js";
import type { BaselineManifest, ChangeRecord } from "../src/core/types.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

function manifest(entries: Array<{ id: string; hash: string; depends_on?: string[] }>): BaselineManifest {
  return {
    schema_version: 1,
    id: "BL-001",
    evidence_revision: "EVR-001",
    created_at: "2026-01-01T00:00:00.000Z",
    git_commit: null,
    flow_type: "evolution",
    flow_id: "FLOW-001",
    artifacts: entries.map((entry) => ({
      id: entry.id, title: entry.id, file: `${entry.id}.md`, hash: entry.hash, status: "active",
      artifact_type: "feature", created_by_change: "CHG-001",
      depends_on: entry.depends_on ?? [], decisions: [], supersedes: null, writes_to: [], implementation: []
    })),
    executions: [],
    verification: { unit: "not-configured", integration: "not-configured", system: "not-configured" }
  };
}

function change(overrides: Partial<ChangeRecord> & Pick<ChangeRecord, "id">): ChangeRecord {
  return {
    schema_version: 1,
    id: overrides.id,
    flow_id: overrides.flow_id ?? "FLOW-002",
    type: overrides.type ?? "evolution",
    input: overrides.input ?? "intent",
    status: overrides.status ?? "active",
    base_baseline: overrides.base_baseline ?? "BL-001",
    started_at: overrides.started_at ?? "2026-01-02T00:00:00.000Z",
    ...(overrides.closed_at ? { closed_at: overrides.closed_at } : {}),
    ...(overrides.successor_baseline ? { successor_baseline: overrides.successor_baseline } : {}),
    ...(overrides.impact ? { impact: overrides.impact } : {}),
    ...(overrides.classification ? { classification: overrides.classification } : {})
  };
}

describe("ripple classification ledger", () => {
  it("reports an affected artifact the open change has not decided about, and stops once it has", () => {
    // ENT moved; API depends on it and did not. That is the ripple: reached by
    // the closure, untouched by the author.
    const artifacts = [
      artifact({ id: "ENT-SHARED-001", artifact_type: "entity", hash: "moved" }),
      artifact({ id: "API-A-001", artifact_type: "api_processing", depends_on: ["ENT-SHARED-001"], hash: "same" })
    ];
    const baseline = manifest([{ id: "ENT-SHARED-001", hash: "original" }, { id: "API-A-001", hash: "same", depends_on: ["ENT-SHARED-001"] }]);
    const open = change({ id: "CHG-002" });

    const entries = unclassifiedImpactEntries(artifacts, buildGraph(artifacts), baseline, open, [open]);
    expect(entries.map((entry) => entry.id)).toEqual(["API-A-001"]);
    expect(entries[0]).toMatchObject({ changeId: "CHG-002", phase: "open", file: "API-A-001.md" });

    const decided = change({ id: "CHG-002", classification: { "API-A-001": { label: "verify-only" } } });
    expect(unclassifiedImpactEntries(artifacts, buildGraph(artifacts), baseline, decided, [decided])).toEqual([]);
  });

  it("never asks about a direct change: editing the artifact is the modify decision", () => {
    const artifacts = [
      artifact({ id: "ENT-SHARED-001", artifact_type: "entity", hash: "moved" }),
      artifact({ id: "API-A-001", artifact_type: "api_processing", depends_on: ["ENT-SHARED-001"], hash: "also-moved" })
    ];
    const baseline = manifest([{ id: "ENT-SHARED-001", hash: "original" }, { id: "API-A-001", hash: "original-api", depends_on: ["ENT-SHARED-001"] }]);
    const open = change({ id: "CHG-002" });
    expect(unclassifiedImpactEntries(artifacts, buildGraph(artifacts), baseline, open, [open])).toEqual([]);
  });

  it("keeps an unanswered reach standing after the baseline, and clears it when the artifact moves", () => {
    const artifacts = [
      artifact({ id: "ENT-SHARED-001", artifact_type: "entity", hash: "moved" }),
      artifact({ id: "API-A-001", artifact_type: "api_processing", depends_on: ["ENT-SHARED-001"], hash: "same" })
    ];
    const baseline = manifest([{ id: "ENT-SHARED-001", hash: "moved" }, { id: "API-A-001", hash: "same", depends_on: ["ENT-SHARED-001"] }]);
    const closed = change({
      id: "CHG-002", status: "closed", closed_at: "2026-01-03T00:00:00.000Z", successor_baseline: "BL-001",
      impact: { direct: ["ENT-SHARED-001"], affected: ["API-A-001", "ENT-SHARED-001"], stale: ["API-A-001"], ripple: ["API-A-001"] },
      classification: {}
    });

    const standing = unclassifiedImpactEntries(artifacts, buildGraph(artifacts), baseline, null, [closed]);
    expect(standing.map((entry) => entry.id)).toEqual(["API-A-001"]);
    expect(standing[0]).toMatchObject({ phase: "standing", changeId: "CHG-002", baselineId: "BL-001" });

    // Touched since: whatever moved it is the answer.
    const touched = [artifacts[0]!, artifact({ id: "API-A-001", artifact_type: "api_processing", depends_on: ["ENT-SHARED-001"], hash: "revised" })];
    expect(unclassifiedImpactEntries(touched, buildGraph(touched), baseline, null, [closed])).toEqual([]);
  });

  it("lets a later change answer an earlier change's debt, but never an earlier one the later debt", () => {
    const artifacts = [
      artifact({ id: "ENT-SHARED-001", artifact_type: "entity", hash: "moved" }),
      artifact({ id: "API-A-001", artifact_type: "api_processing", depends_on: ["ENT-SHARED-001"], hash: "same" })
    ];
    const baseline = manifest([{ id: "ENT-SHARED-001", hash: "moved" }, { id: "API-A-001", hash: "same", depends_on: ["ENT-SHARED-001"] }]);
    const owner = change({
      id: "CHG-002", status: "closed", closed_at: "2026-01-03T00:00:00.000Z", successor_baseline: "BL-001",
      impact: { direct: ["ENT-SHARED-001"], affected: ["API-A-001", "ENT-SHARED-001"], stale: ["API-A-001"], ripple: ["API-A-001"] },
      classification: {}
    });
    const later = change({ id: "CHG-003", classification: { "API-A-001": { label: "not-affected", reason: "The queue field is write-only for this caller." } } });
    expect(unclassifiedImpactEntries(artifacts, buildGraph(artifacts), baseline, null, [owner, later])).toEqual([]);

    const earlier = change({ id: "CHG-001", classification: { "API-A-001": { label: "verify-only" } } });
    expect(unclassifiedImpactEntries(artifacts, buildGraph(artifacts), baseline, null, [earlier, owner]).map((entry) => entry.id)).toEqual(["API-A-001"]);
  });

  it("observes nothing for a change record written before the ledger existed", () => {
    const artifacts = [
      artifact({ id: "ENT-SHARED-001", artifact_type: "entity", hash: "moved" }),
      artifact({ id: "API-A-001", artifact_type: "api_processing", depends_on: ["ENT-SHARED-001"], hash: "same" })
    ];
    const baseline = manifest([{ id: "ENT-SHARED-001", hash: "moved" }, { id: "API-A-001", hash: "same", depends_on: ["ENT-SHARED-001"] }]);
    const legacy = change({
      id: "CHG-002", status: "closed", closed_at: "2026-01-03T00:00:00.000Z", successor_baseline: "BL-001",
      impact: { direct: ["ENT-SHARED-001"], affected: ["API-A-001", "ENT-SHARED-001"], stale: ["API-A-001"] }
    });
    expect(legacy.classification).toBeUndefined();
    expect(unclassifiedImpactEntries(artifacts, buildGraph(artifacts), baseline, null, [legacy])).toEqual([]);
  });
});

describe("change record classification schema", () => {
  it("accepts a ledger at every status and rejects a not-affected decision with no reason", () => {
    for (const status of ["active", "baselined", "closed", "cancelled"] as const) {
      const base = status === "active" ? {}
        : status === "cancelled" ? { closed_at: "2026-01-03T00:00:00.000Z" }
          : {
            ...(status === "closed" ? { closed_at: "2026-01-03T00:00:00.000Z" } : {}),
            successor_baseline: "BL-001",
            impact: { direct: ["ENT-SHARED-001"], affected: ["API-A-001"], stale: ["API-A-001"], ripple: ["API-A-001"] }
          };
      expect(isChangeRecord({ ...change({ id: "CHG-002", status, ...base }), classification: { "API-A-001": { label: "modify" } } })).toBe(true);
    }
    expect(isChangeRecord({ ...change({ id: "CHG-002" }), classification: { "API-A-001": { label: "not-affected" } } })).toBe(false);
    expect(isChangeRecord({ ...change({ id: "CHG-002" }), classification: { "API-A-001": { label: "not-affected", reason: "Inspected; the field is unread here." } } })).toBe(true);
    expect(isChangeRecord({ ...change({ id: "CHG-002" }), classification: { "API-A-001": { label: "invented" } } })).toBe(false);
    expect(isChangeRecord({ ...change({ id: "CHG-002" }), classification: { "API-A-001": { label: "modify", extra: 1 } } })).toBe(false);
    expect(isChangeRecord({ ...change({ id: "CHG-002" }), classification: { "not an id": { label: "modify" } } })).toBe(false);
  });
});

describe("classification through a real evolution", () => {
  it("reports the ripple, records decisions, stamps them into the baseline and keeps the remainder standing", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Add approval request behavior");
    await addApprovalFeature(root);
    await createBaseline(root);
    await closeFlow(root);

    const codes = async () => (await validateProject(root, await scanArtifacts(root))).findings.filter((finding) => finding.code === "IMPACT_UNCLASSIFIED");
    // A purely additive first feature reaches nothing it did not also write.
    expect(await codes()).toEqual([]);

    await startFlow(root, "evolution", "Add decisions from the shared review queue");
    const sharedEntity = path.join(root, "03-design", "data", "ENT-APPROVAL-001.md");
    await writeFile(sharedEntity, (await readFile(sharedEntity, "utf8")).replace(
      "version and one-decision constraint", "version, queue visibility, and one-decision constraint"
    ), "utf8");
    await addSharedQueueFeature(root);
    await refreshProject(root, false);

    const impact = (await projectSnapshot(root)).impact;
    expect(impact.ripple.length).toBeGreaterThan(0);
    const open = await codes();
    expect(open.map((finding) => finding.message.split(" ")[0]).sort()).toEqual([...impact.ripple].sort());
    expect(open[0]!.severity).toBe("warning");
    expect(open.find((finding) => finding.message.startsWith("FTR-APPROVAL-001"))?.message)
      .toContain("is reached by CHG-002's affected closure but carries no recorded ripple decision");

    // The entity nobody edited is in question purely because a second feature
    // now writes it — the convergence the closure exists to catch.
    expect(impact.ripple).toContain("ENT-APPROVAL-001");
    expect(impact.ripple).toContain("FTR-APPROVAL-001");
    // A direct change is the modify decision and is not classifiable.
    await expect(classifyImpact(root, "FTR-QUEUE-001", "verify-only")).rejects.toThrow(/counts as modify by definition/);
    await expect(classifyImpact(root, "FTR-APPROVAL-001", "not-affected")).rejects.toThrow(/requires --reason/);
    await expect(classifyImpact(root, "FTR-APPROVAL-001", "revisit")).rejects.toThrow(/Unsupported classification/);

    for (const id of impact.ripple) await classifyImpact(root, id, "verify-only");
    expect(await codes()).toEqual([]);
    // The ledger rides the projection, so classifying leaves no generated drift.
    expect(await refreshProject(root, true)).toEqual([]);
    const projection = await readFile(path.join(root, "generated", "change-impact", "CHG-002.md"), "utf8");
    expect(projection).toContain("## Classification");
    expect(projection).toContain("modify (direct)");
    expect(projection).toContain("verify-only");

    const baseline = await createBaseline(root);
    await closeFlow(root);
    const stamped = await loadChange(root, "CHG-002");
    expect(Object.keys(stamped?.classification ?? {}).sort()).toEqual([...impact.ripple].sort());
    expect(stamped?.successor_baseline).toBe(baseline.id);
    expect(await codes()).toEqual([]);
  });

  it("keeps an unserviced reach standing after the flow closes, and clears it when the artifact is edited", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Add approval request behavior");
    await addApprovalFeature(root);
    await createBaseline(root);
    await closeFlow(root);

    await startFlow(root, "evolution", "Add decisions from the shared review queue");
    const sharedEntity = path.join(root, "03-design", "data", "ENT-APPROVAL-001.md");
    await writeFile(sharedEntity, (await readFile(sharedEntity, "utf8")).replace(
      "version and one-decision constraint", "version, queue visibility, and one-decision constraint"
    ), "utf8");
    await addSharedQueueFeature(root);
    const unanswered = (await projectSnapshot(root)).impact.ripple;
    expect(unanswered).toContain("FTR-APPROVAL-001");
    await createBaseline(root);
    await closeFlow(root);

    const codes = async () => (await validateProject(root, await scanArtifacts(root))).findings.filter((finding) => finding.code === "IMPACT_UNCLASSIFIED");
    const standing = await codes();
    expect(standing.map((finding) => finding.message.split(" ")[0]).sort()).toEqual([...unanswered].sort());
    expect(standing.find((finding) => finding.message.startsWith("FTR-APPROVAL-001"))?.message)
      .toContain("was never classified, and its content has not moved since");
    // Debt is not a gate: the baseline that left it was legal.
    expect((await validateProject(root, await scanArtifacts(root))).valid).toBe(true);

    const feature = path.join(root, "02-product", "features", "FTR-APPROVAL-001.md");
    await writeFile(feature, `${await readFile(feature, "utf8")}\nQueue visibility is inherited from the shared entity.\n`, "utf8");
    expect((await codes()).map((finding) => finding.message.split(" ")[0])).not.toContain("FTR-APPROVAL-001");
  });
});
