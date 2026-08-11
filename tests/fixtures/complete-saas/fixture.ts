import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createArtifactFromPattern } from "../../../src/core/artifact-instantiation.js";
import { resolveCatalog } from "../../../src/core/pattern-catalog.js";
import { ARCHITECTURE_OVERVIEW_ACTIVE_BODY, GENESIS_FOUNDATION_BODIES } from "./foundation-content.js";
import { APPROVAL_PRODUCT_BODIES } from "./approval-product-content.js";
import { APPROVAL_DESIGN_BODIES } from "./approval-design-content.js";
import { APPROVAL_VERIFICATION_BODIES } from "./approval-verification-content.js";
import { CONTROL_BODIES } from "./control-content.js";

export interface FixtureArtifact {
  type: string;
  id: string;
  title: string;
  dependsOn: string[];
  writesTo?: string[];
  adrStatus?: string;
  supersedes?: string;
}

export const APPROVAL_ARTIFACTS: FixtureArtifact[] = [
  { type: "feature", id: "FTR-APPROVAL-001", title: "Decide an approval request", dependsOn: ["PRODUCT-REQUIREMENTS", "ACCESS-CONTROL", "SYSTEM-INVARIANTS"], writesTo: ["ENT-APPROVAL-001"] },
  { type: "use_case", id: "UC-APPROVAL-001", title: "Decide a submitted request", dependsOn: ["FTR-APPROVAL-001", "ACCESS-CONTROL"] },
  { type: "business_flow", id: "FLOW-APPROVAL-001", title: "Request-to-decision flow", dependsOn: ["FTR-APPROVAL-001", "UC-APPROVAL-001", "SYSTEM-INVARIANTS"], writesTo: ["ENT-APPROVAL-001"] },
  { type: "screen", id: "SCR-APPROVAL-001", title: "Approval decision view", dependsOn: ["FTR-APPROVAL-001", "UC-APPROVAL-001", "UX-RULES", "ACCESS-CONTROL", "API-APPROVAL-001"] },
  { type: "api_processing", id: "API-APPROVAL-001", title: "Commit an approval decision", dependsOn: ["FTR-APPROVAL-001", "UC-APPROVAL-001", "ARCHITECTURE-OVERVIEW", "ACCESS-CONTROL", "ERROR-CATALOG", "ENT-APPROVAL-001"], writesTo: ["ENT-APPROVAL-001"] },
  { type: "entity", id: "ENT-APPROVAL-001", title: "Approval request", dependsOn: ["SYSTEM-INVARIANTS", "ARCHITECTURE-OVERVIEW"] },
  { type: "unit_test_backend", id: "UT-API-APPROVAL-001", title: "Approval decision unit contract", dependsOn: ["TEST-POLICY", "FTR-APPROVAL-001", "API-APPROVAL-001", "ENT-APPROVAL-001"] },
  { type: "integration_test", id: "IT-APPROVAL-001", title: "Approval API and store boundary", dependsOn: ["TEST-POLICY", "FTR-APPROVAL-001", "API-APPROVAL-001", "ENT-APPROVAL-001"] },
  { type: "system_test", id: "ST-APPROVAL-001", title: "Client decides a request", dependsOn: ["TEST-POLICY", "FTR-APPROVAL-001", "UC-APPROVAL-001", "FLOW-APPROVAL-001", "SCR-APPROVAL-001"] }
];

const CONTENT = { ...APPROVAL_PRODUCT_BODIES, ...APPROVAL_DESIGN_BODIES, ...APPROVAL_VERIFICATION_BODIES, ...CONTROL_BODIES };

// Every helper below normalizes before it indexes. Slicing an original CRLF
// string at an index found in a normalized copy is short by one byte per line,
// which is how a Windows checkout produced artifacts with truncated frontmatter.
function replaceBody(source: string, body: string): string {
  const normalized = source.replace(/\r\n/g, "\n");
  const marker = normalized.indexOf("\n---\n", 4);
  if (marker < 0) throw new Error("Fixture artifact is missing frontmatter.");
  return `${normalized.slice(0, marker + 5)}\n${body.trim()}\n`;
}

function list(values: string[]): string {
  return `[${values.join(", ")}]`;
}

function replaceField(source: string, field: string, value: string): string {
  const normalized = source.replace(/\r\n/g, "\n");
  const matcher = new RegExp(`^${field}:.*$`, "m");
  if (!matcher.test(normalized)) {
    const marker = normalized.indexOf("\n---\n", 4);
    if (marker < 0) throw new Error("Fixture artifact is missing frontmatter.");
    return `${normalized.slice(0, marker)}\n${field}: ${value}${normalized.slice(marker)}`;
  }
  return normalized.replace(matcher, `${field}: ${value}`);
}

function bodyFor(type: string, substitutions?: Record<string, string>): string {
  let body = CONTENT[type];
  if (!body) throw new Error(`No complete fixture body for ${type}.`);
  for (const [from, to] of Object.entries(substitutions ?? {})) body = body.replaceAll(from, to);
  return body;
}

export async function completeFoundationArtifacts(root: string): Promise<void> {
  for (const [relative, body] of Object.entries(GENESIS_FOUNDATION_BODIES)) {
    const file = path.join(root, relative);
    let source = await readFile(file, "utf8");
    source = replaceField(source, "status", "active");
    await writeFile(file, replaceBody(source, body), "utf8");
  }
}

export async function activateArchitectureOverview(root: string, body: string = ARCHITECTURE_OVERVIEW_ACTIVE_BODY): Promise<string> {
  const relative = "03-design/architecture-overview.md";
  const file = path.join(root, relative);
  let source = await readFile(file, "utf8");
  source = replaceField(source, "status", "active");
  await writeFile(file, replaceBody(source, body), "utf8");
  return relative;
}

export async function materializePatternArtifact(
  root: string,
  artifact: FixtureArtifact,
  substitutions?: Record<string, string>
): Promise<{ file: string; draft: string }> {
  const catalog = await resolveCatalog(root, process.cwd());
  const created = await createArtifactFromPattern(root, catalog, artifact.type, artifact.id, artifact.title);
  const file = path.join(root, created.file);
  const draft = await readFile(file, "utf8");
  // Issues carry their own lifecycle vocabulary (open -> resolved); every other
  // authored artifact type is materialized live as `active`.
  let completed = replaceField(draft, "status", artifact.type === "issue" ? "open" : "active");
  completed = replaceField(completed, "depends_on", list(artifact.dependsOn));
  if (artifact.writesTo) completed = replaceField(completed, "writes_to", list(artifact.writesTo));
  if (artifact.adrStatus) completed = replaceField(completed, "adr_status", artifact.adrStatus);
  if (artifact.supersedes) completed = replaceField(completed, "supersedes", artifact.supersedes);
  completed = replaceBody(completed, bodyFor(artifact.type, substitutions));
  await writeFile(file, completed, "utf8");
  return { file: created.file, draft };
}

export async function addApprovalFeature(root: string): Promise<void> {
  const byId = new Map(APPROVAL_ARTIFACTS.map((artifact) => [artifact.id, artifact]));
  for (const id of [
    "FTR-APPROVAL-001", "UC-APPROVAL-001", "ENT-APPROVAL-001", "API-APPROVAL-001",
    "FLOW-APPROVAL-001", "SCR-APPROVAL-001", "UT-API-APPROVAL-001", "IT-APPROVAL-001", "ST-APPROVAL-001"
  ]) await materializePatternArtifact(root, byId.get(id)!);
}

export async function addSharedQueueFeature(root: string): Promise<void> {
  const substitutions = {
    "FTR-APPROVAL-001": "FTR-QUEUE-001",
    "UC-APPROVAL-001": "UC-QUEUE-001",
    "FLOW-APPROVAL-001": "FLOW-QUEUE-001",
    "API-APPROVAL-001": "API-QUEUE-001",
    "UT-API-APPROVAL-001": "UT-API-QUEUE-001",
    "IT-APPROVAL-001": "IT-QUEUE-001",
    "ST-APPROVAL-001": "ST-QUEUE-001",
    "Decide an approval request": "Decide from the shared review queue",
    "ENT-QUEUE-001": "ENT-APPROVAL-001"
  };
  const artifacts: FixtureArtifact[] = [
    { type: "feature", id: "FTR-QUEUE-001", title: "Decide from the shared review queue", dependsOn: ["PRODUCT-REQUIREMENTS", "ACCESS-CONTROL", "SYSTEM-INVARIANTS"], writesTo: ["ENT-APPROVAL-001"] },
    { type: "use_case", id: "UC-QUEUE-001", title: "Decide a queued request", dependsOn: ["FTR-QUEUE-001", "ACCESS-CONTROL"] },
    { type: "business_flow", id: "FLOW-QUEUE-001", title: "Queue-to-decision flow", dependsOn: ["FTR-QUEUE-001", "UC-QUEUE-001", "SYSTEM-INVARIANTS"], writesTo: ["ENT-APPROVAL-001"] },
    { type: "api_processing", id: "API-QUEUE-001", title: "Commit a queued decision", dependsOn: ["FTR-QUEUE-001", "UC-QUEUE-001", "ARCHITECTURE-OVERVIEW", "ACCESS-CONTROL", "ERROR-CATALOG", "ENT-APPROVAL-001"], writesTo: ["ENT-APPROVAL-001"] },
    { type: "unit_test_backend", id: "UT-API-QUEUE-001", title: "Queue decision unit contract", dependsOn: ["TEST-POLICY", "FTR-QUEUE-001", "API-QUEUE-001", "ENT-APPROVAL-001"] },
    { type: "integration_test", id: "IT-QUEUE-001", title: "Queue API and store boundary", dependsOn: ["TEST-POLICY", "FTR-QUEUE-001", "API-QUEUE-001", "ENT-APPROVAL-001"] },
    { type: "system_test", id: "ST-QUEUE-001", title: "Client decides from the queue", dependsOn: ["TEST-POLICY", "FTR-QUEUE-001", "UC-QUEUE-001", "FLOW-QUEUE-001", "SCR-APPROVAL-001"] }
  ];
  for (const artifact of artifacts) await materializePatternArtifact(root, artifact, substitutions);
}
