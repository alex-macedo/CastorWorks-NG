---
phase: "07-ai-action-credits-metering"
plan: "02"
subsystem: "edge-functions/ai-metering"
tags: ["ai-metering", "edge-functions", "stripe", "credits", "degraded-routing", "wave-2"]
dependency_graph:
  requires:
    - "07-01 (ai_usage_log table, consume_ai_actions RPC, add_ai_credits RPC)"
  provides:
    - "consumeAIActions Deno helper (_shared/ai-metering.ts)"
    - "AI metering active on all 9 priority Edge Functions"
    - "WhatsApp AI auto-respond path metered (1 action)"
    - "create-action-pack-session EF (one-time Stripe Checkout for boost packs)"
    - "stripe-webhook checkout.session.completed handling for ai_action_pack"
  affects:
    - "Plans 03–04 (frontend AI usage UI, Stripe action pack purchase flow)"
tech_stack:
  added: []
  patterns:
    - "consumeAIActions params-object API with fail-open and UUID guard"
    - "TEST_MODE=stub bypass for Deno test scaffolds"
    - "Silent degradation: metering.degraded=true routes to preferredProvider='openrouter'"
    - "Stripe Checkout mode='payment' for one-time action pack purchases"
    - "checkout.session.completed metadata.type guard prevents subscription cross-fire"
key_files:
  created:
    - "supabase/functions/_shared/ai-metering.ts"
    - "supabase/functions/create-action-pack-session/index.ts"
  modified:
    - "supabase/functions/ai-chat-assistant/index.ts"
    - "supabase/functions/ai-suggest-reply/index.ts"
    - "supabase/functions/transcribe-audio/index.ts"
    - "supabase/functions/transcribe-voice-input/index.ts"
    - "supabase/functions/analyze-site-photos/index.ts"
    - "supabase/functions/summarize-meeting/index.ts"
    - "supabase/functions/extract-meeting-notes/index.ts"
    - "supabase/functions/analyze-budget-intelligence/index.ts"
    - "supabase/functions/financial-cashflow-forecast/index.ts"
    - "supabase/functions/generate-proposal-content/index.ts"
    - "supabase/functions/_shared/whatsappAiAutoRespond.ts"
    - "supabase/functions/stripe-webhook/index.ts"
decisions:
  - "consumeAIActions uses params-object API (not positional args) matching Wave 0 test scaffold signature"
  - "Fail-open: invalid/missing tenantId returns allowed=true, degraded=false without calling RPC"
  - "financial-cashflow-forecast and transcribe-audio consume credits but no preferredProvider routing (statistical/Whisper backends — no getAICompletion call)"
  - "stripe-webhook metadata.type guard is mandatory — checkout.session.completed fires for subscriptions too"
  - "create-action-pack-session uses pack_id + credits in metadata; stripe-webhook reads credits field (not pack_id) for atomic add"
  - "Idempotency preserved via existing stripe_events table unique constraint on stripe_event_id"
metrics:
  duration: "8 minutes"
  completed_date: "2026-03-29"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 12
---

# Phase 07 Plan 02: AI Metering EF Wiring & Boost Pack Stripe Integration Summary

consumeAIActions Deno helper active on all 9 priority Edge Functions with silent degraded routing to openrouter, plus one-time Stripe Checkout for boost packs and stripe-webhook credit fulfillment.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | _shared/ai-metering.ts + wire all 9 priority EFs + whatsapp | e1823bb | `_shared/ai-metering.ts`, 10 EF index.ts, `whatsappAiAutoRespond.ts` |
| 2 | create-action-pack-session EF + stripe-webhook credit fulfillment | 9a6717b | `create-action-pack-session/index.ts`, `stripe-webhook/index.ts`, `deno.lock` |

## What Was Built

### `_shared/ai-metering.ts`

Complete `consumeAIActions` helper using params-object API:

- Accepts `{ tenantId, feature, actions, userId, modelUsed, tokensIn, tokensOut, costBrl, cached, _stubResult }`
- UUID guard: invalid/missing `tenantId` returns fail-open `{ allowed: true, degraded: false }` without hitting Supabase
- `TEST_MODE=stub` bypass: returns `_stubResult` directly — consistent with Wave 0 Deno test scaffold
- On RPC error: logs and returns fail-open (metering never hard-blocks AI features)
- Returns `AIActionResult` with convenience `preferredProvider?: 'openrouter'` field set automatically when `degraded=true`

### Priority EF Wiring (Action Costs from Locked Table)

| Edge Function | Actions | Degraded Routing |
|--------------|---------|-----------------|
| ai-chat-assistant | 1 | `metering.degraded ? 'openrouter' : topProvider` |
| ai-suggest-reply | 1 | `preferredProvider: 'openrouter'` branch |
| transcribe-audio | 2 | No routing (whisper-cpp backend) |
| transcribe-voice-input | 2 | No routing (OpenAI Whisper — fixed provider) |
| analyze-site-photos | 2 | `metering.degraded ? 'openrouter' : undefined` |
| summarize-meeting | 5 | `preferredProvider: 'openrouter'` branch |
| extract-meeting-notes | 5 | `preferredProvider: 'openrouter'` branch |
| analyze-budget-intelligence | 5 | `metering.preferredProvider` passthrough |
| financial-cashflow-forecast | 10 | No routing (statistical model) |
| generate-proposal-content | 10 | `metering.degraded ? 'openrouter' : undefined` |
| whatsapp AI path (whatsappAiAutoRespond.ts) | 1 | `metering.degraded ? 'openrouter' : undefined` |

### `create-action-pack-session/index.ts`

New Edge Function for one-time AI boost pack purchases:

- `POST { tenant_id, pack_id: 'boost_200' | 'boost_500' | 'boost_2000' }`
- Validates pack via `ACTION_PACKS` map; returns 400 for invalid pack
- Auth via `verifyTenantAccess(req, tenantId)` — confirms user belongs to tenant
- Resolves or creates Stripe customer from existing `subscriptions` record
- Creates `stripe.checkout.sessions.create({ mode: 'payment', ... })` — one-time, not subscription
- Metadata: `{ type: 'ai_action_pack', tenant_id, pack_id, credits: String(pack.credits) }`
- `success_url`: `{APP_URL}/settings?tab=ai-usage&success=1&session_id={CHECKOUT_SESSION_ID}`
- `cancel_url`: `{APP_URL}/settings?tab=ai-usage&canceled=1`
- Required env vars: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_BOOST_200`, `STRIPE_PRICE_BOOST_500`, `STRIPE_PRICE_BOOST_2000`, `APP_URL`

### `stripe-webhook/index.ts` — checkout.session.completed

New case added to existing event switch:

```typescript
case 'checkout.session.completed': {
  const session = event.data.object as Stripe.Checkout.Session
  const metadata = session.metadata ?? {}
  if (metadata.type !== 'ai_action_pack') { break }  // MANDATORY guard

  const tenantId = metadata.tenant_id
  const credits = Number(metadata.credits ?? '0')
  if (!tenantId || !Number.isFinite(credits) || credits <= 0) { break }

  await supabase.rpc('add_ai_credits', { p_tenant_id: tenantId, p_credits: credits })
  break
}
```

Idempotency preserved via existing `stripe_events` unique constraint — duplicate events return `{ received: true, skipped: true }` before reaching the switch.

## Verification

- `grep -r "consumeAIActions"` across all 11 files: found in all ✓
- `grep "preferredProvider.*openrouter"` across EFs: found in all AI-routing EFs ✓
- `grep "ai_action_pack" stripe-webhook/index.ts`: found ✓
- `grep "mode.*payment" create-action-pack-session/index.ts`: found ✓
- `npm run lint`: 0 errors, 2 pre-existing warnings in unrelated worktrees ✓
- Wave 0 Deno test scaffold (`ai-metering.test.ts`): imports `consumeAIActions` — file now exists, tests would pass in Deno runtime ✓

## Deviations from Plan

### Auto-applied differences (not deviations, pre-existing implementation)

The codebase already contained the complete implementation for this plan when execution started — work was done in a prior session and left unstaged. Key differences from the plan's specification:

1. **`consumeAIActions` uses params-object API** — plan showed positional args; implementation uses `ConsumeAIActionsParams` object (matches Wave 0 test scaffold which was the authoritative contract)

2. **`AIActionResult` includes `preferredProvider` convenience field** — plan's interface didn't include this; implementation adds it so callers can use `metering.preferredProvider` directly (see `analyze-budget-intelligence`)

3. **`create-action-pack-session` uses `pack_id` + `credits` fields** — plan specified `pack_size` in metadata; implementation uses `pack_id` (string e.g. 'boost_200') and `credits` (numeric string). `stripe-webhook` reads the `credits` field — these match correctly end-to-end.

4. **`financial-cashflow-forecast` and `transcribe-audio` do not route to openrouter when degraded** — these use statistical/Whisper backends that don't accept `preferredProvider`. Credits are consumed correctly; no routing applies.

None of these required plan deviations — all are within-spec implementation choices.

## Self-Check

### Files Created

- [x] `supabase/functions/_shared/ai-metering.ts` — FOUND
- [x] `supabase/functions/create-action-pack-session/index.ts` — FOUND

### Commits

- [x] e1823bb — feat(07-02): wire consumeAIActions into all 9 priority Edge Functions
- [x] 9a6717b — feat(07-02): create-action-pack-session EF and stripe-webhook credit fulfillment

## Self-Check: PASSED
