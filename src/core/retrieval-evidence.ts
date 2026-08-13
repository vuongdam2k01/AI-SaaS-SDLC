import type { Artifact, QueryRecord, RetrievalRecord, ValidationFinding } from "./types.js";
import { allSections } from "./markdown.js";

/**
 * Evidence-to-retrieval linkage warnings. All four are warnings and never
 * errors, the same doctrine as platform evidence: a repository written before
 * research instruments existed — or one whose author works at rung 0 — is
 * legitimate forever, and validation must report identically on every
 * machine, so nothing here reads the environment. The committed records and
 * the ledger are the only inputs; the ledger is the authority for which
 * retrieval backs which evidence entry.
 */

export interface EvidenceRetrievalEntry {
  evd: string;
  url: string | null;
  retrieval: string | null;
  file: string;
}

export function evidenceRetrievalEntries(artifacts: Artifact[]): EvidenceRetrievalEntry[] {
  const ledger = artifacts.find((artifact) => artifact.artifact_type === "evidence_ledger");
  if (!ledger) return [];
  return allSections(ledger.body)
    .filter((section) => /^EVD-[A-Z0-9-]+/.test(section.title))
    .map((section) => ({
      evd: section.title.match(/^EVD-[A-Z0-9-]+/)![0],
      url: section.body.match(/^-\s*URL:\s*<?(https?:\/\/\S+?)>?\s*$/m)?.[1] ?? null,
      retrieval: section.body.match(/^-\s*Retrieval:\s*(RET-[0-9]{3,})\b/m)?.[1] ?? null,
      file: ledger.file
    }));
}

function retrievalUrls(record: RetrievalRecord): string[] {
  return record.resolved_url ? [record.url, record.resolved_url] : [record.url];
}

export function retrievalEvidenceFindings(artifacts: Artifact[], retrievals: RetrievalRecord[], queries: QueryRecord[]): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const entries = evidenceRetrievalEntries(artifacts);
  const okRetrievals = retrievals.filter((record) => record.ok);
  const byId = new Map(retrievals.map((record) => [record.id, record]));

  for (const entry of entries) {
    if (entry.retrieval) {
      const cited = byId.get(entry.retrieval);
      if (!cited) {
        findings.push({ severity: "warning", code: "EVD_RETRIEVAL_BROKEN", message: `${entry.evd} cites ${entry.retrieval}, which does not exist under .ai-saas-sdlc/retrievals/.`, file: entry.file });
      } else if (!cited.ok) {
        findings.push({ severity: "warning", code: "EVD_RETRIEVAL_BROKEN", message: `${entry.evd} cites ${entry.retrieval}, a failed retrieval with no body; evidence cannot rest on a fetch that did not happen.`, file: entry.file });
      } else if (entry.url && !retrievalUrls(cited).includes(entry.url)) {
        findings.push({ severity: "warning", code: "EVD_RETRIEVAL_BROKEN", message: `${entry.evd} cites ${entry.retrieval}, but that record retrieved ${cited.url}, not ${entry.url}.`, file: entry.file });
      }
      continue;
    }
    if (!entry.url) continue;
    const matching = okRetrievals.filter((record) => retrievalUrls(record).includes(entry.url!));
    if (matching.length > 0) {
      findings.push({ severity: "warning", code: "EVD_RETRIEVAL_MISSING", message: `${entry.evd} cites ${entry.url}, which the engine retrieved as ${matching.map((record) => record.id).join(", ")}; add "- Retrieval: ${matching[matching.length - 1]!.id}" so the entry names its provenance.`, file: entry.file });
    }
  }

  // Discovery surfaced a URL through an instrument, the ledger built evidence
  // on that URL, and no engine retrieval of it exists: the inspection step
  // bypassed the configured instrument. Derived purely from records, so a
  // rung-0 repository (no queries) can never trigger it.
  const evidencedUrls = new Set(entries.map((entry) => entry.url).filter((url): url is string => Boolean(url)));
  const retrieved = new Set(okRetrievals.flatMap(retrievalUrls));
  const surfaced = new Set(queries.filter((query) => query.ok && query.capability_rung >= 2).flatMap((query) => (query.results ?? []).map((result) => result.url)));
  const bypassed = [...evidencedUrls].filter((url) => surfaced.has(url) && !retrieved.has(url)).sort();
  if (bypassed.length > 0) {
    const shown = bypassed.slice(0, 5).join(", ");
    const more = bypassed.length > 5 ? ` and ${bypassed.length - 5} more` : "";
    findings.push({ severity: "warning", code: "RESEARCH_CAPABILITY_UNDERUSED", message: `Instrument discovery surfaced ${shown}${more} and the evidence ledger cites ${bypassed.length > 1 ? "them" : "it"}, but no engine retrieval exists; inspect cited pages through the configured instrument so their provenance is recorded.` });
  }

  // A failed engine retrieval that no later success covers is a standing
  // degradation: the flow fell back to host tools (or nothing) for that
  // source. The warning is the durable record of that fallback.
  for (const record of retrievals.filter((candidate) => !candidate.ok)) {
    const recovered = okRetrievals.some((candidate) => candidate.url === record.url);
    if (!recovered) {
      findings.push({ severity: "warning", code: "RETRIEVAL_RUNG_DEGRADED", message: `${record.id}: engine retrieval of ${record.url} failed (${record.instrument}${record.escalation ? " after firecrawl" : ""}) and no later retrieval of it succeeded; the flow degraded to host tools for this source — retry, or let this warning stand as the record.` });
    }
  }

  return findings;
}
