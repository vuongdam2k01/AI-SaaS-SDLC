# Security Policy

Report vulnerabilities privately through the repository's GitHub security advisory interface.

The plugin executes only verification commands explicitly declared in a consuming repository. Review those commands before invoking `verify --execute`. Hooks and skills run with the permissions granted to Claude Code; install only from a trusted source.

Generated projections, accepted decisions, raw input, execution results and `.ai-saas-sdlc/` records are engine-owned. The engine rejects path traversal and managed directories redirected outside the documentation repository. Do not disable the bundled hooks and then hand-edit these records; validation treats their provenance as part of the baseline contract.

The shell hook blocks recognizable direct and inline-script mutation of managed paths, but a hook is not an operating-system sandbox. A deliberately obfuscated or external program can evade command-text inspection. Keep repository permissions limited to trusted users and treat structural validation plus Git review as the authoritative integrity checks.
