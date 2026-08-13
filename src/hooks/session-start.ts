import { readHookInput, emit } from "./io.js";
import { loadActiveFlow, loadCurrentState, pathExists } from "../core/state.js";
import { projectPaths } from "../core/paths.js";
import { resolveResearchCapability } from "../core/research-capability.js";

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
    const summary = [
      "AI SaaS SDLC repository detected.",
      `Active product baseline: ${state.active_baseline ?? "none"}.`,
      `Evidence revision: EVR-${String(state.evidence_revision).padStart(3, "0")}.`,
      flow ? `Active flow: ${flow.type} (${flow.id}${flow.change_id ? `, ${flow.change_id}` : ""}).` : "No active semantic flow.",
      ...(research ? [research] : []),
      "Generated projections and execution-backed results must not be edited manually."
    ].join(" ");
    emit({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: summary.slice(0, 1200) } });
  } catch {
    // A broken project is reported by explicit validation, not session startup.
  }
}

