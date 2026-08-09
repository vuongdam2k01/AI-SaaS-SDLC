export async function readHookInput(): Promise<Record<string, unknown>> {
  let raw = "";
  for await (const chunk of process.stdin) raw += String(chunk);
  if (!raw.trim()) return {};
  try {
    const value = JSON.parse(raw) as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export function emit(value: unknown): void {
  process.stdout.write(JSON.stringify(value));
}

