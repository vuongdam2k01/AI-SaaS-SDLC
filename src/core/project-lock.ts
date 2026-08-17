import { AsyncLocalStorage } from "node:async_hooks";
import { open, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { assertSafeManagedPath, prepareSafeManagedPath } from "./paths.js";
import { SdlcError } from "./errors.js";

const heldLocks = new AsyncLocalStorage<Set<string>>();
const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function processExists(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch (error) { return (error as NodeJS.ErrnoException).code !== "ESRCH"; }
}

async function readLock(file: string): Promise<{ pid?: unknown; created_at?: unknown } | null> {
  try {
    await assertSafeManagedPath(path.dirname(path.dirname(path.dirname(file))), file);
    return JSON.parse(await readFile(file, "utf8")) as { pid?: unknown; created_at?: unknown };
  } catch { return null; }
}

async function inactiveLock(file: string): Promise<boolean> {
  const value = await readLock(file);
  return typeof value?.pid === "number" && !processExists(value.pid);
}

// Detecting a dead lock and then refusing to act on it is what forced an author
// to delete engine-owned state by hand. Reclaim it instead: the owning process
// is gone, so the file is debris, and `open(…, "wx")` still arbitrates whoever
// races us to the empty slot. Liveness stays the only criterion — a recycled
// PID reads as alive and keeps us waiting, which is the safe direction to err.
async function reclaimInactiveLock(file: string): Promise<boolean> {
  if (!(await inactiveLock(file))) return false;
  try { await rm(file, { force: true }); return true; } catch { return false; }
}

async function acquire(root: string): Promise<() => Promise<void>> {
  const file = path.join(root, ".ai-saas-sdlc", "state", "engine.lock");
  await prepareSafeManagedPath(root, file);
  const token = randomUUID();
  let reclaimed = false;
  for (let attempt = 0; attempt <= 100; attempt += 1) {
    try {
      const handle = await open(file, "wx");
      try { await handle.writeFile(`${JSON.stringify({ pid: process.pid, token, created_at: new Date().toISOString() })}\n`, "utf8"); }
      catch (error) { await rm(file, { force: true }); throw error; }
      finally { await handle.close(); }
      return async () => {
        try {
          const value = JSON.parse(await readFile(file, "utf8")) as { token?: unknown };
          if (value.token === token) await rm(file);
        } catch { /* A missing lock is already released. */ }
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (!reclaimed && await reclaimInactiveLock(file)) { reclaimed = true; continue; }
      if (attempt === 100) {
        const inactive = await inactiveLock(file);
        throw new SdlcError(inactive
          ? `A crashed AI SaaS SDLC operation left a lock this run could not reclaim; run \`unlock\` to clear it.`
          : "Another AI SaaS SDLC engine operation is still active.");
      }
      await delay(25);
    }
  }
  throw new SdlcError("Could not acquire the AI SaaS SDLC engine lock.");
}

export interface UnlockReport {
  /** `absent` held no lock, `reclaimed` cleared a dead one, `held` refused a live one. */
  state: "absent" | "reclaimed" | "held";
  pid: number | null;
  created_at: string | null;
  detail: string;
}

// Recovery must be reachable through the engine, not through raw file access:
// the lock lives under engine-owned state that the safety hooks deny to every
// tool, so an error telling an author to delete it prescribed a fix the agent
// beside them was forbidden to apply.
export async function releaseStaleLock(root: string): Promise<UnlockReport> {
  const file = path.join(path.resolve(root), ".ai-saas-sdlc", "state", "engine.lock");
  const value = await readLock(file);
  if (!value) return { state: "absent", pid: null, created_at: null, detail: "No engine lock is present; nothing to clear." };
  const pid = typeof value.pid === "number" ? value.pid : null;
  const created_at = typeof value.created_at === "string" ? value.created_at : null;
  if (pid !== null && processExists(pid)) {
    return { state: "held", pid, created_at, detail: `Process ${pid} still exists, so the lock is live and was left untouched. Wait for that operation, or stop it first.` };
  }
  await rm(file, { force: true });
  return { state: "reclaimed", pid, created_at, detail: `Cleared a lock owned by process ${pid ?? "unknown"}, which no longer exists.` };
}

export async function withProjectLock<T>(root: string, task: () => Promise<T>): Promise<T> {
  const key = path.resolve(root);
  const held = heldLocks.getStore();
  if (held?.has(key)) return task();
  const release = await acquire(key);
  const next = new Set(held);
  next.add(key);
  return heldLocks.run(next, async () => {
    try { return await task(); } finally { await release(); }
  });
}
