import type { Artifact } from "./types.js";
import { completedRow, dataRows, headingKey, sectionBody } from "./markdown.js";

/**
 * Baselines a question may stay open before the ledger stops being a record of
 * what is unknown and becomes a place unknowns go to be forgotten.
 *
 * Three is chosen so that a question raised by one change survives the change
 * after it without complaint, and is only called out once it has outlived the
 * work that raised it.
 */
export const STALE_AFTER_BASELINES = 3;

/**
 * The closed value domain of the ledger's `Blocked on` column: who or what a
 * question is actually waiting for. The first two are the only classes the
 * owner can act on today, which is exactly why they are worth separating —
 * seven stale questions that all wait on the world hide the one that waits on
 * a person.
 */
export const QUESTION_BLOCKED_ON = ["owner-decision", "owner-environment", "measurement", "post-launch", "external-evidence"] as const;
export type QuestionBlockedOn = (typeof QUESTION_BLOCKED_ON)[number];

/** Classes whose questions wait on the owner and are actionable today. */
export const OWNER_BLOCKED: ReadonlySet<QuestionBlockedOn> = new Set(["owner-decision", "owner-environment"]);

export function normalizeBlockedOn(value: string | undefined): QuestionBlockedOn | null {
  const cleaned = (value ?? "").replace(/[`*]/g, "").trim().toLowerCase();
  return (QUESTION_BLOCKED_ON as readonly string[]).includes(cleaned) ? (cleaned as QuestionBlockedOn) : null;
}

/**
 * Staleness is class-aware. A question waiting on post-launch behavior or an
 * external source that has outlived three baselines means nothing — it waits
 * on the world, and the world is allowed to be slow. A question waiting on the
 * owner or on a measurement this machine could run is the real debt the
 * staleness signal exists to surface. Unclassified rows keep the historical
 * threshold, so a ledger written before the column existed reads unchanged.
 */
export function questionIsStale(blockedOn: QuestionBlockedOn | null, age: number | null): boolean {
  if (age === null) return false;
  if (blockedOn === "post-launch" || blockedOn === "external-evidence") return false;
  return age >= STALE_AFTER_BASELINES;
}

export interface OpenQuestion {
  id: string;
  question: string;
  affected: string;
  blocked_on: QuestionBlockedOn | null;
  file: string;
}

function column(columns: string[], name: string): number {
  return columns.map(headingKey).indexOf(headingKey(name));
}

/**
 * Questions the ledger currently declares open.
 *
 * Read from the artifact rather than tracked in engine state: the ledger is the
 * authority on what is unknown, and a second store would eventually disagree
 * with it. State only records *when* each one was first seen open.
 */
export function openQuestions(artifacts: Artifact[]): OpenQuestion[] {
  const ledger = artifacts.find((artifact) => artifact.artifact_type === "question_ledger");
  if (!ledger) return [];
  const section = sectionBody(ledger.body, "Open questions");
  if (!section) return [];
  const rows = dataRows(section);
  const header = rows.find((row) => column(row, "Question ID") >= 0 && column(row, "Status") >= 0);
  if (!header) return [];
  const idIndex = column(header, "Question ID");
  const statusIndex = column(header, "Status");
  const questionIndex = column(header, "Question");
  const affectedIndex = column(header, "Affected artifacts");
  const blockedOnIndex = column(header, "Blocked on");
  const questions = new Map<string, OpenQuestion>();
  for (const row of rows) {
    if (!completedRow(row)) continue;
    const id = (row[idIndex] ?? "").replace(/[`*]/g, "").trim().toUpperCase();
    if (!/^QST-[A-Z0-9-]+$/.test(id)) continue;
    if ((row[statusIndex] ?? "").trim().toLowerCase() === "resolved") continue;
    questions.set(id, {
      id,
      question: (row[questionIndex] ?? "").trim(),
      affected: (row[affectedIndex] ?? "").trim(),
      blocked_on: blockedOnIndex >= 0 ? normalizeBlockedOn(row[blockedOnIndex]) : null,
      file: ledger.file
    });
  }
  return [...questions.values()];
}

export function baselineNumber(id: string | null | undefined): number | null {
  if (!id) return null;
  const number = Number(id.slice(3));
  return Number.isInteger(number) ? number : null;
}

/** Baselines a question has been open for, or null when its origin is unknown. */
export function baselinesOpen(firstBaseline: string | undefined, activeBaseline: string | null): number | null {
  const first = baselineNumber(firstBaseline);
  const active = baselineNumber(activeBaseline);
  if (first === null || active === null) return null;
  return Math.max(0, active - first);
}
