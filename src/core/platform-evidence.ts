import type { Artifact, ProjectConfig, ValidationFinding } from "./types.js";
import { isLiveStatus } from "./types.js";

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
  const declared = new Set(
    (["unit", "integration", "system"] as const).flatMap((level) => config.verification[level].flatMap((command) => command.platforms ?? []))
  );
  const liveTargets = artifacts.filter((artifact) => artifact.artifact_type === "platform_target" && isLiveStatus(artifact.status));
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
