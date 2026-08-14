# Test Case Derivation Protocol

`test-derivation.md` answers *which specification holds a rule*. This protocol answers the question that follows it: **given one specification, which cases does it contain, and how do you know when it has them all.**

Nothing here adds a level, a gate or an artifact type. Testing remains exactly UT, IT and ST. What it adds is the derivation a specification is built by, so two authors reading the same design produce the same case set — and so a missing case is a fact the engine can name rather than a difference of thoroughness.

## Why this exists

Without a derivation rule, case count tracks the author rather than the object. The same screen yields six cases from one author and fifty from another, and neither number is checkable, because nothing says what the right number would have been. Worse, the difference is invisible: a specification with too few cases looks exactly like a specification for a simpler screen.

The fix is not a target count. It is a **traversal**: every case is derived from an identified row in an owned document, and every owned row reaches a case, an exclusion, or a question. Then the count is whatever the traversal produces, and the engine can check the traversal instead of the number.

## The three destinations

Every declared behavior a specification touches ends at exactly one of:

| Destination | When | Where it goes |
|---|---|---|
| **Case** | This level can observe the behavior being wrong | A `TC-*` row in this specification |
| **Exclusion** | The behavior is real but this level's boundary is controlled away | An `EX-*` row naming the receiving `IT-*`/`ST-*` |
| **Question** | The design does not define the correct result | A `QST-*` row in `QUESTIONS`, referencing the behavior in qualified form |

A behavior reaching none of the three is the failure this protocol exists to prevent, and it is the one failure that is silent: nothing is written anywhere, so nothing reads as missing. `ENGINE validate` reports `SCREEN_BEHAVIOR_UNCLAIMED`, `ACCESS_UNVERIFIED`, `INVARIANT_UNVERIFIED`, `ERROR_UNVERIFIED` and `UX_UNVERIFIED` for exactly this state; `generated/screen-coverage.md` and `generated/foundation-coverage.md` show it per identifier. Read them after deriving.

**Never invent the correct result.** A screen that shows a message no document defines is a question, not a case with a guessed string. A specification with many cases and no questions, written against a design with gaps, has hidden every gap it found.

## Detail level: write the constraint, not the value

The consumer of a specification is the person or session writing the test code, and they have the interface files open while they work. So:

1. **Do they need it to write the test?** No → omit.
2. **Can they read it from a file they already have open?** Yes → omit. A path, a parameter name, a status code, a response field belongs to `openapi.yaml`; copying it here creates a second copy that will drift.
3. **If they derive it themselves, will everyone derive the same thing?** No → state the **constraint**, not the value.

That third answer is what makes a specification durable. "A record whose name exceeds the column width" survives every fixture change; "a record named `Wolfeschlegelsteinhausenbergerdorff`" is a value that rots into a competing authority. State the shape the data must have and let the implementer choose the instance.

What a specification does own, because no interface file holds it: **which** operation is called, **under what condition**, **how many times**, and **what must not happen**.

## Deriving a frontend unit specification

The classifier is **"what must be constructed to observe this?"** — not what kind of thing it is. Two messages sitting in the same table of the same document belong to different groups when one appears by opening the screen with an empty response and the other requires typing, clicking twice, and a server rejection. Group by construction, and the sources follow.

| Group | Constructed by | Read from |
|---|---|---|
| 1. Initial render | Responses stubbed, screen opened, no interaction | `SCR-*` Regions, Fields |
| 2. Shared components mounted | Nothing extra — inspect the frame around the screen | `CMP-*` consumers table |
| 3. Role-conditional surface | Swapping the authenticated subject | `ACCESS-CONTROL` rows the screen names |
| 4. Loading and failure of load | Hanging or failing a load response | `SCR-*` Regions empty/loading column |
| 5. Display transformation | Data of a deliberately awkward **shape** | `SCR-*` Fields format column |
| 6. Client-only logic | Typing or clicking, no request | `SCR-*` Validation rows evaluated before send |
| 7. Interaction with a request | Acting **and** stubbing the response | `SCR-*` Actions × `ERROR-CATALOG` × `openapi.yaml` |

Group 7 is normally the majority. Groups 2 and 3 are the ones authors most often produce zero of — not because they are absent, but because the screen document does not mention them; they live in the component and access documents. A group that is genuinely empty is worth one line saying so.

### Expanding one action

An `E-*` row is one line to a designer and several situations to a verifier. Ask each question against the named column, and write `N/A — <reason>` rather than dropping one silently:

| Sub-case | Question | Column that answers it |
|---|---|---|
| Intermediate state | Is there a confirmation or in-flight state before the request? | Actions preconditions; `UX-RULES` feedback rows |
| Trigger paths | How many controls or keys reach this same action? | Actions trigger; Fields controls |
| Input partitions | How many input classes produce materially different success? | Actions preconditions; Validation rules |
| Client-side rejection | What is refused before sending — and is the request then truly not sent? | Validation timing column |
| Business failures | Which failures can the server return **for this action**? | Actions failure column ∩ `ERROR-CATALOG` |
| Repeat submission | What happens on a second activation? | `API-*` `TX-04`; `UX-RULES` |
| Cancellation | Is there an exit, and does it truly leave state untouched? | Actions, Transitions |
| Re-entry | Can the action be retried, and is a second request actually issued? | Transitions |

**Trigger paths × input partitions multiply** — they are independent dimensions of the same success path. Everything else **adds**.

The failure column is what binds an error to its action. The catalog lists every error the product can raise; only the action's own failure column says which of them this action can produce. Deriving from the catalog alone assigns errors to the wrong actions — a mistake that reads as thoroughness.

### Multiplying independent regions

When a screen loads several independent regions, their states multiply, and the all-empty combination is where two real defects live: one merged message replacing two, and an early return that never renders the second region. Before multiplying, pass both gates:

- **Independence**: check the owning interface file. If the second region's operation takes the first one's identifier as a parameter, they are sequential, not independent, and opening the screen exercises one axis, not two.
- **Real situation**: name the circumstance in which the combination actually occurs — "a workspace on its first day" is a situation; "both empty" alone is arithmetic.

A combination failing either gate is not written, and saying why in one line costs nothing.

### Subtracting display rules

A formatting rule earns its own case only when it needs a data **shape** the basic render case does not already have. Overflow needs an over-long value; a missing optional field needs an absent value; a date format needs nothing special and belongs as one assertion inside the render case. Without this subtraction the group inflates with cases that assert the same render path repeatedly.

### Roles do not multiply evenly

Role affects a specification at three different levels, and only one of them multiplies:

| Level | Effect on cases |
|---|---|
| Cannot reach the screen at all | No cases — an `EX-*` handoff to `ST-*`, where routing and permission are real |
| Reaches it, sees a reduced surface | **One** case, carrying the negative expectations below |
| Sees everything, but a narrower data scope | No cases — scope is enforced server-side; hand it to `IT-*` |

A role that sees a reduced surface needs three assertions, and the second is the one no document states:

1. the hidden elements do not render;
2. **the operation that supplies their data is not called** — a hidden surface whose request still fires has already delivered the data to the client;
3. any observation point in a shared component is hidden too.

Multiply cases evenly across roles only when all three hold: nothing is hidden from anyone, no content changes by role, and every role reaches the screen. Otherwise each role has its own, differently sized, list.

## Deriving the other families

The classifier changes with the object; the three destinations and the detail rule do not.

**Backend unit (`UT-API-*`, `UT-CORE-*`)** — traverse the `API-*` rows: each `V-*` validation, each `P-*` step whose rule can be broken, each `TX-*` concern (a rollback row is a case that fails mid-commit; a duplicate row is a case that calls twice), each `S-*` side effect including the ones that must *not* happen. Authorization rows produce a denial case at the lowest level that can observe the refusal, plus its unchanged-state assertion.

**Job unit (`UT-JOB-*`)** — traverse `P-*` and `F-*`, then every `CC-*` row: concurrency scope, conflict, idempotency retention, duplicate delivery, ordering. A `CC-*` row stating "not applicable" is a decision to record, not a case to write.

**Integration (`IT-*`)** — one specification per boundary, one case per contract obligation crossing it, and at least one case that makes the real boundary fail — the atomicity claim is only worth what a failed commit proves. Every `EX-*` handed here by a unit specification is answered by a case or reassigned onward with its reason. The state guarantee column is the case's other half: a response without a state assertion proves half the boundary.

**System (`ST-*`)** — one specification per actor journey. Cases follow the `UC-*` main path, then each alternate and error path to its terminal state, then the `FLOW-*` compensation paths. Role counting follows the same three-level rule as the frontend. What `ST-*` must not do is re-prove internal permutations already held below; what it uniquely proves is that the journey reaches its outcome at all.

## Completion

A specification is complete when every identifier the traversal visited reached a case, an exclusion or a question; when `generated/screen-coverage.md` and `generated/foundation-coverage.md` show no unclaimed row this specification owns; and when each case states an assertion precise enough to fail. It is not complete because it reached a count, and it is not incomplete because it is shorter than a sibling — a small object honestly traversed produces a small specification.

Re-enter only on a changed contract, a new dependency, an inspected implementation fact or a failing execution. Re-reading unchanged cases is not a trigger.
