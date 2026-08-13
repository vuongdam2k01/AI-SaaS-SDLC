import { readHookInput, emit } from "./io.js";
import { loadActiveFlow, loadCurrentState, pathExists } from "../core/state.js";
import { projectPaths } from "../core/paths.js";
import { resolveResearchCapability } from "../core/research-capability.js";
import { implementationResumeCommand, suggestNextSegment } from "../core/flow-guidance.js";

await readHookInput();
const root = process.cwd();
if (await pathExists(projectPaths(root).current)) {
  try {
    const state = await loadCurrentState(root);
    const flow = await loadActiveFlow(root);
    // A malformed instrument URL must not silence the whole summary; the
    // engine's own commands report it with a real error message.
    let research = "";
    try {
      const capability = resolveResearchCapability();
      if (capability.rung > 0) {
        const instruments = [capability.searxng && "SearXNG", capability.firecrawl && "Firecrawl", capability.camofox && "Camofox"].filter(Boolean).join(", ");
        research = `Research instruments configured: rung ${capability.rung} (${instruments}).`;
      }
    } catch {
      research = "";
    }
    // The same suggestion flow next computes; surfacing it at session start
    // means an implement author sees the evidence-scored next segment before
    // asking. Fail-open: a broken config or tree silences only this line.
    let implementation = "";
    try {
      const suggestion = !flow ? await suggestNextSegment(root) : undefined;
      if (suggestion) implementation = `Implementation debt (${suggestion.feature}: ${suggestion.reason}); evidence-scored next segment: /ai-saas-sdlc:implement ${suggestion.feature} ${suggestion.segment}.`;
    } catch {
      implementation = "";
    }
    // A resumer's whole cold-start problem is knowing the exact command that
    // continues an open implementation flow; the line carries it verbatim.
    const resume = flow ? implementationResumeCommand(flow) : null;
    const summary = [
      "AI SaaS SDLC repository detected.",
      `Active product baseline: ${state.active_baseline ?? "none"}.`,
      `Evidence revision: EVR-${String(state.evidence_revision).padStart(3, "0")}.`,
      flow
        ? `Active flow: ${flow.type}${flow.intent ? ` (intent ${flow.intent})` : ""} (${flow.id}${flow.change_id ? `, ${flow.change_id}` : ""}); reached ${flow.reached_stage ?? "none"}, target ${flow.target_stage ?? "baseline"}.${resume ? ` Resume: ${resume}` : ""}`
        : "No active semantic flow.",
      ...(research ? [research] : []),
      ...(implementation ? [implementation] : []),
      "Generated projections and execution-backed results must not be edited manually."
    ].join(" ");
    emit({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: summary.slice(0, 1200) } });
  } catch {
    // A broken project is reported by explicit validation, not session startup.
  }
}

