import { readFile } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import type { Artifact, ConfigRequirement, ProjectConfig, ValidationFinding } from "./types.js";
import { isLiveStatus } from "./types.js";
import { isWithin } from "./paths.js";

/**
 * Every form of environment read this scan recognises. The engine reports the
 * *names* a codebase depends on; it never reads, stores, prints or transmits a
 * value, here or anywhere downstream — the secret boundary an INT-* artifact
 * declares (`credential ownership and storage`) is the same boundary this
 * module respects, which is why a key is only ever a string in this file.
 *
 * The set is deliberately multi-language: an implementation source is whatever
 * the product is written in, and a Go or Python service depends on its
 * environment exactly as a Node one does. A form nobody uses costs one failed
 * regex per file; a form nobody recognises costs an undeclared dependency
 * nothing reports.
 */
const READ_FORMS: RegExp[] = [
  /\bprocess\.env\.([A-Z][A-Z0-9_]*)\b/g,
  /\bprocess\.env\[\s*["'`]([A-Z][A-Z0-9_]*)["'`]\s*\]/g,
  /\bimport\.meta\.env\.([A-Z][A-Z0-9_]*)\b/g,
  /\bos\.environ(?:\.get)?[[(]\s*["']([A-Z][A-Z0-9_]*)["']/g,
  /\bos\.[Gg]etenv\(\s*["']([A-Z][A-Z0-9_]*)["']/g,
  /\bSystem\.getenv\(\s*["']([A-Z][A-Z0-9_]*)["']/g,
  /\benv::var(?:_os)?\(\s*["']([A-Z][A-Z0-9_]*)["']/g,
  /\bgetenv\(\s*["']([A-Z][A-Z0-9_]*)["']/g,
  /\bENV\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\]/g
];

const SOURCE_GLOB = "**/*.{ts,tsx,js,jsx,mjs,cjs,mts,cts,py,go,rb,rs,java,kt,kts,php,cs,swift,sh,bash}";

/** Directories whose contents are never the product's own source. */
const SCAN_EXCLUSIONS = [
  "**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**", "**/out/**",
  "**/.next/**", "**/.nuxt/**", "**/coverage/**", "**/vendor/**", "**/target/**",
  "**/.venv/**", "**/__pycache__/**", "**/.data/**", "**/test-results/**", "**/reports/**"
];

/**
 * The environment files a supply check consults, in precedence order. Only
 * these two: a predictable pair an author can point at beats an exhaustive
 * guess at every framework's convention, and an unfound key is reported as
 * unsupplied rather than silently assumed.
 */
const ENV_FILES = [".env", ".env.local"];

/** One key name from an environment file line. The value after `=` is never captured. */
const ENV_KEY_LINE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/;

export interface ConfigKeyState {
  key: string;
  /** The `configuration` entry declaring it, when the repository declares one. */
  declaration: ConfigRequirement | null;
  /** Sorted `source:path:line` sites where the codebase reads the key. */
  read_at: string[];
  /** Whether this machine supplies the key. Machine-local: never written to a projection. */
  supplied: boolean;
  /** Where the key was found — an environment file path, or the engine's own process environment. */
  supplied_from: string | null;
}

/**
 * Every environment key the configured implementation sources read, mapped to
 * the sites that read it. This is the half of the picture no document can
 * supply: an `INT-*` artifact declares that a credential boundary exists and
 * deliberately never names a key, so the concrete names only ever exist in the
 * code. The gap between this scan and the `configuration` declarations is what
 * makes "what does this product need from me" answerable at all.
 */
export async function observedConfigKeys(root: string, config: ProjectConfig): Promise<Map<string, string[]>> {
  const observed = new Map<string, string[]>();
  for (const source of [...config.implementation_sources].sort((a, b) => a.id.localeCompare(b.id))) {
    const base = path.resolve(root, source.path);
    const files = await fg(SOURCE_GLOB, { cwd: base, dot: false, onlyFiles: true, followSymbolicLinks: false, ignore: SCAN_EXCLUSIONS, suppressErrors: true });
    for (const relative of files.sort()) {
      const file = path.resolve(base, relative);
      if (!isWithin(base, file)) continue;
      const content = await readFile(file, "utf8").catch(() => "");
      if (!content) continue;
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        for (const form of READ_FORMS) {
          form.lastIndex = 0;
          for (const match of line.matchAll(form)) {
            const key = match[1];
            if (!key) continue;
            const site = `${source.id}:${relative}:${index + 1}`;
            const sites = observed.get(key) ?? [];
            if (!sites.includes(site)) sites.push(site);
            observed.set(key, sites);
          }
        }
      });
    }
  }
  return observed;
}

/**
 * The key names this machine supplies, mapped to where they were found.
 *
 * Presence only. The engine opens an environment file to read the identifier
 * left of the first `=` and discards the rest of the line; it never retains a
 * value, and no caller can obtain one through this function's return type.
 * That is what makes the check safe to run inside an ordinary read-only
 * inspection of a repository whose `.env` holds production credentials.
 */
export async function suppliedConfigKeys(root: string, config: ProjectConfig): Promise<Map<string, string>> {
  const supplied = new Map<string, string>();
  for (const source of [...config.implementation_sources].sort((a, b) => a.id.localeCompare(b.id))) {
    const base = path.resolve(root, source.path);
    for (const name of ENV_FILES) {
      const file = path.resolve(base, name);
      if (!isWithin(base, file)) continue;
      const content = await readFile(file, "utf8").catch(() => "");
      if (!content) continue;
      for (const line of content.split("\n")) {
        if (line.trimStart().startsWith("#")) continue;
        const key = ENV_KEY_LINE.exec(line)?.[1];
        if (key && !supplied.has(key)) supplied.set(key, `${source.path}/${name}`);
      }
    }
  }
  // A key exported into the engine's own environment is supplied as truly as
  // one written to a file — this is how CI supplies them — so the ambient
  // environment is consulted last, after the files that can be pointed at.
  for (const key of Object.keys(process.env)) {
    if (!supplied.has(key) && process.env[key] !== undefined && process.env[key] !== "") supplied.set(key, "environment");
  }
  return supplied;
}

/** The declared requirements, empty when the repository declares none. */
export function declaredRequirements(config: ProjectConfig | null): ConfigRequirement[] {
  return [...(config?.configuration ?? [])].sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * The joined view every configuration report and finding derives from, so a
 * report and a warning can never disagree. Union of declared and observed keys:
 * a declaration nothing reads is as much a fact as a read nothing declares.
 */
export async function configKeyStates(root: string, config: ProjectConfig): Promise<ConfigKeyState[]> {
  const observed = await observedConfigKeys(root, config);
  const supplied = await suppliedConfigKeys(root, config);
  const declarations = new Map(declaredRequirements(config).map((requirement) => [requirement.key, requirement]));
  const keys = [...new Set([...declarations.keys(), ...observed.keys()])].sort();
  return keys.map((key) => ({
    key,
    declaration: declarations.get(key) ?? null,
    read_at: observed.get(key) ?? [],
    supplied: supplied.has(key),
    supplied_from: supplied.get(key) ?? null
  }));
}

/**
 * Three standing warnings, never errors, following the platform-evidence
 * doctrine exactly: a configuration surface is a claim about the world outside
 * the repository, and the world is allowed to be behind. A baseline that
 * failed on an unsupplied key would make an ordinary documentation flow
 * unclosable on any machine without production credentials — precisely the
 * mock-first arrangement a quality requirement may deliberately mandate.
 *
 * - `CONFIG_KEY_UNDECLARED`: the codebase reads a key no artifact owns. This is
 *   the finding that answers the owner's question without any prior work: it
 *   needs no declaration to fire, so a repository that has never thought about
 *   configuration still learns its own surface. A key gating a product
 *   decision — an access gate, a feature switch — reaching no artifact is the
 *   configuration equivalent of an unowned client obligation.
 * - `CONFIG_REQUIREMENT_UNSUPPLIED`: a declared, non-optional key this machine
 *   does not supply. The durable record of "the real path cannot run here yet".
 * - `CONFIG_DECLARATION_UNKNOWN`: a declaration whose key no source reads, or
 *   whose `required_by` names no live artifact — the mirror image, catching a
 *   requirement that outlived the code or the design that imposed it.
 */
export async function runtimeConfigFindings(root: string, config: ProjectConfig, artifacts: Artifact[]): Promise<ValidationFinding[]> {
  const findings: ValidationFinding[] = [];
  const states = await configKeyStates(root, config);
  const liveIds = new Set(artifacts.filter((artifact) => isLiveStatus(artifact.status)).map((artifact) => artifact.id));
  for (const state of states) {
    if (!state.declaration) {
      findings.push({
        severity: "warning",
        code: "CONFIG_KEY_UNDECLARED",
        message: `${state.key} is read by the implementation (${state.read_at[0]}${state.read_at.length > 1 ? ` and ${state.read_at.length - 1} other site(s)` : ""}) and no configuration entry declares it; add it to the configuration list of sdlc.config.yaml naming the artifact that imposes it, or remove the read.`,
        file: "sdlc.config.yaml"
      });
      continue;
    }
    const { key, declaration } = state;
    if (state.read_at.length === 0) {
      findings.push({
        severity: "warning",
        code: "CONFIG_DECLARATION_UNKNOWN",
        message: `${key} is declared as configuration required by ${declaration.required_by}, and no configured implementation source reads it; the requirement outlived the code that consumed it, or the code that will consume it does not exist yet.`,
        file: "sdlc.config.yaml"
      });
    } else if (!liveIds.has(declaration.required_by)) {
      findings.push({
        severity: "warning",
        code: "CONFIG_DECLARATION_UNKNOWN",
        message: `${key} declares required_by ${declaration.required_by}, which matches no live artifact; name the artifact whose contract imposes the key.`,
        file: "sdlc.config.yaml"
      });
    }
    if (!declaration.optional && !state.supplied) {
      findings.push({
        severity: "warning",
        code: "CONFIG_REQUIREMENT_UNSUPPLIED",
        message: `${key} is required by ${declaration.required_by} and this machine supplies no value for it; write the key into an environment file of the source that reads it, or mark the requirement optional when a working default exists. The engine checks the key name only and never reads its value.`,
        file: "sdlc.config.yaml"
      });
    }
  }
  return findings;
}

/**
 * Every configured command whose declared keys this machine does not supply.
 * A command is not silently failed and not silently skipped: it is reported as
 * unrunnable here, so a real-provider suite that cannot execute says why
 * instead of producing a confusing exit code.
 */
export async function unrunnableCommands(root: string, config: ProjectConfig): Promise<Array<{ level: string; id: string; missing: string[] }>> {
  const supplied = await suppliedConfigKeys(root, config);
  const levels = ["unit", "integration", "system"] as const;
  return levels.flatMap((level) => config.verification[level]
    .filter((command) => (command.requires_config ?? []).some((key) => !supplied.has(key)))
    .map((command) => ({ level, id: command.id, missing: (command.requires_config ?? []).filter((key) => !supplied.has(key)).sort() })));
}
