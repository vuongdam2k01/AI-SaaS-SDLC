# Contributor Rules

- Follow YAGNI, KISS and DRY.
- Prefer small focused TypeScript modules and kebab-case file names.
- Preserve user changes and never commit secrets.
- Treat artifact patterns as public contracts; changing a required section requires tests and a changelog entry.
- Keep host adapters thin and keep shared domain truth under `resources/`.
- A code change is complete only after `npm run check`, strict Claude validation and Codex plugin/skill validation pass.
- Do not create model-generated evidence, fake test results or automatic semantic review loops.
