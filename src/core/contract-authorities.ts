import path from "node:path";
import fg from "fast-glob";
import type { Artifact, ValidationFinding } from "./types.js";
import { isLiveStatus } from "./types.js";
import { toPosix } from "./utils.js";

/**
 * The three fixed design-contract families. Each family has one mandatory
 * canonical file with its historical graph identity, and any number of sibling
 * files discovered as first-class contracts of the same artifact type: hashed,
 * graphed and baselined exactly like the canonical file. A sibling's identity
 * derives deterministically from its filename, so the same repository always
 * produces the same graph, and a name collision surfaces as ID_DUPLICATE
 * instead of a silent overwrite.
 */
export interface ContractKind {
  artifact_type: string;
  canonical_id: string;
  canonical_file: string;
  canonical_title: string;
  glob: string;
  location: RegExp;
  id_prefix: string;
  title_label: string;
  base_dependencies: readonly string[];
  instance_type: string;
  warning_code: string;
  file_noun: string;
  remedy: string;
}

export const CONTRACT_KINDS: readonly ContractKind[] = [
  {
    artifact_type: "openapi_contract",
    canonical_id: "OPENAPI-CONTRACT",
    canonical_file: "03-design/interfaces/openapi.yaml",
    canonical_title: "OpenAPI Contract",
    glob: "03-design/interfaces/*.{yaml,yml}",
    location: /^03-design\/interfaces\/[^/]+\.(?:yaml|yml)$/,
    id_prefix: "WIRE-",
    title_label: "Interface contract",
    base_dependencies: ["ARCHITECTURE-OVERVIEW", "ERROR-CATALOG"],
    instance_type: "api_processing",
    warning_code: "WIRE_AUTHORITY_UNDECLARED",
    file_noun: "interface files",
    remedy: "declare the owning interface file, or leave an IPC/CLI-only operation undeclared — this warning is the standing record of that state."
  },
  {
    artifact_type: "physical_schema",
    canonical_id: "PHYSICAL-SCHEMA",
    canonical_file: "03-design/data/schema.dbml",
    canonical_title: "Physical Schema",
    glob: "03-design/data/*.dbml",
    location: /^03-design\/data\/[^/]+\.dbml$/,
    id_prefix: "SCHEMA-",
    title_label: "Physical schema",
    base_dependencies: ["ARCHITECTURE-OVERVIEW", "SYSTEM-INVARIANTS"],
    instance_type: "entity",
    warning_code: "SCHEMA_AUTHORITY_UNDECLARED",
    file_noun: "schema files",
    remedy: "declare the owning schema file, or leave a client-local or non-relational entity undeclared with its store named in the entity's persistence declaration."
  },
  {
    artifact_type: "screen_transitions",
    canonical_id: "SCREEN-TRANSITIONS",
    canonical_file: "03-design/screen-transitions.mmd",
    canonical_title: "Screen Transitions",
    glob: "03-design/*.mmd",
    location: /^03-design\/[^/]+\.mmd$/,
    id_prefix: "TRANSITIONS-",
    title_label: "Screen transitions",
    base_dependencies: ["UX-RULES"],
    instance_type: "screen",
    warning_code: "TRANSITION_AUTHORITY_UNDECLARED",
    file_noun: "transition graphs",
    remedy: "declare the graph that owns this screen's transitions, or leave a screen outside every graph undeclared."
  }
];

export const CONTRACT_ARTIFACT_TYPES: ReadonlySet<string> = new Set(CONTRACT_KINDS.map((kind) => kind.artifact_type));

/** WIRE-BILLING from 03-design/interfaces/billing.yaml, and so on per family. */
export function deriveContractId(kind: ContractKind, relativeFile: string): string {
  const stem = path.posix.basename(toPosix(relativeFile)).replace(/\.[^.]*$/, "");
  const slug = stem.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${kind.id_prefix}${slug}`;
}

/** Sibling contract files per family, canonical excluded, deterministically ordered. */
export async function discoverContractFiles(root: string): Promise<Map<string, string[]>> {
  const discovered = new Map<string, string[]>();
  for (const kind of CONTRACT_KINDS) {
    const files = await fg(kind.glob, { cwd: root, onlyFiles: true, dot: false, followSymbolicLinks: false });
    const siblings = files.map(toPosix).filter((file) => file !== kind.canonical_file).sort((a, b) => a.localeCompare(b));
    discovered.set(kind.artifact_type, siblings);
  }
  return discovered;
}

/** The only ID a fixed-contract artifact at this path may carry, or null when the path is not a legal home for the type. */
export function expectedContractIdentity(artifactType: string, file: string): string | null {
  if (artifactType === "engine_configuration") return file === "sdlc.config.yaml" ? "SDLC-CONFIG" : null;
  const kind = CONTRACT_KINDS.find((candidate) => candidate.artifact_type === artifactType);
  if (!kind) return null;
  if (file === kind.canonical_file) return kind.canonical_id;
  if (kind.location.test(file)) return deriveContractId(kind, file);
  return null;
}

/**
 * When a family holds sibling files, ownership is an author-declared fact: each
 * live instance names its authority file in depends_on. An instance that names
 * none may be legitimate forever — an IPC-only operation, a client-local entity,
 * a screen outside every graph — so the gap is a standing warning rather than
 * an error, the same doctrine as platform evidence. With a single file per
 * family the engine derives ownership itself and no finding exists.
 */
export function contractAuthorityFindings(artifacts: Artifact[]): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  for (const kind of CONTRACT_KINDS) {
    const nodes = artifacts.filter((artifact) => artifact.artifact_type === kind.artifact_type);
    if (nodes.length < 2) continue;
    const nodeIds = new Set(nodes.map((node) => node.id));
    for (const instance of artifacts) {
      if (instance.artifact_type !== kind.instance_type || !isLiveStatus(instance.status)) continue;
      if (instance.depends_on.some((reference) => nodeIds.has(reference))) continue;
      findings.push({
        severity: "warning",
        code: kind.warning_code,
        message: `${instance.id} is live while ${nodes.length} ${kind.file_noun} exist and none appears in its depends_on; ${kind.remedy}`,
        file: instance.file
      });
    }
  }
  return findings;
}
