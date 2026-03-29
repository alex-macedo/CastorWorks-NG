---
phase: "07-ai-action-credits-metering"
plan: "01"
subsystem: "database/testing"
tags: ["ai-metering", "migration", "rls", "rpc", "test-scaffold", "wave-0"]
dependency_graph:
  requires: []
  provides:
    - "ai_usage_log table with RLS"
    - "consume_ai_actions Postgres RPC"
    - "add_ai_credits Postgres RPC"
    - "ai_monthly_credits column on subscription_tiers"
    - "ai_credits_purchased column on tenants"
    - "Wave 0 test scaffolds for useAIUsage, AIUsagePage, ai-metering"
  affects:
    - "Plans 02–04 (EF wiring, frontend, Stripe action packs)"
tech_stack:
  added: []
  patterns:
    - "SECURITY DEFINER RPC with FOR UPDATE lock for atomic credit debit"
    - "Silent degradation: allowed always true, degraded flag for model routing"
    - "Wave 0 TDD scaffolds (RED state until implementation plans)"
key_files:
  created:
    - "supabase/migrations/20260307000000_ai_usage_log_and_credits.sql"
    - "src/hooks/__tests__/useAIUsage.test.ts"
    - "src/components/Settings/__tests__/AIUsagePage.test.tsx"
    - "supabase/functions/__tests__/ai-metering.test.ts"
  modified: []
decisions:
  - "allowed is always true — 100% credit exhaustion silently degrades to cheapest model, never blocks the user (per CONTEXT.md locked decision)"
  - "Enterprise tier bypasses all budget checks in consume_ai_actions; returns remaining=999999"
  - "Monthly budget resets each calendar month via date_trunc('month', NOW()); purchased credits persist indefinitely"
  - "FOR UPDATE lock on tenants row prevents concurrent credit race conditions"
  - "Deno test scaffold uses _stubResult parameter pattern consistent with TEST_MODE=stub in analyze-site-photos.test.ts"
metrics:
  duration: "3 minutes"
  completed_date: "2026-03-28"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 0
---

# Phase 07 Plan 01: Database Foundation & Wave 0 Test Scaffolds Summary

Database migration delivering the complete AI metering schema (ai_usage_log table, atomic consume_ai_actions and add_ai_credits RPCs, credit columns) plus three Wave 0 test scaffolds defining expected behavior before implementation.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Database migration — ai_usage_log, schema columns, atomic RPCs | e8ba7da | `supabase/migrations/20260307000000_ai_usage_log_and_credits.sql` |
| 2 | Wave 0 test scaffolds — useAIUsage, AIUsagePage, ai-metering Deno | 0f8b08a | `src/hooks/__tests__/useAIUsage.test.ts`, `src/components/Settings/__tests__/AIUsagePage.test.tsx`, `supabase/functions/__tests__/ai-metering.test.ts` |

## What Was Built

### Migration: `20260307000000_ai_usage_log_and_credits.sql`

Complete database foundation for Phase 7 AI metering in a single migration:

- **`public.ai_usage_log` table** — captures every AI action with `tenant_id`, `user_id`, `feature`, `actions_consumed`, `model_used`, `actual_tokens_in/out`, `actual_cost_brl`, `cached`, `created_at`
- **RLS enabled** — `ai_usage_log_select_tenant` policy allows authenticated users to read their own tenant's log via `has_tenant_access()`; inserts are service_role only via SECURITY DEFINER RPC
- **Two indexes** — `(tenant_id, created_at DESC)` for monthly aggregation queries, `(feature)` for feature breakdown queries
- **`subscription_tiers.ai_monthly_credits` column** — seeded with locked budgets: trial=100, sandbox=0, architect_office=0, architect_office_ai=500, construction=0, construction_ai=2000, enterprise=NULL (unlimited)
- **`tenants.ai_credits_purchased` column** — INT NOT NULL DEFAULT 0; stacks on top of monthly budget; never expires
- **`add_ai_credits` RPC** — atomically increments `ai_credits_purchased` for a tenant
- **`consume_ai_actions` RPC** — uses `FOR UPDATE` lock to prevent race conditions; always returns `allowed: true`; sets `degraded: true` when `v_remaining <= 0`; enterprise tier bypasses budget checks entirely returning `remaining: 999999`

### Wave 0 Test Scaffolds (RED state — expected)

Three files defining expected behavior before source code exists:

- **`useAIUsage.test.ts`** — AI-01 (log structure, feature breakdown top-5), AI-02 (effectiveBudget = tier + purchased, enterprise = null/Infinity), AI-03 (consumeAIActions degraded flag)
- **`AIUsagePage.test.tsx`** — AI-04 (progress bar "X / Y AI Actions", 80% badge, 100% inline nudge, enterprise no-degradation)
- **`ai-metering.test.ts`** — AI-04 (Deno, model routing: degraded=false → no preferredProvider, degraded=true → preferredProvider='openrouter')

All Vitest tests fail with module-not-found errors (correct RED state — sources created in Plans 02–03).

## Verification

- Migration file: all required patterns present (consume_ai_actions, add_ai_credits, ai_usage_log, ai_monthly_credits, ai_credits_purchased, RLS, FOR UPDATE)
- `npm run test:run` on Vitest scaffolds: 2 files failed with import errors (expected RED — not syntax errors)
- Deno test file: syntactically valid, consistent with analyze-site-photos.test.ts pattern

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Files Created

- [x] `supabase/migrations/20260307000000_ai_usage_log_and_credits.sql` — FOUND
- [x] `src/hooks/__tests__/useAIUsage.test.ts` — FOUND
- [x] `src/components/Settings/__tests__/AIUsagePage.test.tsx` — FOUND
- [x] `supabase/functions/__tests__/ai-metering.test.ts` — FOUND

### Commits

- [x] e8ba7da — feat(07-01): database migration for AI metering
- [x] 0f8b08a — test(07-01): Wave 0 test scaffolds

## Self-Check: PASSED
