# Craft: Test Segments

Judgment for `ut`/`it`/`st` segments — deriving real test code from the specification tables. Testing levels remain exactly UT, IT and ST; everything here is distribution and discipline *within* them, never a new level. The spec rows are the source; a test asserting what no row states is an EXTRA finding, and a row no test implements stays visible as unimplemented.

## Distribution judgment

- The classic distribution (≈70% unit / 20% integration / 10% system) fits logic-heavy backends: units are fast and isolate causes, integrations prove boundaries, system tests are expensive and reserved for journeys.
- UI-centric products invert toward integration-heavy (≈30/50/10): "the more tests resemble how the software is used, the more confidence they give." Service-mesh products weight contract viewpoints inside IT (boundary schemas proven on both sides).
- Distribution is a judgment the TEST-POLICY records, not a per-segment improvisation. Coverage is a diagnostic, not a target: critical paths (auth, payment, data integrity) at 100%, overall reference 75–85% — and the interesting number is always what is *uncovered*.

## What each level asserts — and must not

- **UT** asserts observable outcomes of one boundary: returns, thrown typed errors, persisted/emitted effects — never internals ("state.isOpen" is the anti-pattern; the visible dialog is the assertion). AAA shape, behavior-descriptive names taken from the spec row, edge cases from the row's reference IDs (empty, null, boundary, duplicate, invalid).
- **IT** owns real collaborators: actual persistence (migrate once, clean between tests), actual provider stubs at the network edge, contract viewpoints where two components must agree. Reference speed budgets: unit in milliseconds, integration under ~100ms each — slow tests stop being run.
- **ST** asserts the actor's journey: rendered outcomes, URL transitions, denial behavior — through accessibility-first selectors (role, label, text; test-IDs last), which keeps the suite honest about what a user can actually reach. Authentication is established once per worker by API, not re-driven through the UI per test.

## Determinism — the non-negotiables

- No sleeps: wait on conditions or rely on the framework's auto-wait against role-based locators. Reference budgets: element visibility 5–10s, page load 10–15s, external responses 30–60s.
- Tests are order-independent and share no state; a test consuming another's leftovers is the defect (`implementation-debugging.md` owns the polluter bisection when it happens anyway).
- Animations disabled globally under test; dynamic content (clocks, random data) pinned; external networks stubbed at the route level.
- Flakiness is detected by repetition, not observation; CI retries are containment and never the fix — a flaky test is repaired or quarantined with its `ISS-*`, never ignored.

## Visual and accessibility viewpoints

- Visual regression, when the host tooling exists: explicit tolerances, baselines valid only under pinned viewport/animation/data conditions, diffs reviewed and baselines updated **only** for intentional change — an approved-without-review baseline is drift with a green checkmark.
- Automated accessibility passes (axe-class, WCAG-AA) complement — never replace — the design gate's manual checks (full keyboard walk, focus order, escape paths); visual diffs miss semantics, semantic audits miss layout: run the viewpoint the segment's risk calls for.
- Both are viewpoints inside UT/IT/ST evidence, recorded like any execution; what could not be observed on this machine is named in `TEST-POLICY`.

## Data

Factories with overrides and seeded generators over hand-built fixtures — reproducible, association-aware, and honest about which fields matter to the case.
