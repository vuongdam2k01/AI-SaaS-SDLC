import { afterEach, describe, expect, it } from "vitest";
import { cleanup, establishGenesis, tempProject } from "./helpers.js";
import { checkpointFlow, loadActiveFlow, startFlow } from "../src/core/state.js";
import { flowGuidance } from "../src/core/flow-guidance.js";
import { isActiveFlow } from "../src/core/record-validation.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

describe("author-controlled flow checkpoints", () => {
  it("records where a turn should stop and how far it came", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);

    const started = await startFlow(root, "evolution", "Add approval behavior", "design");
    expect(started.target_stage).toBe("design");
    expect(started.reached_stage).toBeUndefined();
    expect(isActiveFlow(started)).toBe(true);

    const afterBehavior = await checkpointFlow(root, "behavior");
    expect(afterBehavior.reached_stage).toBe("behavior");
    expect(afterBehavior.target_stage).toBe("design");

    const afterDesign = await checkpointFlow(root, "design");
    expect(afterDesign.reached_stage).toBe("design");

    // Persisted, so a later session sees the same progress.
    const reloaded = await loadActiveFlow(root);
    expect(reloaded?.reached_stage).toBe("design");
    expect(isActiveFlow(reloaded)).toBe(true);
  });

  it("never moves a checkpoint backwards when a flow revisits earlier work", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Add approval behavior");

    await checkpointFlow(root, "tests");
    const back = await checkpointFlow(root, "behavior");
    expect(back.reached_stage).toBe("tests");
  });

  it("retargets an open flow so the author can extend or shorten a turn", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Add approval behavior", "design");

    const extended = await checkpointFlow(root, "design", "implementation");
    expect(extended.target_stage).toBe("implementation");
    expect(extended.reached_stage).toBe("design");
  });

  it("rejects a stage outside the checkpoint vocabulary", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await startFlow(root, "evolution", "Add approval behavior");

    await expect(checkpointFlow(root, "review")).rejects.toThrow("Unsupported flow stage");
    await expect(checkpointFlow(root, "design", "approval")).rejects.toThrow("Unsupported flow stage");
  });

  it("refuses a checkpoint when no flow is open", async () => {
    const root = await tempProject();
    roots.push(root);
    await establishGenesis(root);
    await expect(checkpointFlow(root, "design")).rejects.toThrow("No active flow exists");
  });

  it("names the exact command to run next at every point", async () => {
    const root = await tempProject();
    roots.push(root);

    const beforeGenesis = await flowGuidance(root);
    expect(beforeGenesis.next_command).toContain("/ai-saas-sdlc:genesis");

    await establishGenesis(root);
    const afterGenesis = await flowGuidance(root);
    expect(afterGenesis.active_flow).toBeNull();
    expect(afterGenesis.next_command).toContain("/ai-saas-sdlc:evolve-product");

    await startFlow(root, "evolution", "Add approval behavior", "design");
    await checkpointFlow(root, "design");
    const stopped = await flowGuidance(root);
    expect(stopped.reached_stage).toBe("design");
    expect(stopped.remaining_stages).toEqual(["tests", "implementation", "baseline"]);
    // The author is told what to type, not what category of action to consider.
    expect(stopped.next_command).toContain("--until tests");
    expect(stopped.reason).toContain("stopped at its requested checkpoint");
  });
});
