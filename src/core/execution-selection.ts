import type { ExecutionRecord } from "./types.js";

export function latestExecution(records: ExecutionRecord[]): ExecutionRecord | undefined {
  return records.reduce<ExecutionRecord | undefined>((latest, record) => {
    const sequence = Number(record.id.slice("EXEC-".length));
    const latestSequence = latest ? Number(latest.id.slice("EXEC-".length)) : -1;
    return sequence > latestSequence ? record : latest;
  }, undefined);
}
