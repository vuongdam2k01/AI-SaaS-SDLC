# Content Implementation Protocol

Screens define structure; this protocol authors the strings that live in it. Microcopy is the half of a shippable surface the documents deliberately do not spell out word-for-word — and the half most often filled with placeholder English that ships. The rules here bind every authored string to the artifact that owns its meaning, so content stays implementable, reviewable and honest.

## Ownership before wording

| String kind | Meaning owned by | This protocol's job |
|---|---|---|
| Error and denial messages | `ERROR-CATALOG` (user-safe message, recovery, next action) | Render the owned meaning; never invent a competing explanation |
| Labels, actions, object names | `GLOSSARY` terms and the `SCR-*` field/action tables | Use the glossary's term, not a synonym per screen |
| Instructional and helper text | `UX-RULES` content rules | State what is required before the action, not after failure |
| Empty, loading and success states | The `SCR-*` state rows | Say what the state means and what the user can do next |
| Marketing and landing surfaces | `PRODUCT-REQUIREMENTS` promise + positioning artifacts in `01-discovery` | Claims trace to documented promises; no invented benefit |

## Writing rules

- **Empty states sell the next action, not the absence.** "No approval requests yet — share your request link to receive the first one" beats "No data". Every empty state names the action that fills it when one exists.
- **Error strings are the catalog's, verbatim.** The condition, the user-safe message and the valid next action come from the `ERROR-CATALOG` row; the screen may prepend context ("This request was already decided") but never contradict or out-explain the catalog.
- **Buttons name the action's object** ("Approve request", "Revoke link") — glossary noun plus decisive verb; never bare "Submit"/"OK" where the action has a name.
- **Instructions precede requirements.** A constraint the user must satisfy is stated where they act, not revealed by the failure message afterwards.
- **Numbers, dates and money follow the UX-RULES formats** — no ambiguous abbreviations, no locale guessing beyond what the rules state.
- **Confirmation asks with the consequence, not with ceremony.** A destructive action's confirmation names what is destroyed and what survives, per the interaction rules.
- **Conversion surfaces argue from documented evidence.** A landing or upgrade surface's headline states the documented promise, the supporting line states how, the call to action names the action — and any claim ("saves X", "trusted by Y") must trace to an evidence or requirement artifact or it does not ship.

## Discipline

Strings are code: they land in the same segment diff, pass the same spec-compliance review (a message the catalog owns is graded against the catalog row), and placeholder text anywhere in a rendered surface fails the design self-review gate. A wording convention worth keeping — tone, person, capitalization — is recorded once in `UX-RULES` content rules, not re-decided per screen; a wording decision that changes documented meaning routes to the flow that owns the document.
