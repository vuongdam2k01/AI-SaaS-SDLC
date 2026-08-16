# Phase 1 — Visual system as a committable artifact

Status: complete (released as 1.21.0)

Two assumptions in the original draft were corrected against the engine during implementation: `min_rows: 0` was rejected by `normalizeTable` (`pattern-catalog.ts` required `>= 1`), so the normalizer was relaxed to accept zero minimums rather than omitting the table from the contract; and a completed narrative row ("Not yet committed") passes `completedRow()`, so the commitment predicate is the `DT-NN` identifier in the Token column, not row presence. The heading joined `required_headings` safely because the template ships the section with a table header, which `meaningful()` counts as content.

## Outcome

A product can commit to a visual system, and a repository with live screens and no such commitment says so. Today neither is true: there is nowhere to record the commitment under contract, and nothing notices its absence.

## The defect, exactly

`resources/artifact-patterns/catalog.yaml:353` defines the `ux_rules` foundation contract:

```yaml
required_headings: [Authority boundary, Interaction rules, Feedback and error behavior, Accessibility rules, Content rules, Completion contract]
```

`Design tokens` is not in that list. The section exists in `resources/project-template/03-design/ux-rules.md:50` but no contract covers it — it could be deleted entirely and validation would report nothing. The template comment at line 54 then makes the emptiness explicit and blames a flow that does not exist:

> Optional until the product commits to a visual system; filled by the flow that makes that commitment.

Grepping the plugin for that flow returns two files and no playbook. `sayitalive` therefore closed genesis and six evolutions with the table holding one row reading "Not yet committed", every completion box checked.

## Changes

### 1. Put the section under contract

`resources/artifact-patterns/catalog.yaml` — add `Design tokens` to `required_headings` for `ux_rules`, and add the table to `required_tables` with columns `[Token, Value, Applies to, Accessibility note]`. Set `min_rows: 0` so the contract governs the shape without forcing a premature commitment; absence is then reported by the finding below rather than by a blocking contract failure, which keeps a pre-screen repository legal.

Add a `design_token` local-ID namespace with `minimum: 0` so tokens become citable identifiers a screen can reference, in line with generation 5's rule that every normative block is an identified table.

### 2. Replace the dangling pointer

`resources/project-template/03-design/ux-rules.md:54` — rewrite the comment. It currently names a nonexistent flow and, sitting beside "Screens may not invent diverging semantic values meanwhile", reads as a prohibition on styling anything. Replacement states: the commitment is made in Product Evolution like any other product commitment; until it is made, a live screen leaves the repository reporting `DESIGN_TOKENS_UNCOMMITTED`, and the implementer's latitude is the one `design-implementation.md:18` already grants.

### 3. Resolve the contradiction

`resources/protocols/design-implementation.md:18` grants the implementer any visual choice the brief does not constrain, "once, consistently, and recorded". The ux-rules line forbids screens inventing diverging semantic values. Both are defensible; together they read as a stop. Rewrite so the boundary is explicit: an implementer may choose what no token governs and must record it back into the token table when it becomes shared; an implementer may never restate a value the table already owns with a different value.

### 4. Make screens consume tokens

`resources/artifact-patterns/design/screen.pattern.md` and `shared-component.pattern.md` — state that a screen or component cites tokens by ID and never restates a diverging value, mirroring how they already cite `UX-*` rather than duplicating shared rules.

### 5. Ask at genesis

`resources/flow-playbooks/genesis.md` §8 lists the material choices resolved in the single consolidated interaction: segment, problem boundary, opportunity, commercial direction, product promise, access model, quality and invariants. Visual identity is absent, so an owner is never given the chance to answer. Add it, scoped: not a palette chosen in the abstract, but whether the product has a visual commitment the owner wants to make now or explicitly defers to Evolution — a deferral being legal only as a `QST-*` row, per Phase 2.

Genesis §9 continues to create no screens, so no tokens are required at genesis; what changes is that silence stops being an option.

### 6. Report the absence

New engine finding `DESIGN_TOKENS_UNCOMMITTED`: a repository with at least one live `SCR-*` and an empty Design tokens table, and no open question naming the commitment. Standing warning, never blocks a baseline — the `PLATFORM_EVIDENCE_MISSING` shape, for the same reason: a commitment this repository has not made yet belongs in the evidence layer, not in a `draft` artifact that would block its own change's baseline.

## Verification

- A fresh genesis with no screens validates clean with an empty token table.
- Adding the first `SCR-*` without tokens and without a question raises exactly one new warning and no baseline failure.
- A screen citing a token ID absent from the table is reported.
- `sayitalive` after `patterns migrate` raises `DESIGN_TOKENS_UNCOMMITTED` and reports the four screens it covers.

## Out of scope

Choosing any actual palette, type scale or spacing values, here or in the template. The plugin defines where a commitment lives and when its absence is reported; the commitment itself is the product's.
