import type { Artifact } from "./types.js";

/** Distinct, sorted matches of a local-ID pattern inside an artifact body. */
export function bodyIds(body: string, pattern: RegExp): string[] {
  return [...new Set(body.match(pattern) ?? [])].sort();
}

/** The verification families that can claim an identifier by proving it. */
export const TEST_TYPES = new Set(["unit_test_backend", "unit_test_frontend", "unit_test_job", "integration_test", "system_test"]);

/** The three unit families, split out wherever a view reports by level. */
export const UNIT_TEST_TYPES = new Set(["unit_test_backend", "unit_test_frontend", "unit_test_job"]);

/**
 * Whether one artifact claims a local ID owned by another.
 *
 * Two forms count, and the difference matters. A qualified reference
 * (`FTR-X#BR-01`) is unambiguous anywhere. A bare `BR-01` is ambiguous in
 * general — every feature has one — so it counts only inside an artifact that
 * already declares the owning artifact in `depends_on`, which is what makes
 * the bare form resolvable. Every closure check in the engine shares this
 * predicate so no two of them can disagree about what a claim is.
 */
export function claimsLocalId(artifact: Artifact, ownerId: string, localId: string): boolean {
  if (artifact.body.includes(`${ownerId}#${localId}`)) return true;
  return artifact.depends_on.includes(ownerId) && new RegExp(`\\b${localId}\\b`).test(artifact.body);
}

/**
 * Whether one artifact claims a globally unique identifier — a foundation row
 * ID such as `ACCESS-001` or `INV-002`. These need no owner qualification
 * because the foundation that declares them is a singleton, so a bare match is
 * already unambiguous.
 */
export function claimsGlobalId(artifact: Artifact, globalId: string): boolean {
  return new RegExp(`\\b${globalId}\\b`).test(artifact.body);
}

export interface FoundationReference {
  artifactType: string;
  /** Heading used when the reference set is projected into a work packet. */
  heading: string;
  /** Singular name of one row, used in validation messages. */
  label: string;
  /** Warning raised when nothing claims a declared row. */
  warningCode: string;
  pattern: RegExp;
}

/**
 * The foundation row families other artifacts reference by ID. One table feeds
 * both the implementation work packets and the foundation-coverage closure, so
 * a family added here becomes visible to both at once.
 */
export const FOUNDATION_REFERENCES: readonly FoundationReference[] = [
  { artifactType: "access_control", heading: "Access rules referenced", label: "access rule", warningCode: "ACCESS_UNVERIFIED", pattern: /\bACCESS-\d[A-Z0-9-]*\b/g },
  { artifactType: "system_invariants", heading: "System invariants referenced", label: "system invariant", warningCode: "INVARIANT_UNVERIFIED", pattern: /\bINV-\d[A-Z0-9-]*\b/g },
  { artifactType: "error_catalog", heading: "Error codes referenced", label: "error code", warningCode: "ERROR_UNVERIFIED", pattern: /\bERROR-[A-Z][A-Z0-9]*-\d+\b/g },
  { artifactType: "ux_rules", heading: "UX rules referenced", label: "UX rule", warningCode: "UX_UNVERIFIED", pattern: /\bUX-\d[A-Z0-9-]*\b/g }
] as const;
