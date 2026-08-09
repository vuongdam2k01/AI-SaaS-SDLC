# Code Standards

- Use TypeScript strict mode and Node.js 22 APIs.
- Keep CLI and hook modules as external-I/O adapters; place reusable deterministic behavior under `src/core/`.
- Keep Claude and Codex skills thin. Shared domain method belongs under `resources/flow-playbooks/`, `resources/protocols/` and `resources/artifact-patterns/`.
- Treat pattern catalog entries, canonical paths, required headings/tables/local IDs and artifact lifecycle as public contracts. Contract changes require matching tests, migration consideration and a changelog entry.
- Normalize line endings and sort generated collections so projections are reproducible byte-for-byte.
- Validate and contain every path before reads, writes or command execution; account for symlinks/junctions and use atomic internal-state writes.
- Serialize mutating engine operations with the project lock and reserve temporal/execution IDs before use.
- Never create model-authored evidence, execution results, semantic pass claims or automatic prose-review loops.
- Preserve UT, IT and ST as the only test levels; express security, privacy, performance, accessibility and AI behavior as viewpoints within them.
- Prefer small focused kebab-case modules, composition and standard-library code. Split code near the repository's 200-line guidance when a clear concern boundary exists.
- Tests cover success, malformed input, path safety, idempotency, lifecycle, content contracts, dual-host packaging and failure behavior. Do not weaken assertions to hide failures.
- A release change is complete only after `npm run check`, strict Claude plugin/marketplace validation and Codex manifest/skill validation pass.
