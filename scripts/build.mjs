import { build } from "esbuild";
import { chmod, cp, mkdir, rm } from "node:fs/promises";

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

// The docs-site generator vendors Mermaid into generated sites so `.mmd`
// contracts and mermaid fences render as diagrams while the site stays fully
// offline. The asset ships inside dist/ next to the bundles.
await mkdir("dist/assets", { recursive: true });
await cp("node_modules/mermaid/dist/mermaid.min.js", "dist/assets/mermaid.min.js");
