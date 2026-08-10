import { FLOW_STAGES, stageIndex } from "./types.js";
import type { FlowStage } from "./types.js";
import { loadActiveFlow, loadCurrentState } from "./state.js";

export interface FlowGuidance {
  active_flow: string | null;
  flow_type: string | null;
  target_stage: FlowStage | null;
  reached_stage: FlowStage | null;
  remaining_stages: FlowStage[];
  baseline_created: string | null;
  next_command: string;
  reason: string;
}

const SKILL_FOR_FLOW: Record<string, string> = {
  genesis: "/ai-saas-sdlc:genesis",
  reassessment: "/ai-saas-sdlc:reassess-evidence",
  evolution: "/ai-saas-sdlc:evolve-product",
  reconciliation: "/ai-saas-sdlc:reconcile"
};

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
    return {
      active_flow: null, flow_type: null, target_stage: null, reached_stage: null,
      remaining_stages: [], baseline_created: null,
      next_command: "/ai-saas-sdlc:evolve-product <semantic intent>",
      reason: `No flow is open. ${state.active_baseline} is closed; the next change starts a new flow.`
    };
  }

  const skill = SKILL_FOR_FLOW[flow.type] ?? "/ai-saas-sdlc:inspect-state";
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
