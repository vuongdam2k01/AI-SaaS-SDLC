# Design Implementation Protocol

A screen segment turns `SCR-*` truth into a working surface. The failure mode it exists to prevent is the screen that "looks done": rendered, styled, and unaccountable to the fields, states and rules the documents own. Everything here derives from artifacts that already exist — this protocol adds no new artifact type and no gate.

## 1. The screen brief — assembled before code, authoritative over taste

Before implementing an `SCR-*`, assemble its brief in the turn from the owned sources, and treat it the way an API segment treats `openapi.yaml` — the file-mediated contract that outranks any verbal description or aesthetic instinct:

| Brief section | Owned by |
|---|---|
| Regions, fields, actions, validation and empty/loading/error states | The `SCR-*` artifact's own tables |
| Screen-to-screen transitions | The owning `TRANSITIONS-*`/`screen-transitions.mmd` graph |
| Interaction, feedback, accessibility and content rules in scope | `UX-RULES` rows the screen names |
| Design tokens (palette, spacing, typography, state colors) | The `## Design tokens` section of `UX-RULES`, when the product declares them |
| User-safe error strings and recovery semantics | `ERROR-CATALOG` rows the screen's actions can raise |
| Access-dependent visibility and denial behavior | `ACCESS-CONTROL` rows in scope |

A visual choice the brief does not constrain is the implementer's to make — once, consistently, and recorded in `UX-RULES` or the Design tokens section when it becomes a shared convention. A visual choice that contradicts the brief is not a choice; it is drift being born.

## 2. Countable self-review gate

Before the segment's spec-compliance review, the implemented screen passes a self-review of countable and binary checks only — no scored taste, no numeric self-approval, nothing a reviewer must "feel":

- every Region the `SCR-*` declares exists and is reachable;
- every declared empty, loading and error state is implemented and observable — a screen with data but no empty state is incomplete, not minimal;
- every action's denial behavior matches the `ACCESS-CONTROL` decision, and denied actions are handled, not hidden bugs;
- every user-facing error string is the `ERROR-CATALOG` user-safe message for its code, verbatim or via the catalog's owner — never an improvised string;
- interactive elements all have an accessible name; focus is visible on every one; keyboard reaches everything a pointer reaches;
- body-text contrast meets the `UX-RULES` accessibility rows (4.5:1 absent a stricter rule);
- the screen holds together at a narrow viewport (375px) without horizontal scroll of the page body;
- zero placeholder strings (`lorem`, `TODO`, `xxx`) in any rendered surface.

A failed check is fixed before review, or named in the closing report with its reason — silence is the only prohibited outcome.

## 3. Verification through the host, never through a mandate

Visual and interactive evidence is worth more than prose, and some hosts can produce it: a browser tool that renders the route, captures the screen per state, walks the keyboard order, or runs an accessibility audit. Follow the capability rule: enumerate what the host has installed, use what exists, and record in the closing report which states were observed and how. When no browser capability exists, the segment is still legal — the self-review gate and the executed `ST-*` specs carry it, and the surfaces nothing observed are named in `TEST-POLICY` as unobserved, exactly like a platform this machine cannot execute. Never instruct the author to install tooling, and never let a screenshot substitute for the executed system tests: pixels are supporting evidence, the engine's records are the proof.

## 4. Diagrams and structure

The transition graph (`screen-transitions.mmd`) is the navigation authority; a screen segment that adds or reroutes navigation changes the graph in the same flow — docs-first — and the code follows it. Component extraction follows the catalog rule that already exists: a `CMP-*` after a second real consumer, never speculatively for one screen.
