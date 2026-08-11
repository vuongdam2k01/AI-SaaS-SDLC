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

export interface OpenQuestion {
  id: string;
  question: string;
  affected: string;
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
