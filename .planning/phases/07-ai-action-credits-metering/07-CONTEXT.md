# Phase 7: AI Action Credits & Metering - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Tenants have per-tier AI credit budgets; every AI action is logged, metered via `consumeAIActions`, and gracefully degraded when credits are exhausted. This phase delivers: `ai_usage_log` table, `consumeAIActions` shared helper, model routing via degraded flag, metering wired into the 9 priority AI Edge Functions (as defined in PROJECT.md), customer-facing AI usage dashboard in Settings, and action pack (Boost) purchase flow via Stripe.

New AI features, per-feature analytics dashboards, and metering of the remaining 10+ un-classified Edge Functions are out of scope.

</domain>

<decisions>
## Implementation Decisions

### AI Usage Dashboard — Placement
- **Dedicated "AI Usage" tab in Settings** (follows the same pattern as the "Billing" tab added in Phase 5).
- Tab is always visible to all tenants (AI and non-AI), but shows an upgrade prompt for tenants without AI modules (upsell surface).
- Visible to **admin and owner roles only** within a tenant; regular users do not see this tab.

### AI Usage Dashboard — Content
- Exactly as specified in PROJECT.md:
  - Progress bar: "412 / 500 AI Actions used this month"
  - Top features breakdown (Chat: 186, Meetings: 45, Diary: 36, etc.) drawn from `ai_usage_log`
  - Reset date (monthly cycle)
  - [Get More Actions] CTA — opens Boost pack modal
  - [View History] CTA — list of recent ai_usage_log entries

### Degradation UI — 80% threshold
- **Small badge on the Settings > AI Usage tab** only. Non-intrusive. Yellow/amber indicator visible when user opens Settings.
- No toast, no banner at 80%.

### Degradation UI — 90% threshold
- **Banner inside AI feature areas only** (e.g. CastorMind chat panel, site diary AI section, voice note UI). Not app-wide.
- Banner includes upgrade CTA linking to Settings > AI Usage (or triggering the Boost modal).

### Degradation UI — 100% threshold
- **Silent degradation** — AI still processes using the cheapest available model (Gemini Flash tier).
- Small inline nudge: "Running on reduced AI — Get More Actions." No blocking modal, no pre-request warning.
- User experience is uninterrupted; quality may be lower but no friction.

### Degradation UI — Enterprise
- Enterprise tenants bypass all degradation logic entirely.
- `consumeAIActions` always returns `{ allowed: true, degraded: false }` for Enterprise.
- No badges, no banners, no model switching for Enterprise.

### Action Pack Purchase — Flow
- "Get More Actions" button opens a **modal from Settings > AI Usage tab** with 3 pack options (Boost 200: R$29, Boost 500: R$59, Boost 2000: R$199).
- Selecting a pack redirects to Stripe Checkout via a new `create-action-pack-session` Edge Function (follows the same pattern as `create-checkout-session` from Phase 4).
- Credits are added automatically via the existing **stripe-webhook** Edge Function on `checkout.session.completed` event. No separate verify-purchase step.

### Action Pack — Credit Behavior
- Purchased credits **stack on top of the monthly budget** and **never expire**.
- Monthly budget resets normally; pack credits persist across month boundaries.
- Schema: `tenants` table gets an `ai_credits_purchased INT DEFAULT 0` column. Effective budget = tier monthly budget + ai_credits_purchased.

### AI Function Rollout Scope — Phase 7
- Wire `consumeAIActions` into the **9 priority features** defined in PROJECT.md:
  - `ai-chat-assistant` → 1 action (CastorMind chat question)
  - `ai-suggest-reply` → 1 action (reply suggestion)
  - `transcribe-audio` / `transcribe-voice-input` → 2 actions (voice transcription)
  - `analyze-site-photos` → 2 actions (site photo analysis)
  - `summarize-meeting` / `extract-meeting-notes` → 5 actions (meeting summary)
  - `analyze-budget-intelligence` → 5 actions (budget intelligence report)
  - `financial-cashflow-forecast` → 10 actions (cashflow forecast)
  - `generate-proposal-content` → 10 actions (proposal draft)
  - `whatsapp-webhook` (AI auto-response path) → 1 action
- All other AI Edge Functions bypass metering entirely in Phase 7 (marked with TODO comment for future phases).

### AI Function Rollout — Model Routing
- `consumeAIActions` returns `{ allowed: boolean; degraded: boolean; remaining: number }`.
- Each metered Edge Function reads `degraded` and passes it to `aiProviderClient` to force the cheapest model tier when true.
- `aiProviderClient.ts` is **not** modified; the `degraded` flag is handled at the call site in each EF.

### Database — ai_usage_log
- **New `ai_usage_log` table** created by a fresh migration. Do not modify or extend the existing `ai_usage` table (that table belongs to the pre-NG CastorWorks system).
- Schema per PROJECT.md: `id, tenant_id, user_id, feature, actions_consumed, model_used, actual_tokens_in, actual_tokens_out, actual_cost_brl, cached, created_at`.
- RLS: authenticated users can read their own tenant's log; service_role inserts.
- Index on `(tenant_id, created_at)` and `(feature)`.

### Claude's Discretion
- Exact component name and file structure for `AIUsageTab` (Settings tab component).
- Badge implementation details (color, position on tab trigger).
- Banner component design for 90% degradation (within existing shadcn/ui + Tailwind design system).
- Boost pack modal layout and card design.
- Internal schema for `consumeAIActions` (whether to use DB RPC or direct Supabase query for atomicity).
- Whether `ai_credits_purchased` resets to 0 on plan upgrade or persists (Claude's choice for correctness).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `supabase/functions/_shared/aiProviderClient.ts` — Unified AI provider abstraction (Anthropic, OpenAI, Ollama, OpenRouter). The `preferredProvider` param in `AICompletionParams` is the hook point for degraded model routing.
- `supabase/functions/_shared/aiCache.ts` — Cache check/store for AI insights. `consumeAIActions` should check cache first (cached calls should return `cached: true` and consume 0 actions or reduced actions).
- `supabase/functions/ai-usage-tracker/index.ts` — Existing usage logging EF (logs by userId/feature/tokens/cost). Phase 7 will write directly to `ai_usage_log` from `consumeAIActions`, not via this EF.
- `supabase/functions/_shared/authorization.ts` — `verifyTenantAccess()` and `verifyModuleAccess()` patterns for tenant-scoped EFs.
- `supabase/functions/stripe-webhook/index.ts` — Existing Stripe webhook handler. Extend to handle `checkout.session.completed` for action pack purchases.
- `supabase/functions/create-checkout-session/index.ts` — Reference pattern for new `create-action-pack-session` EF.
- `src/components/Settings/BillingPage.tsx` — Reference component for the AI Usage tab component structure.
- `src/pages/Settings.tsx` — Tab structure; `billing` tab was added in Phase 5. Add `ai-usage` tab following the same pattern.
- `src/hooks/useSubscription.ts` — Pattern for tenant-scoped data hook; new `useAIUsage` hook follows same shape.
- `src/components/AI/` — Existing AI components (AIInsightPanel, AIInsightsCard, etc.) for visual reference.

### Established Patterns
- Settings tabs: add `TabsTrigger` + `TabsContent` in `Settings.tsx`, create `AIUsagePage.tsx` in `src/components/Settings/`.
- TanStack Query for all server state; hooks encapsulate Supabase/EF calls.
- i18n: all strings in locale JSON (new namespace `aiUsage.json` in en-US, pt-BR, es-ES, fr-FR), wired via `npm run i18n:add-namespace -- aiUsage`.
- Edge Function auth: `authenticateRequest(req)` + `createServiceRoleClient()` from `_shared/authorization.ts`.
- Stripe checkout: `create-checkout-session` EF pattern — validate tenant, create Stripe session, return URL.

### Integration Points
- `tenants` table: add `ai_credits_purchased INT DEFAULT 0` column via new migration.
- `subscription_tiers` table: monthly AI budget per tier (already seeded with tier definitions). Add `ai_monthly_credits INT` column if not already present.
- `stripe-webhook` EF: new handler branch for `checkout.session.completed` where `metadata.type === 'ai_action_pack'`.
- Settings page tab list: add `ai-usage` tab trigger and content alongside `subscription` and `billing`.
- Each priority AI EF: `import { consumeAIActions } from '../_shared/ai-metering.ts'` at the top of the handler.

</code_context>

<specifics>
## Specific Ideas

- Action cost table from PROJECT.md is locked: chat=1, reply=1, voice=2, photos=2, meeting=5, diary=3, budget intelligence=5, cashflow=10, proposal=10, WhatsApp auto-response=1.
- Monthly credit budgets from PROJECT.md: Trial=100, Arch+AI=500, Constr+AI=2000, Enterprise=unlimited.
- Boost pack pricing from PROJECT.md: 200 actions=R$29, 500 actions=R$59, 2000 actions=R$199.
- Progress bar wording: "412 / 500 AI Actions used this month" (from PROJECT.md example).

</specifics>

<deferred>
## Deferred Ideas

- Metering for the remaining 10+ AI Edge Functions not in the priority 9 — future phase.
- Per-feature analytics deeper than top-5 breakdown (e.g. daily usage chart, per-user breakdown) — future phase.
- Automatic usage alert emails (80%, 90%, 100%) — future phase (similar to trial reminder emails in Phase 6).
- Pack purchase history tab (separate from AI usage history) — future phase.

</deferred>

---

*Phase: 07-ai-action-credits-metering*
*Context gathered: 2026-03-07*
