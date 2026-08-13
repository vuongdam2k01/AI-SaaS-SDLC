# Craft: Client Segments

Mechanics for client-side work beyond the screen brief — state, data flow, rendering cost. `design-implementation.md` owns what the surface shows; this protocol owns how it behaves under the hood. Framework-agnostic: the rules survive any component model.

## State ownership — three tiers, never blurred

- **Server state** belongs to the query/cache layer: fetching, mutation, invalidation, synchronization. Components never call the HTTP client directly; a per-feature service layer owns endpoints.
- **UI state** (open/closed, selected tab, in-progress input) stays local to the component that owns the surface.
- **Global client state** is a minimal store for what the server does not own (theme, preferences) — putting server data in a global store creates a second, staler source of truth.
- Derive, don't duplicate: subscribe to the derived boolean, not the raw stream it comes from; read volatile values (URL, storage) at the point of use instead of subscribing render-wide; update state functionally from previous state to kill stale-closure bugs.

## Data fetching — cache as contract, waterfalls as the enemy

- The query key hierarchy IS the cache contract: entity-first, IDs for specificity, consistent app-wide; invalidation targets the narrowest prefix covering the change; mutations invalidate on success.
- Explicit cache tiers, never implicit defaults: staleness and collection windows set per data volatility, refetch triggers chosen deliberately.
- Sequential awaits are the number-one performance defect: run independent requests concurrently, start work at its earliest possible moment, move awaits into the branch that uses them, and stream the shell before the data when the platform allows.
- Deduplicate: identical concurrent requests collapse at the library level; N component instances share one global listener; in-flight work aborts on unmount.
- Minimize what crosses the server→client boundary — every serialized field is payload; send what the client uses.

## Rendering cost

- Memoize expensive computation, handlers passed down, and expensive children; depend on primitives, not objects; stable list keys; debounce high-frequency input (~300–500ms); mark non-urgent updates as transitions.
- Bundle hygiene: no barrel-file imports on hot paths; lazy-load heavy features (editors, charts, grids); third-party analytics load after interactivity; preload on intent.
- Effects clean up what they start — listeners, timers, in-flight requests — every time.

## Loading and error discipline

- Layout never jumps: no early-return spinners that swap layout, no loading branches of different heights. Ranked alternatives: a boundary that holds the frame while data resolves; an overlay preserving layout; a skeleton occupying the same box. Multiple boundaries so one slow region doesn't hold the page hostage.
- Two error channels, one voice: a boundary for render-time failures (with a visible reset action), the mutation error path for action failures — both speaking through the **single** app-wide notification mechanism, with strings owned per `content-implementation.md`. Competing toast systems are a defect.
- Forms: one schema is the single validation truth, shared with the server-side contract; react to specific fields, not whole-form subscriptions. Conditional rendering guards falsy-but-renderable values (`0`) with explicit ternaries.
