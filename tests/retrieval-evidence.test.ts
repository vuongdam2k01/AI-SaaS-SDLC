import { describe, expect, it } from "vitest";
import { evidenceRetrievalEntries, retrievalEvidenceFindings } from "../src/core/retrieval-evidence.js";
import { retrievalBodyFile } from "../src/core/retrieval-records.js";
import { sha256 } from "../src/core/utils.js";
import type { QueryRecord, RetrievalRecord } from "../src/core/types.js";
import { artifact } from "./helpers.js";

function ledger(body: string) {
  return artifact({ id: "EVIDENCE-LEDGER", artifact_type: "evidence_ledger", file: "01-discovery/evidence-ledger.md", body });
}

function okRetrieval(id: string, url: string): RetrievalRecord {
  return {
    schema_version: 1,
    id,
    flow_id: "FLOW-001",
    url,
    instrument: "firecrawl",
    via: "fetch",
    ok: true,
    capability_rung: 2,
    started_at: "2026-08-12T00:00:00.000Z",
    ended_at: "2026-08-12T00:00:01.000Z",
    git_commit: null,
    body_file: retrievalBodyFile(id),
    body_hash: sha256("body\n"),
    body_bytes: 5,
    truncated: false
  };
}

function failedRetrieval(id: string, url: string): RetrievalRecord {
  return {
    schema_version: 1,
    id,
    flow_id: "FLOW-001",
    url,
    instrument: "firecrawl",
    via: "fetch",
    ok: false,
    capability_rung: 3,
    started_at: "2026-08-12T00:00:00.000Z",
    ended_at: "2026-08-12T00:00:01.000Z",
    git_commit: null,
    error: "HTTP 403"
  };
}

function okQuery(id: string, urls: string[]): QueryRecord {
  return {
    schema_version: 1,
    id,
    flow_id: "FLOW-001",
    kind: "search",
    instrument: "searxng",
    ok: true,
    capability_rung: 2,
    query: "question",
    started_at: "2026-08-12T00:00:00.000Z",
    ended_at: "2026-08-12T00:00:01.000Z",
    git_commit: null,
    results: urls.map((url) => ({ url })),
    result_count: urls.length
  };
}

const EVD = (retrievalLine: string) => `# Evidence ledger

## EVD-001 — source title

- URL: https://source.example/report
${retrievalLine}- Observation: something
`;

describe("evidence retrieval linkage", () => {
  it("parses EVD sections into url and retrieval fields", () => {
    const entries = evidenceRetrievalEntries([ledger(EVD("- Retrieval: RET-001\n"))]);
    expect(entries).toEqual([{ evd: "EVD-001", url: "https://source.example/report", retrieval: "RET-001", file: "01-discovery/evidence-ledger.md" }]);
  });

  it("warns EVD_RETRIEVAL_MISSING only when an ok retrieval matches the cited URL", () => {
    const missing = retrievalEvidenceFindings([ledger(EVD(""))], [okRetrieval("RET-001", "https://source.example/report")], []);
    expect(missing.map((finding) => finding.code)).toEqual(["EVD_RETRIEVAL_MISSING"]);
    expect(missing[0]!.severity).toBe("warning");
    // No matching retrieval: rung-0 evidence is legitimate forever.
    expect(retrievalEvidenceFindings([ledger(EVD(""))], [okRetrieval("RET-001", "https://other.example/page")], [])).toEqual([]);
    // A correct citation satisfies the linkage.
    expect(retrievalEvidenceFindings([ledger(EVD("- Retrieval: RET-001\n"))], [okRetrieval("RET-001", "https://source.example/report")], [])).toEqual([]);
  });

  it("warns EVD_RETRIEVAL_BROKEN for missing, failed and mismatched citations", () => {
    const absent = retrievalEvidenceFindings([ledger(EVD("- Retrieval: RET-009\n"))], [], []);
    expect(absent.map((finding) => finding.code)).toEqual(["EVD_RETRIEVAL_BROKEN"]);
    const failed = retrievalEvidenceFindings([ledger(EVD("- Retrieval: RET-001\n"))], [{ ...failedRetrieval("RET-001", "https://source.example/report") }], []);
    expect(failed.some((finding) => finding.code === "EVD_RETRIEVAL_BROKEN" && finding.message.includes("failed"))).toBe(true);
    const mismatched = retrievalEvidenceFindings([ledger(EVD("- Retrieval: RET-001\n"))], [okRetrieval("RET-001", "https://different.example/page")], []);
    expect(mismatched.some((finding) => finding.code === "EVD_RETRIEVAL_BROKEN" && finding.message.includes("not https://source.example/report"))).toBe(true);
  });

  it("warns RESEARCH_CAPABILITY_UNDERUSED when discovery surfaced a cited URL nothing retrieved", () => {
    const bypassed = retrievalEvidenceFindings([ledger(EVD(""))], [], [okQuery("QRY-001", ["https://source.example/report"])]);
    expect(bypassed.map((finding) => finding.code)).toEqual(["RESEARCH_CAPABILITY_UNDERUSED"]);
    // Retrieving the page clears it (the citation itself is then required separately).
    const covered = retrievalEvidenceFindings([ledger(EVD("- Retrieval: RET-001\n"))], [okRetrieval("RET-001", "https://source.example/report")], [okQuery("QRY-001", ["https://source.example/report"])]);
    expect(covered).toEqual([]);
  });

  it("warns RETRIEVAL_RUNG_DEGRADED only while no later success covers the URL", () => {
    const standing = retrievalEvidenceFindings([ledger("# Evidence ledger\n")], [failedRetrieval("RET-001", "https://blocked.example/page")], []);
    expect(standing.map((finding) => finding.code)).toEqual(["RETRIEVAL_RUNG_DEGRADED"]);
    const recovered = retrievalEvidenceFindings(
      [ledger("# Evidence ledger\n")],
      [failedRetrieval("RET-001", "https://blocked.example/page"), okRetrieval("RET-002", "https://blocked.example/page")],
      []
    );
    expect(recovered).toEqual([]);
  });

  it("emits nothing at all for empty record sets", () => {
    expect(retrievalEvidenceFindings([ledger(EVD(""))], [], [])).toEqual([]);
  });
});
