import type { Artifact, ExecutionRecord, ProjectConfig, ValidationFinding } from "./types.js";
import { isLiveStatus } from "./types.js";

/** The live platform targets — the single filter every platform view shares. */
export function livePlatformTargets(artifacts: Artifact[]): Artifact[] {
  return artifacts.filter((artifact) => artifact.artifact_type === "platform_target" && isLiveStatus(artifact.status));
}

/** Every platform ID any configured verification command declares evidence for. */
export function declaredPlatformIds(config: ProjectConfig | null): Set<string> {
  if (!config) return new Set();
  return new Set(
    (["unit", "integration", "system"] as const).flatMap((level) => config.verification[level].flatMap((command) => command.platforms ?? []))
  );
}

export interface PlatformContradiction {
  token: string;
  /** Records declaring the target that also report an observed host. */
  observedCount: number;
  /** Sorted distinct host.os values among those records. */
  observedHosts: string[];
}

/**
 * The single source of truth for "this declaration has never been observed on
 * its declared host". Both the PLATFORM_EVIDENCE_CONTRADICTED warning and the
 * platform-coverage projection derive from this function, so the table can
 * never disagree with the finding. A record without a host observes nothing
 * and cannot contradict; a single matching observation clears the target.
 */
export function platformContradiction(target: Artifact, records: ExecutionRecord[]): PlatformContradiction | null {
  const token = target.host_os;
  if (!token) return null;
  const observed = records.filter((record) => (record.platforms ?? []).includes(target.id) && record.host);
  if (observed.length === 0) return null;
  if (observed.some((record) => record.host?.os === token)) return null;
  const observedHosts = [...new Set(observed.map((record) => record.host?.os ?? ""))].sort();
  return { token, observedCount: observed.length, observedHosts };
}

/**
 * Cross-checks platform_target artifacts against the verification commands
 * that declare evidence for them. Declarations live in sdlc.config.yaml and
 * are human-owned truth, like implementation_sources; executions carry the
 * declaration and the observed host separately, so the check here is only
 * about the mapping. Once a command declares a platform, the existing
 * all-commands-before-baseline gate forces it to run.
 */
export function platformEvidenceFindings(config: ProjectConfig, artifacts: Artifact[]): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const declared = declaredPlatformIds(config);
  const liveTargets = livePlatformTargets(artifacts);
  for (const target of liveTargets) {
    if (declared.has(target.id)) continue;
    findings.push({
      severity: "warning",
      code: "PLATFORM_EVIDENCE_MISSING",
      message: `${target.id} is a live platform target no configured verification command declares evidence for; add platforms: [${target.id}] to a command that exercises it, or record the unproven platform in TEST-POLICY.`,
      file: target.file
    });
  }
  const liveTargetIds = new Set(liveTargets.map((target) => target.id));
  for (const declaration of [...declared].sort()) {
    if (liveTargetIds.has(declaration)) continue;
    findings.push({
      severity: "warning",
      code: "PLATFORM_DECLARATION_UNKNOWN",
      message: `Verification commands declare evidence for ${declaration}, which matches no live platform_target artifact.`,
      file: "sdlc.config.yaml"
    });
  }
  return findings;
}

/**
 * A target may declare the host token its evidence is expected to be observed
 * under (`host_os` frontmatter, a process.platform value). The token is a
 * human claim like the platforms declaration itself; the recorded host is the
 * machine fact. They are never merged — this check only reports the aggregate
 * state in which every observation contradicts the claim, which is why it
 * needs no config: records carry the declaration they were executed under.
 * Warning, never error: evidence for a target may legitimately be produced on
 * a different host (an iOS target exercised from a darwin machine declares
 * darwin, but a cross-compiled check may run elsewhere), and the standing
 * warning is the durable record of that judgement.
 */
export function platformContradictionFindings(artifacts: Artifact[], records: ExecutionRecord[]): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  for (const target of livePlatformTargets(artifacts)) {
    const contradiction = platformContradiction(target, records);
    if (!contradiction) continue;
    findings.push({
      severity: "warning",
      code: "PLATFORM_EVIDENCE_CONTRADICTED",
      message: `${target.id} declares host_os ${contradiction.token}, but all ${contradiction.observedCount} execution record(s) declaring it observed a different host os (${contradiction.observedHosts.join(", ")}); fix the token, execute a declaring command on a ${contradiction.token} host, or record the limitation in TEST-POLICY.`,
      file: target.file
    });
  }
  return findings;
}
