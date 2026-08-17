import { afterEach, describe, expect, it } from "vitest";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cleanup, tempProject } from "./helpers.js";
import { releaseStaleLock, withProjectLock } from "../src/core/project-lock.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

function lockFile(root: string): string {
  return path.join(root, ".ai-saas-sdlc", "state", "engine.lock");
}

/** A PID no process can hold: `process.kill(pid, 0)` reports ESRCH for it. */
async function writeDeadLock(root: string, pid = 2_147_483_646): Promise<string> {
  const file = lockFile(root);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify({ pid, token: "dead-token", created_at: "2026-01-01T00:00:00.000Z" })}\n`, "utf8");
  return file;
}

describe("engine lock recovery", () => {
  it("reclaims a lock whose owning process is gone instead of demanding a manual delete", async () => {
    const root = await tempProject();
    roots.push(root);
    await writeDeadLock(root);

    // The debris of a killed run must not outlive it: the next operation takes
    // the lock rather than failing and telling the author to remove a file the
    // safety hooks deny to every tool they have.
    const observed = await withProjectLock(root, async () => "ran");
    expect(observed).toBe("ran");

    const held = JSON.parse(await readFile(lockFile(root), "utf8").catch(() => "null"));
    expect(held).toBeNull();
  });

  it("refuses to clear a live lock and reports the process still holding it", async () => {
    const root = await tempProject();
    roots.push(root);
    const file = lockFile(root);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, `${JSON.stringify({ pid: process.pid, token: "live", created_at: "2026-01-01T00:00:00.000Z" })}\n`, "utf8");

    const report = await releaseStaleLock(root);
    expect(report.state).toBe("held");
    expect(report.pid).toBe(process.pid);
    // Refusing is the whole point: a live operation loses its mutual exclusion
    // the moment recovery stops checking liveness.
    expect(await readFile(file, "utf8")).toContain("live");
  });

  it("reports an absent lock as nothing to clear", async () => {
    const root = await tempProject();
    roots.push(root);
    const report = await releaseStaleLock(root);
    expect(report.state).toBe("absent");
    expect(report.pid).toBeNull();
  });

  it("clears a dead lock through the engine so recovery never needs raw file access", async () => {
    const root = await tempProject();
    roots.push(root);
    await writeDeadLock(root, 2_147_483_645);

    const report = await releaseStaleLock(root);
    expect(report.state).toBe("reclaimed");
    expect(report.pid).toBe(2_147_483_645);
    await expect(readFile(lockFile(root), "utf8")).rejects.toThrow();
  });
});
