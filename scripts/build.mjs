import { build } from "esbuild";
import { chmod, mkdir, rm } from "node:fs/promises";

const esmRequireBanner = "import { createRequire as __createRequire } from 'node:module';const require=__createRequire(import.meta.url);";

await rm("dist", { recursive: true, force: true });
await mkdir("dist/hooks", { recursive: true });
await mkdir("bin", { recursive: true });

await build({
  entryPoints: ["src/cli/main.ts"],
  outfile: "bin/ai-saas-sdlc",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  banner: { js: `#!/usr/bin/env node\n${esmRequireBanner}` },
  sourcemap: false
});

for (const name of ["session-start", "pre-tool-use", "stop"]) {
  await build({
    entryPoints: [`src/hooks/${name}.ts`],
    outfile: `dist/hooks/${name}.mjs`,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    banner: { js: esmRequireBanner },
    sourcemap: false
  });
}

await chmod("bin/ai-saas-sdlc", 0o755);
