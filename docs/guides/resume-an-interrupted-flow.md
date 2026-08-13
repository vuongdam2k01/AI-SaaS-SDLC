# Resume an interrupted flow

**When to use this:** a flow is open and you are not sure what it was doing — you stopped it deliberately with `--until`, the session ended mid-segment, the context was compacted, or you opened a fresh session tomorrow morning and the banner says a flow is active. Nothing is lost, and you do not have to reconstruct anything from memory.

**The one command:**

```text
/ai-saas-sdlc:inspect-state
```

It reads the open flow and prints the exact command that continues it. If you already know the flow is yours to continue, run the engine's own `flow next` and copy what it prints.

## The session banner already told you

Every session in a documentation repository opens with a one-line summary the plugin injects — after a resume, a `/clear`, and after the context is compacted mid-work. For an open implementation segment it reads:

```text
AI SaaS SDLC repository detected. Active product baseline: BL-002. Evidence revision: EVR-001.
Active flow: evolution (intent implementation) (FLOW-004, CHG-003); reached none, target behavior.
Resume: /ai-saas-sdlc:implement FTR-APPROVAL-001 code --until behavior continue FLOW-004
```

That `Resume:` line is authoritative — it carries the feature and the segment recovered from the flow's own recorded input, plus the flow ID. Copy it. When a flow has already produced its baseline the line disappears, because the honest next step is `flow close`, not another pass over delivered code.

## What survives an interruption, and what does not

Reconstruct from files. Never from recall.

| Survives, in files | Where |
|---|---|
| The feature and segment as invoked | `state --json` → the flow's verbatim `input` |
| How far the flow got | the flow's `reached_stage` and `target_stage` |
| Mappings already made | `implementation:` frontmatter on the artifacts you edited |
| What actually ran | `EXEC-*` / `RESULT-*` records — including failures, kept as history |
| The dashboards | `generated/…` after one `refresh` |

Turn-local reasoning does **not** survive, by design: the scouting outputs, the PASS/MISSING/EXTRA compliance table, the review-cycle count and the repair-attempt count. A resumed segment re-derives them from the current tree rather than trusting a memory of them, and a count that cannot be re-derived restarts at zero.

## Doing it by hand

1. `ENGINE state --json` — read `active_flow`: its `type`, `intent`, `input`, `reached_stage`, `target_stage`.
2. `ENGINE flow next --json` — the exact `next_command` plus the reason it is next.
3. Run that command. For an implementation segment it looks like `/ai-saas-sdlc:implement FTR-007 ut --until baseline continue FLOW-009`; the `continue FLOW-*` trailer resumes the open flow instead of starting a second one.
4. If `flow next` says `ENGINE baseline create` or `ENGINE flow close`, the work is done — finish the flow rather than reopening the segment.

If the flow's recorded input never named a feature and segment in the form `implement <FTR-ID>, segment <segment>`, the continuation comes back with `<FTR-ID> <segment>` placeholders and a reason saying so; fill both in from `state --json` before running it.

## The flow you want to abandon

Closing a flow that produced no baseline cancels it: the engine restores both trees byte-exact to where the flow started and refuses a half-revert. That is the sanctioned exit — there is no "delete the flow file" step, and editing engine state by hand is blocked.

```text
ENGINE flow close
```

## A different flow is open and it is not yours to continue

The repository holds exactly one flow at a time, so a second `flow start` is refused with a message naming the open one. That refusal is the feature: it stops two people, or two sessions, from writing conflicting history into the same baseline. Finish or cancel the open flow first — `flow next` tells you which of the two it is.

## How to check it worked

- `ENGINE state --json` shows the flow you expected, at the stage you expected.
- After you continue and close it, `ENGINE flow next` no longer names an active flow and offers the next segment instead.
- `ENGINE refresh --check` reports `synchronized: true`, so the projections match the artifacts again.
