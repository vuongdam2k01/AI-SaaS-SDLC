export const CANONICAL_MARKDOWN = {
  "01-discovery/original-idea.md": ["IDEA-ORIGINAL", "original_idea"],
  "01-discovery/idea-definition.md": ["IDEA-DEFINITION", "idea_definition"],
  "01-discovery/evidence-ledger.md": ["EVIDENCE-LEDGER", "evidence_ledger"],
  "01-discovery/market-landscape.md": ["MARKET-LANDSCAPE", "market_landscape"],
  "01-discovery/customer-and-problem.md": ["CUSTOMER-AND-PROBLEM", "customer_and_problem"],
  "01-discovery/competitive-and-commercial.md": ["COMPETITIVE-AND-COMMERCIAL", "competitive_and_commercial"],
  "01-discovery/feasibility-and-risk.md": ["FEASIBILITY-AND-RISK", "feasibility_and_risk"],
  "01-discovery/opportunity-definition.md": ["OPPORTUNITY-DEFINITION", "opportunity_definition"],
  "02-product/product-requirements.md": ["PRODUCT-REQUIREMENTS", "product_requirements"],
  "02-product/access-control.md": ["ACCESS-CONTROL", "access_control"],
  "02-product/quality-requirements.md": ["QUALITY-REQUIREMENTS", "quality_requirements"],
  "02-product/system-invariants.md": ["SYSTEM-INVARIANTS", "system_invariants"],
  "03-design/architecture-overview.md": ["ARCHITECTURE-OVERVIEW", "architecture_overview"],
  "03-design/ux-rules.md": ["UX-RULES", "ux_rules"],
  "03-design/error-catalog.md": ["ERROR-CATALOG", "error_catalog"],
  "04-verification/test-policy.md": ["TEST-POLICY", "test_policy"],
  "05-control/questions.md": ["QUESTIONS", "question_ledger"]
} as const;

export const SCALABLE_LOCATIONS: Record<string, RegExp> = {
  ideal_customer_profile: /^01-discovery\/customer-segments\/ICP-[A-Z0-9-]+\.md$/,
  persona: /^01-discovery\/customer-segments\/PERSONA-[A-Z0-9-]+\.md$/,
  problem: /^01-discovery\/customer-segments\/PROBLEM-[A-Z0-9-]+\.md$/,
  competitor: /^01-discovery\/competitors\/COMPETITOR-[A-Z0-9-]+\.md$/,
  feature: /^02-product\/features\/FTR-[A-Z0-9-]+\.md$/,
  use_case: /^02-product\/use-cases\/UC-[A-Z0-9-]+\.md$/,
  business_flow: /^02-product\/flows\/FLOW-[A-Z0-9-]+\.md$/,
  screen: /^03-design\/screens\/SCR-[A-Z0-9-]+\.md$/,
  component: /^03-design\/components\/CMP-[A-Z0-9-]+\.md$/,
  subsystem: /^03-design\/subsystems\/SUB-[A-Z0-9-]+\.md$/,
  api_processing: /^03-design\/interfaces\/API-[A-Z0-9-]+\.md$/,
  entity: /^03-design\/data\/ENT-[A-Z0-9-]+\.md$/,
  external_integration: /^03-design\/integrations\/INT-[A-Z0-9-]+\.md$/,
  job: /^03-design\/jobs\/JOB-[A-Z0-9-]+\.md$/,
  event: /^03-design\/events\/EVT-[A-Z0-9-]+\.md$/,
  platform_target: /^03-design\/platforms\/PLT-[A-Z0-9-]+\.md$/,
  unit_test_backend: /^04-verification\/unit-tests\/backend\/UT-(?:API|CORE)-[A-Z0-9-]+\.md$/,
  unit_test_frontend: /^04-verification\/unit-tests\/frontend\/UT-UI-[A-Z0-9-]+\.md$/,
  unit_test_job: /^04-verification\/unit-tests\/jobs\/UT-JOB-[A-Z0-9-]+\.md$/,
  integration_test: /^04-verification\/integration-tests\/IT-[A-Z0-9-]+\.md$/,
  system_test: /^04-verification\/system-tests\/ST-[A-Z0-9-]+\.md$/,
  test_result: /^04-verification\/results\/RESULT-EXEC-[0-9]{3,}\.md$/,
  issue: /^05-control\/issues\/ISS-[A-Z0-9-]+\.md$/,
  architectural_decision: /^05-control\/decisions\/ADR-[A-Z0-9-]+\.md$/
};

export const SCALABLE_EXAMPLE_IDS: Record<string, string> = {
  ideal_customer_profile: "ICP-SAMPLE", persona: "PERSONA-SAMPLE", problem: "PROBLEM-SAMPLE", competitor: "COMPETITOR-SAMPLE",
  feature: "FTR-SAMPLE-001", use_case: "UC-SAMPLE-001", business_flow: "FLOW-SAMPLE-001",
  screen: "SCR-SAMPLE-001", component: "CMP-SAMPLE-001", subsystem: "SUB-SAMPLE-001", api_processing: "API-SAMPLE-001",
  entity: "ENT-SAMPLE-001", external_integration: "INT-SAMPLE-001", job: "JOB-SAMPLE-001", event: "EVT-SAMPLE-001",
  platform_target: "PLT-SAMPLE-001",
  unit_test_backend: "UT-API-SAMPLE-001", unit_test_frontend: "UT-UI-SAMPLE-001", unit_test_job: "UT-JOB-SAMPLE-001",
  integration_test: "IT-SAMPLE-001", system_test: "ST-SAMPLE-001", test_result: "RESULT-EXEC-001",
  issue: "ISS-SAMPLE-001", architectural_decision: "ADR-SAMPLE-001"
};

export const FIXED_TYPES = new Set(["engine_configuration", "openapi_contract", "physical_schema", "screen_transitions"]);
export const CANONICAL_TYPES: Set<string> = new Set(Object.values(CANONICAL_MARKDOWN).map(([, type]) => type));
