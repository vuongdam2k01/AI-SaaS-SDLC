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

async function inactiveLock(file: string): Promise<boolean> {
  try {
    await assertSafeManagedPath(path.dirname(path.dirname(path.dirname(file))), file);
    const value = JSON.parse(await readFile(file, "utf8")) as { pid?: unknown };
    return typeof value.pid === "number" && !processExists(value.pid);
  } catch { return false; }
}

async function acquire(root: string): Promise<() => Promise<void>> {
  const file = path.join(root, ".ai-saas-sdlc", "state", "engine.lock");
  await prepareSafeManagedPath(root, file);
  const token = randomUUID();
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
      if (attempt === 100) {
        const inactive = await inactiveLock(file);
        throw new SdlcError(inactive
          ? `A crashed AI SaaS SDLC operation left ${file}; confirm no engine process is running, then remove that one lock file.`
          : "Another AI SaaS SDLC engine operation is still active.");
      }
      await delay(25);
    }
  }
  throw new SdlcError("Could not acquire the AI SaaS SDLC engine lock.");
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
