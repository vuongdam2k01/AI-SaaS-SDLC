import { FLOW_STAGES, stageIndex } from "./types.js";
import type { FlowStage } from "./types.js";
import { loadActiveFlow, loadCurrentState } from "./state.js";
import { loadConfig } from "./config.js";
import { scanArtifacts } from "./artifacts.js";
import { buildGraph } from "./graph.js";
import { activeFeatures, featureImplementationState, unprovenLevels } from "./implementation-evidence.js";
import { driftedMappings } from "./mapping-hashes.js";
import { loadBaseline } from "./project.js";

export interface SegmentSuggestion {
  feature: string;
  segment: string;
  reason: string;
}

export interface FlowGuidance {
  active_flow: string | null;
  flow_type: string | null;
  target_stage: FlowStage | null;
  reached_stage: FlowStage | null;
  remaining_stages: FlowStage[];
  baseline_created: string | null;
  next_command: string;
  reason: string;
  /** Present only when sources are configured and implementation debt exists. */
  suggested_segment?: SegmentSuggestion;
}

const SKILL_FOR_FLOW: Record<string, string> = {
  genesis: "/ai-saas-sdlc:genesis",
  reassessment: "/ai-saas-sdlc:reassess-evidence",
  evolution: "/ai-saas-sdlc:evolve-product",
  reconciliation: "/ai-saas-sdlc:reconcile"
};

/**
 * Which feature most deserves the next implementation segment, by explicit
 * weights rather than model judgement: an unmapped design artifact outweighs
 * an unproven level, and UT outweighs IT/ST because everything downstream
 * leans on it. Information only — the hint never changes next_command and a
 * repository without sources or without debt produces none.
 */
async function suggestSegment(root: string): Promise<SegmentSuggestion | undefined> {
  try {
    const config = await loadConfig(root);
    if (config.implementation_sources.length === 0) return undefined;
    const artifacts = await scanArtifacts(root);
    const graph = buildGraph(artifacts);
    const baseline = await loadBaseline(root).catch(() => null);
    const drifted = new Set((await driftedMappings(root, config, artifacts, baseline)).map((entry) => entry.mapping));
    const WEIGHTS: Record<string, number> = { UT: 3, IT: 2, ST: 2 };
    let best: { score: number; suggestion: SegmentSuggestion } | undefined;
    for (const feature of activeFeatures(artifacts)) {
      const state = featureImplementationState(feature, artifacts, graph);
      const unmappedDesign = state.mappable.length - state.mapped.length;
      const unproven = unprovenLevels(state);
      const ownDrifted = [...state.mapped, ...state.levels.flatMap(({ mapped }) => mapped)]
        .flatMap((artifact) => artifact.implementation)
        .filter((mapping) => drifted.has(mapping)).length;
      const score = unmappedDesign * 4 + ownDrifted * 5 + unproven.reduce((sum, { level }) => sum + (WEIGHTS[level] ?? 0), 0);
      if (score === 0) continue;
      const segment = !state.anyOwnMapped || unmappedDesign > 0 ? "code" : (unproven[0]?.level.toLowerCase() ?? "code");
      const parts = [
        unmappedDesign > 0 ? `${unmappedDesign} of ${state.mappable.length} design artifact(s) unmapped` : null,
        ownDrifted > 0 ? `${ownDrifted} mapping(s) drifted since ${baseline?.id ?? "baseline"}` : null,
        unproven.length > 0 ? `${unproven.map(({ level }) => level).join(", ")} ${unmappedDesign > 0 ? "unproven" : "specified but unproven"}` : null
      ].filter((value): value is string => value !== null);
      const suggestion: SegmentSuggestion = { feature: feature.id, segment, reason: parts.join("; ") };
      if (!best || score > best.score) best = { score, suggestion };
    }
    return best?.suggestion;
  } catch {
    // The hint is advisory; a broken config or unreadable tree must not make
    // flow next fail — validate owns reporting those.
    return undefined;
  }
}

/**
 * What the author should type next.
 *
 * A flow that stops at a checkpoint leaves the author holding a repository in a
 * deliberately incomplete state. Making them derive the next move from the
 * artifact tree is the difference between a tool that is controllable and one
 * that merely runs; this answers it in one read-only call.
 */
export async function flowGuidance(root: string): Promise<FlowGuidance> {
  const flow = await loadActiveFlow(root);
  const state = await loadCurrentState(root).catch(() => null);

  if (!flow) {
    if (!state || !state.active_baseline) {
      return {
        active_flow: null, flow_type: null, target_stage: null, reached_stage: null,
        remaining_stages: [], baseline_created: null,
        next_command: "/ai-saas-sdlc:genesis <raw product idea>",
        reason: "No baseline exists. Genesis establishes the first one."
      };
    }
    const suggestion = await suggestSegment(root);
    return {
      active_flow: null, flow_type: null, target_stage: null, reached_stage: null,
      remaining_stages: [], baseline_created: null,
      next_command: "/ai-saas-sdlc:evolve-product <semantic intent>",
      reason: `No flow is open. ${state.active_baseline} is closed; the next change starts a new flow.`,
      ...(suggestion ? { suggested_segment: suggestion } : {})
    };
  }

  const skill = flow.type === "evolution" && flow.intent === "implementation"
    ? "/ai-saas-sdlc:implement"
    : SKILL_FOR_FLOW[flow.type] ?? "/ai-saas-sdlc:inspect-state";
  const reached = flow.reached_stage ?? null;
  const target = flow.target_stage ?? null;
  const remaining = reached
    ? FLOW_STAGES.filter((stage) => stageIndex(stage) > stageIndex(reached))
    : [...FLOW_STAGES];

  if (flow.baseline_created) {
    return {
      active_flow: flow.id, flow_type: flow.type, target_stage: target, reached_stage: reached,
      remaining_stages: [], baseline_created: flow.baseline_created,
      next_command: `ENGINE flow close`,
      reason: `${flow.baseline_created} exists and no drift remains, so ${flow.id} is ready to close.`
    };
  }

  if (remaining.length === 0) {
    return {
      active_flow: flow.id, flow_type: flow.type, target_stage: target, reached_stage: reached,
      remaining_stages: [], baseline_created: null,
      next_command: `ENGINE baseline create`,
      reason: `${flow.id} has reached every checkpoint; a verified baseline closes it.`
    };
  }

  const next = remaining[0]!;
  const stoppedShort = target !== null && reached !== null && stageIndex(reached) >= stageIndex(target);
  return {
    active_flow: flow.id, flow_type: flow.type, target_stage: target, reached_stage: reached,
    remaining_stages: remaining, baseline_created: null,
    next_command: `${skill} --until ${next} continue ${flow.id}`,
    reason: stoppedShort
      ? `${flow.id} stopped at its requested checkpoint '${reached}' and is still open. Review what exists, then continue.`
      : `${flow.id} is open and has not yet reached '${next}'.`
  };
}
