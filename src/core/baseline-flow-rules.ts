import type { ActiveFlow, Artifact, BaselineManifest, FlowType, RetrievalRecord } from "./types.js";
import type { ImpactReport } from "./impact.js";
import { SdlcError } from "./errors.js";

const genesisFoundations = ["idea_definition", "evidence_ledger", "market_landscape", "customer_and_problem", "competitive_and_commercial", "feasibility_and_risk", "opportunity_definition", "product_requirements", "access_control", "quality_requirements", "system_invariants"];
const scalableTypes = new Set(["feature", "use_case", "business_flow", "screen", "component", "subsystem", "api_processing", "entity", "external_integration", "job", "event", "platform_target", "unit_test_backend", "unit_test_frontend", "unit_test_job", "integration_test", "system_test", "test_result", "issue", "architectural_decision"]);
const reassessmentTypes = new Set(["evidence_ledger", "idea_definition", "market_landscape", "customer_and_problem", "competitive_and_commercial", "feasibility_and_risk", "opportunity_definition", "ideal_customer_profile", "persona", "problem", "competitor", "question_ledger", "issue"]);
const genesisCreatable = new Set(["ideal_customer_profile", "persona", "problem", "competitor"]);
const reassessmentCreatable = new Set([...genesisCreatable, "issue"]);
const semanticCreatable = new Set([...scalableTypes].filter((type) => !["ideal_customer_profile", "persona", "problem", "competitor", "test_result"].includes(type)));

export function assertFlowAllowsArtifactType(flowType: FlowType, artifactType: string): void {
  const allowed = flowType === "genesis" ? genesisCreatable : flowType === "reassessment" ? reassessmentCreatable : semanticCreatable;
  if (!allowed.has(artifactType)) throw new SdlcError(`${artifactType} cannot be created during ${flowType}.`);
}

export function enforceFlowArtifactBoundaries(flow: ActiveFlow, artifacts: Artifact[], previous: BaselineManifest | null, impact: ImpactReport, flowRetrievals: RetrievalRecord[] = []): void {
  const previousIds = new Set(previous?.artifacts.map((artifact) => artifact.id) ?? []);
  const currentById = new Map(artifacts.map((artifact) => [artifact.id, artifact.artifact_type]));
  const previousById = new Map(previous?.artifacts.map((artifact) => [artifact.id, artifact.artifact_type]) ?? []);
  const directTypes = new Map(impact.direct.map((id) => [id, currentById.get(id) ?? previousById.get(id) ?? "unknown"]));
  const created = artifacts.filter((artifact) => !previousIds.has(artifact.id) && artifact.id !== "SDLC-CONFIG" && !["openapi_contract", "physical_schema", "screen_transitions"].includes(artifact.artifact_type));
  const expectedCreator = flow.type === "genesis" ? new Set(["GENESIS", flow.id]) : new Set([flow.change_id ?? flow.id]);
  const wronglyAttributed = created.filter((artifact) => !expectedCreator.has(artifact.created_by_change));
  if (wronglyAttributed.length > 0) throw new SdlcError(`New artifacts must identify the active flow/change as created_by_change: ${wronglyAttributed.map((artifact) => artifact.id).join(", ")}`);

  if (flow.type === "genesis") {
    const incomplete = genesisFoundations.flatMap((type) => {
      const artifact = artifacts.find((candidate) => candidate.artifact_type === type);
      return !artifact || artifact.status !== "active" ? [artifact?.id ?? type] : [];
    });
    if (incomplete.length > 0) throw new SdlcError(`Genesis baseline requires active discovery and product foundations: ${incomplete.join(", ")}`);
    const ledger = artifacts.find((artifact) => artifact.artifact_type === "evidence_ledger");
    if (!ledger || !/^## EVD-[A-Z0-9-]+/m.test(ledger.body) || !/^- URL:\s*https?:\/\//m.test(ledger.body)) throw new SdlcError("Genesis baseline requires at least one attributable EVD entry with an inspected public URL.");
    // A flow that retrieved through configured research instruments must let
    // the ledger name that provenance at least once. With no retrievals the
    // rung-0 path above stands byte-for-byte unchanged.
    if (flowRetrievals.length > 0) {
      const cited = new Set([...ledger.body.matchAll(/^-\s*Retrieval:\s*(RET-[0-9]{3,})\b/gm)].map((match) => match[1]!));
      if (!flowRetrievals.some((record) => cited.has(record.id))) throw new SdlcError("Genesis retrieved pages through configured research instruments; at least one EVD entry must cite its RET-* retrieval record.");
    }
    const original = artifacts.find((artifact) => artifact.artifact_type === "original_idea");
    if (!original || /Not provided\. Invoke/.test(original.body)) throw new SdlcError("Genesis baseline requires the raw idea to be captured during initialization.");
    const premature = artifacts.filter((artifact) => scalableTypes.has(artifact.artifact_type) && !genesisCreatable.has(artifact.artifact_type));
    if (premature.length > 0) throw new SdlcError(`Genesis creates discovery and product foundations only. Move scalable behavior/design/test/control artifacts into Product Evolution: ${premature.map((item) => item.id).join(", ")}`);
  }
  if (flow.type === "reassessment") {
    if (![...directTypes.values()].includes("evidence_ledger")) throw new SdlcError("Evidence Reassessment must add or change attributable evidence.");
    const forbidden = [...directTypes].filter(([, type]) => !reassessmentTypes.has(type)).map(([id]) => id);
    if (forbidden.length > 0) throw new SdlcError(`Evidence Reassessment cannot mutate product, design, verification, or engine contracts: ${forbidden.join(", ")}. Open an issue and run Product Evolution instead.`);
  }
  const semantic = flow.type === "evolution" || flow.type === "reconciliation";
  if (semantic && [...directTypes.values()].includes("evidence_ledger")) throw new SdlcError("Evidence changes require Evidence Reassessment so EVR advances before product repair or evolution.");
  if (semantic && impact.direct.length === 0) throw new SdlcError(`${flow.type} cannot create a baseline without a semantic artifact change.`);
}
