# Sprint 2026-13 execution order design

## Goal

Define the exact coordinator ordering rules for executing the active Sprint `2026-13`
roadmap backlog so implementation can proceed without ambiguity.

## Context

The live sprint backlog contains items in both `next_up` and `in_progress`.
The runbook establishes `priority DESC NULLS LAST` as the primary ordering rule,
but the current active rows are all `medium` priority and do not have a usable
`position` value. That leaves execution order ambiguous unless a secondary rule is
explicitly chosen.

## Approved ordering rules

The coordinator must select the next roadmap item using the following order:

1. Only consider sprint `2026-13` items whose status is `in_progress` or `next_up`.
2. Treat `in_progress` items as higher priority than `next_up` items.
3. Within the same status bucket, select the oldest row by `created_at`.
4. If two rows are still tied after `created_at`, use the runbook wave order as the
   final tie-breaker.

## Execution model

- Work one roadmap item at a time.
- Finish the active item loop before opening a new large feature track.
- Prefer concrete `in_progress` fixes over starting `next_up` feature work.
- Do not batch items by theme if that would violate the ordering rules above.

## Operational implications

- The first item to execute is the oldest `in_progress` row in sprint `2026-13`.
- The coordinator should query `created_at` from the live database before selecting
  the first item.
- After an item is selected, the coordinator executes the existing runbook loop for
  that single item: scope, implement, verify, publish, and only then advance.

## Out of scope

- Reclassifying sprint statuses before execution
- Parallel implementation across multiple roadmap items
- Reordering the backlog for convenience
