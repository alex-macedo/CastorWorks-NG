# CastorWorks AI Chat Assistant — NL Data Tasks

This document is the canonical repo-side reference for the Super Bot / CastorMind roadmap items that were seeded from a missing notes file in `supabase/migrations/20260214_superbot_sprint_2026_07_seed.sql`.

It exists to keep roadmap execution grounded in code and verification evidence instead of stale roadmap metadata.

## Scope

This note covers the current high-signal roadmap items tied to natural-language data operations and their supporting automation:

- `Retry worker execution`
- `Tool: update project tasks until today`
- `Guardrails for bulk mutation`
- `LogSearch integration logging`
- `P2a.3: Cron Job - Nightly Forecast Updates`

## Source of truth

When these items are triaged or closed, use the following precedence order:

1. Live `roadmap_items` data for title/status/ownership.
2. Repository implementation and tests.
3. Live database evidence for cron, queue, and log behavior.
4. This document for operator context.

Do **not** treat old roadmap notes as authoritative if the code or production state says otherwise.

## Current code review snapshot (2026-03-29)

### 1) Retry worker execution

**Current state:** incomplete.

- `supabase/functions/process-super-bot-retry-queue/index.ts` fetches queued jobs, increments attempts, and logs retry lifecycle events.
- The worker currently treats any known retryable intent as a success without replaying the underlying business operation.
- This means queue jobs can be marked `succeeded` even when no real recovery work happened.

**Why it matters:** this is the only item in the group that clearly still requires functional code work before it should be marked done.

**Minimum completion bar:**

- Replay the business action for retryable intents (starting with `update_tasks_until_today`).
- Keep backoff, retry counts, and exhaustion semantics intact.
- Add regression coverage for success, retry, and exhaustion paths.

### 2) Tool: update project tasks until today

**Current state:** implemented; verify before patching.

Key implementation points already exist in `supabase/functions/super-bot-assistant/index.ts`:

- intent detection for `update_tasks_until_today`
- permission checks and role gating
- project resolution
- candidate task selection
- bulk update behavior
- response summary generation

Supporting client typing exists in `src/lib/ai/client.ts`.

**What to verify before closing:**

- project lookup behavior
- task filtering up to today
- completed status assignment
- response summary shape
- non-admin denial path

### 3) Guardrails for bulk mutation

**Current state:** implemented; verify exact behavior before patching.

Observed safeguards in `supabase/functions/super-bot-assistant/index.ts`:

- a bulk limit of `100`
- support for `forceUpdate`
- support for an exact `overridePhrase`
- localized guardrail responses

**What to verify before closing:**

- `101` affected records without override must block
- `101` with `forceUpdate=true` and the exact phrase must proceed
- wrong phrase must still block
- guardrail blocks should be logged

### 4) LogSearch integration logging

**Current state:** largely implemented; verify observability quality before patching.

Observed signals:

- `supabase/functions/super-bot-assistant/index.ts` already emits `log_message` RPC events for intent detection, tool lifecycle, permission blocks, queue events, mutations, and errors.
- `src/components/Settings/LogSearchPanel.tsx` already reads from `log_messages`.
- `supabase/migrations/20260201000000_enhance_log_messages.sql` adds category/component/context fields needed for filtering and triage.

**What to verify before closing:**

- Super Bot logs are discoverable in the LogSearch UI
- emitted metadata is specific enough to debug the action path
- any missing context fields are treated as a focused observability fix, not a rewrite

### 5) P2a.3: Cron Job - Nightly Forecast Updates

**Current state:** repo implementation exists; production evidence still required when closing.

Observed repo support:

- `supabase/migrations/20260208_configure_cashflow_cron_final.sql` enables the nightly forecast schedule and verification queries.
- the migration schedules `nightly-cashflow-forecast`.

**What to verify before closing:**

- `cron.job` contains `nightly-cashflow-forecast`
- schedule is active on the intended cadence
- optional: `cron.job_run_details` confirms recent successful execution

## Automation quality notes

These are the main workflow issues that affect current-sprint execution quality:

### Sprint selection is currently nondeterministic

Two places still pick "an open sprint" without ordering the result to the newest open sprint:

- `src/hooks/useSprints.ts` (`useOpenSprint`)
- `scripts/ai-task-runner.sh`

If multiple sprints are open, UI and automation can resolve different sprints.

### The roadmap runner is not sprint-scoped yet

`scripts/ai-task-runner.sh` currently pulls all `in_progress` items and all `backlog` items globally.

That is unsafe for "current sprint only" execution because it can act on unrelated open-sprint backlog.

### The existing shell runner is lifecycle-capable but not Codex-native

- `scripts/ai-task-runner.sh` already handles status transitions, comments, and execution flow.
- `scripts/task-runner-invoke-agent.sh` still routes to external CLIs instead of Codex-native subagents.

Prefer keeping the runner focused on lifecycle/status work and using Codex-native execution lanes for bounded implementation tasks.

## Recommended closeout order

1. Fix sprint-resolution and sprint-scoping bugs in the UI/runner before autonomous execution.
2. Verify already-implemented items (`update project tasks until today`, `bulk mutation guardrails`, `LogSearch integration logging`, `nightly forecast cron`) and close them with evidence if they pass.
3. Implement the retry-worker replay gap last, because it is the only clearly incomplete item in code.

## Verification checklist for roadmap completion

Every roadmap item in this group should carry evidence for:

- `npm run lint`
- targeted tests for the touched area
- remote verification when cron/queue/logging behavior is involved
- branch/commit evidence attached back to the roadmap item comment

For DB-backed checks, prefer direct evidence from:

- `cron.job`
- `cron.job_run_details`
- `log_messages`
- `castormind_retry_queue`

## Documentation maintenance rule

If roadmap seeds, migration comments, or DB notes reference a doc under `docs/plans/`, keep that file present and update it when the implementation truth changes.
