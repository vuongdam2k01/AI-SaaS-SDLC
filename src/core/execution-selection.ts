import type { CommandDefinition, ExecutionRecord } from "./types.js";

export function latestExecution(records: ExecutionRecord[]): ExecutionRecord | undefined {
  return records.reduce<ExecutionRecord | undefined>((latest, record) => {
    const sequence = Number(record.id.slice("EXEC-".length));
    const latestSequence = latest ? Number(latest.id.slice("EXEC-".length)) : -1;
    return sequence > latestSequence ? record : latest;
  }, undefined);
}

/** Order-insensitive equality for platform declarations; absence equals empty. */
export function samePlatformDeclaration(a: string[] | undefined, b: string[] | undefined): boolean {
  const left = [...(a ?? [])].sort();
  const right = [...(b ?? [])].sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

// A record is evidence for a configured command only when it matches the
// definition as it stands: same id, same command text, same working directory
// and the same platform declaration. The declaration participates so that an
// execution recorded before a platform declaration was added is not evidence
// for that declaration; a declare-after-run edit reads as not-run and forces a
// re-execution. Every consumer of "which record is evidence for this command"
// must use this predicate — the in-flow reuse check in verification.ts is the
// one deliberate exception (it omits cwd and compares source snapshots, as
// documented there).
export function matchesDefinitionEvidence(record: ExecutionRecord, definition: CommandDefinition): boolean {
  return record.command_id === definition.id
    && record.command === definition.command
    && record.cwd === definition.cwd
    && samePlatformDeclaration(record.platforms, definition.platforms);
}
