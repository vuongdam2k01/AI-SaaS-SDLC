import { afterEach, describe, expect, it } from "vitest";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { artifact, cleanup, tempProject } from "./helpers.js";
import { loadConfig } from "../src/core/config.js";
import { configKeyStates, observedConfigKeys, runtimeConfigFindings, suppliedConfigKeys, unrunnableCommands } from "../src/core/runtime-config.js";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await cleanup(roots.pop()!); });

async function patchConfig(root: string, mutate: (config: Record<string, unknown>) => void): Promise<void> {
  const file = path.join(root, "sdlc.config.yaml");
  const config = YAML.parse(await readFile(file, "utf8"));
  mutate(config);
  await writeFile(file, YAML.stringify(config), "utf8");
}

/** A wired project whose single source reads two keys from four call sites. */
async function wired(): Promise<string> {
  const root = await tempProject();
  roots.push(root);
  await mkdir(path.join(root, "app", "src"), { recursive: true });
  await writeFile(path.join(root, "app", "src", "server.ts"), [
    "const port = Number(process.env.PORT ?? 3000);",
    "const key = process.env[\"PROVIDER_API_KEY\"];",
    "export { port, key };"
  ].join("\n"), "utf8");
  await patchConfig(root, (config) => {
    config.implementation_sources = [{ id: "app", path: "./app" }];
  });
  return root;
}

const LIVE_INT = artifact({ id: "INT-A-001", artifact_type: "external_integration", status: "active" });

describe("runtime configuration surface", () => {
  it("reports the keys the code reads before anything has been declared", async () => {
    const root = await wired();
    const observed = await observedConfigKeys(root, await loadConfig(root));
    expect([...observed.keys()].sort()).toEqual(["PORT", "PROVIDER_API_KEY"]);
    expect(observed.get("PORT")).toEqual(["app:src/server.ts:1"]);
    // The point of the scan: an owner who has described nothing still learns
    // their own configuration surface, sites included.
    const findings = await runtimeConfigFindings(root, await loadConfig(root), [LIVE_INT]);
    expect(findings.map((finding) => finding.code)).toEqual(["CONFIG_KEY_UNDECLARED", "CONFIG_KEY_UNDECLARED"]);
    expect(findings.every((finding) => finding.severity === "warning")).toBe(true);
  });

  it("recognises environment reads in languages other than the engine's own", async () => {
    const root = await wired();
    await writeFile(path.join(root, "app", "src", "worker.py"), "token = os.environ[\"PY_TOKEN\"]\nalt = os.getenv('PY_ALT')\n", "utf8");
    await writeFile(path.join(root, "app", "src", "main.go"), "v := os.Getenv(\"GO_TOKEN\")\n", "utf8");
    await writeFile(path.join(root, "app", "src", "Main.java"), "String v = System.getenv(\"JAVA_TOKEN\");\n", "utf8");
    const observed = await observedConfigKeys(root, await loadConfig(root));
    expect([...observed.keys()].sort()).toEqual(["GO_TOKEN", "JAVA_TOKEN", "PORT", "PROVIDER_API_KEY", "PY_ALT", "PY_TOKEN"]);
  });

  it("clears the undeclared warning when a declaration names the artifact that imposes the key", async () => {
    const root = await wired();
    await patchConfig(root, (config) => {
      config.configuration = [
        { key: "PROVIDER_API_KEY", required_by: "INT-A-001" },
        { key: "PORT", required_by: "INT-A-001", optional: true }
      ];
    });
    const findings = await runtimeConfigFindings(root, await loadConfig(root), [LIVE_INT]);
    // PORT is optional, so its absence is not owed; PROVIDER_API_KEY is not.
    expect(findings.map((finding) => finding.code)).toEqual(["CONFIG_REQUIREMENT_UNSUPPLIED"]);
    expect(findings[0]?.message).toContain("PROVIDER_API_KEY");
  });

  it("treats an environment file as supply and never reads past the key name", async () => {
    const root = await wired();
    await patchConfig(root, (config) => {
      config.configuration = [{ key: "PROVIDER_API_KEY", required_by: "INT-A-001" }];
    });
    await writeFile(path.join(root, "app", ".env"), "# provisioned by the owner\nPROVIDER_API_KEY=sk-live-do-not-leak-me\n", "utf8");
    const supplied = await suppliedConfigKeys(root, await loadConfig(root));
    expect(supplied.get("PROVIDER_API_KEY")).toBe("./app/.env");
    const states = await configKeyStates(root, await loadConfig(root));
    const findings = await runtimeConfigFindings(root, await loadConfig(root), [LIVE_INT]);
    expect(findings.filter((finding) => finding.code === "CONFIG_REQUIREMENT_UNSUPPLIED")).toEqual([]);
    // The secret boundary INT-* declares is the boundary this module keeps: no
    // value reaches a state, a finding, or anything a caller can read.
    const surface = JSON.stringify({ states, findings });
    expect(surface).not.toContain("sk-live-do-not-leak-me");
  });

  it("reports a declaration no source reads and one whose imposer is not live", async () => {
    const root = await wired();
    await patchConfig(root, (config) => {
      config.configuration = [
        { key: "PROVIDER_API_KEY", required_by: "INT-GHOST-001" },
        { key: "RETIRED_KEY", required_by: "INT-A-001", optional: true },
        { key: "PORT", required_by: "INT-A-001", optional: true }
      ];
    });
    const findings = await runtimeConfigFindings(root, await loadConfig(root), [LIVE_INT]);
    const unknown = findings.filter((finding) => finding.code === "CONFIG_DECLARATION_UNKNOWN");
    expect(unknown).toHaveLength(2);
    expect(unknown.map((finding) => finding.message).join(" ")).toContain("RETIRED_KEY");
    expect(unknown.map((finding) => finding.message).join(" ")).toContain("INT-GHOST-001");
  });

  it("names the commands this machine cannot run instead of executing them into a failure", async () => {
    const root = await wired();
    await patchConfig(root, (config) => {
      config.configuration = [{ key: "PROVIDER_API_KEY", required_by: "INT-A-001" }];
      (config.verification as Record<string, unknown>).integration = [{ id: "provider-spike", cwd: ".", command: "node -e \"process.exit(0)\"", requires_config: ["PROVIDER_API_KEY"] }];
    });
    const blocked = await unrunnableCommands(root, await loadConfig(root));
    expect(blocked).toEqual([{ level: "integration", id: "provider-spike", missing: ["PROVIDER_API_KEY"] }]);
    await writeFile(path.join(root, "app", ".env"), "PROVIDER_API_KEY=value\n", "utf8");
    expect(await unrunnableCommands(root, await loadConfig(root))).toEqual([]);
  });

  it("owes nothing when no implementation source is configured", async () => {
    const root = await tempProject();
    roots.push(root);
    expect(await runtimeConfigFindings(root, await loadConfig(root), [LIVE_INT])).toEqual([]);
  });

  it("refuses a configuration entry carrying a value", async () => {
    const root = await wired();
    await patchConfig(root, (config) => {
      config.configuration = [{ key: "PROVIDER_API_KEY", required_by: "INT-A-001", value: "sk-live" }];
    });
    // The committed file must never become a place a credential can live, so an
    // unknown key is a load failure rather than an ignored extra.
    await expect(loadConfig(root)).rejects.toThrow(/Invalid sdlc.config.yaml/);
  });
});
