# Phase 7: AI Action Credits & Metering - Research

**Researched:** 2026-03-07
**Domain:** AI usage metering, Supabase Edge Functions, Stripe one-time checkout, React Settings tab
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **AI Usage Dashboard Placement:** Dedicated "AI Usage" tab in Settings, always visible to all tenants, shows upgrade prompt for non-AI tenants. Admin/owner roles only within a tenant.
- **AI Usage Dashboard Content:** Progress bar ("412 / 500 AI Actions used this month"), top features breakdown from `ai_usage_log`, reset date, [Get More Actions] CTA (opens Boost modal), [View History] CTA.
- **Degradation at 80%:** Small badge on Settings > AI Usage tab only. No toast, no app-wide banner.
- **Degradation at 90%:** Banner inside AI feature areas only (chat panel, site diary, voice note UI). Includes upgrade CTA.
- **Degradation at 100%:** Silent degradation — AI still processes using cheapest model (Gemini Flash tier). Small inline nudge: "Running on reduced AI — Get More Actions." No blocking.
- **Enterprise bypass:** `consumeAIActions` always returns `{ allowed: true, degraded: false }` for Enterprise. No UI indicators.
- **Action Pack Flow:** Modal from Settings > AI Usage with 3 packs (Boost 200: R$29, Boost 500: R$59, Boost 2000: R$199). Stripe Checkout via new `create-action-pack-session` EF. Credits added via existing `stripe-webhook` EF on `checkout.session.completed`.
- **Pack Credit Behavior:** Purchased credits stack on top of monthly budget, never expire. `tenants.ai_credits_purchased INT DEFAULT 0`. Effective budget = tier monthly + purchased.
- **Priority 9 AI Functions to Meter:**
  - `ai-chat-assistant` → 1 action
  - `ai-suggest-reply` → 1 action
  - `transcribe-audio` / `transcribe-voice-input` → 2 actions
  - `analyze-site-photos` → 2 actions
  - `summarize-meeting` / `extract-meeting-notes` → 5 actions
  - `analyze-budget-intelligence` → 5 actions
  - `financial-cashflow-forecast` → 10 actions
  - `generate-proposal-content` → 10 actions
  - `whatsapp-webhook` (AI auto-response path) → 1 action
- **Model Routing:** `consumeAIActions` returns `{ allowed: boolean; degraded: boolean; remaining: number }`. Each EF reads `degraded` and passes to `aiProviderClient` via `preferredProvider`. `aiProviderClient.ts` is NOT modified.
- **Database `ai_usage_log`:** New table via fresh migration. Schema: `id, tenant_id, user_id, feature, actions_consumed, model_used, actual_tokens_in, actual_tokens_out, actual_cost_brl, cached, created_at`. RLS: authenticated users read own tenant's log; service_role inserts. Index on `(tenant_id, created_at)` and `(feature)`.
- **Action costs locked:** chat=1, reply=1, voice=2, photos=2, meeting=5, diary=3, budget_intelligence=5, cashflow=10, proposal=10, WhatsApp=1.
- **Monthly budgets locked:** Trial=100, Arch+AI=500, Constr+AI=2000, Enterprise=unlimited.
- **Boost pack pricing locked:** 200 actions=R$29, 500 actions=R$59, 2000 actions=R$199.

### Claude's Discretion

- Exact component name and file structure for `AIUsageTab` (Settings tab component).
- Badge implementation details (color, position on tab trigger).
- Banner component design for 90% degradation (within existing shadcn/ui + Tailwind design system).
- Boost pack modal layout and card design.
- Internal schema for `consumeAIActions` (whether to use DB RPC or direct Supabase query for atomicity).
- Whether `ai_credits_purchased` resets to 0 on plan upgrade or persists.

### Deferred Ideas (OUT OF SCOPE)

- Metering for the remaining 10+ AI Edge Functions not in the priority 9.
- Per-feature analytics deeper than top-5 breakdown (daily chart, per-user).
- Automatic usage alert emails (80%, 90%, 100%).
- Pack purchase history tab (separate from AI usage history).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AI-01 | Every AI action is logged in `ai_usage_log` with tenant, model, tokens, and cost | `consumeAIActions` shared helper writes to new `ai_usage_log` table from service_role; existing `ai_usage_logs` table (old CastorWorks) is NOT modified |
| AI-02 | Each subscription tier has a configured AI credit budget (monthly) | `subscription_tiers` table needs `ai_monthly_credits INT` column via new migration; budgets locked at Trial=100, Arch+AI=500, Constr+AI=2000, Enterprise=NULL (unlimited) |
| AI-03 | `consumeAIActions` RPC/helper atomically debits credits and rejects when budget is exceeded | Supabase RPC with `FOR UPDATE` row lock on tenants record achieves atomicity; returns `{ allowed, degraded, remaining }` |
| AI-04 | Model routing selects appropriate model tier based on tenant plan; graceful degradation when credits exhausted | `degraded` flag from `consumeAIActions` is passed as `preferredProvider` override in each metered EF; no change to `aiProviderClient.ts` |
</phase_requirements>

---

## Summary

Phase 7 wires AI usage metering across 9 priority Edge Functions by introducing a single shared helper `consumeAIActions` (Deno TypeScript module at `supabase/functions/_shared/ai-metering.ts`) and a new `ai_usage_log` table. The helper atomically checks the tenant's remaining budget (monthly tier budget + purchased pack credits), debits actions consumed, logs the usage, and returns a `{ allowed, degraded, remaining }` result that each Edge Function uses for model routing. The frontend delivers a dedicated "AI Usage" tab in Settings with a progress bar, feature breakdown, and Boost pack purchase modal.

The existing `ai_usage_logs` table (old CastorWorks) is entirely separate and must not be touched. The new `ai_usage_log` table is tenant-scoped with RLS. The `create-action-pack-session` Edge Function follows the identical pattern as `create-checkout-session` (which already exists and is well-understood). The `stripe-webhook` EF gains one new branch for `checkout.session.completed` where `metadata.type === 'ai_action_pack'`.

Atomicity is the central correctness concern: the debit+check operation must be an atomic DB RPC to prevent race conditions under concurrent AI requests. A Postgres function using `SELECT ... FOR UPDATE` on the tenant's credit balance is the recommended implementation.

**Primary recommendation:** Implement `consumeAIActions` as a Postgres RPC (`consume_ai_actions`) that runs atomically server-side, called from the shared Deno helper. This eliminates any race window between check and debit.

---

## Standard Stack

### Core

| Library / Tool | Version | Purpose | Why Standard |
|----------------|---------|---------|--------------|
| Supabase Postgres RPC | — | Atomic credit debit via `consume_ai_actions` DB function | Service-role call from Deno; single round-trip; locks row |
| Deno TypeScript | — | `_shared/ai-metering.ts` shared helper | All EFs are Deno; consistent with `_shared/authorization.ts` pattern |
| Stripe SDK | `stripe@14` (esm.sh) | `create-action-pack-session` EF | Already in use by `create-checkout-session` |
| TanStack Query | — | `useAIUsage` hook for Settings tab data | Project standard for all server state |
| shadcn/ui Progress | — | Progress bar component | Already in project (`src/components/ui/progress.tsx`) |
| shadcn/ui Badge | — | 80% threshold badge on tab trigger | Already in project |
| shadcn/ui Dialog | — | Boost pack purchase modal | Already in project |
| i18next (aiUsage namespace) | — | All UI strings | Mandatory per project conventions |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `supabase/functions/_shared/authorization.ts` | — | `authenticateRequest`, `createServiceRoleClient`, `verifyTenantAccess` | Every EF handler |
| `supabase/functions/_shared/aiCache.ts` | — | Cache check before consuming actions | Cached hits consume 0 actions or reduced actions |
| `supabase/functions/_shared/aiProviderClient.ts` | — | `getAICompletion` with `preferredProvider` for model routing | Each metered EF passes degraded model via `preferredProvider` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Postgres RPC for atomicity | Optimistic update + DB trigger | RPC is simpler, explicit, testable — triggers are harder to reason about |
| DB RPC `consume_ai_actions` | In-process check + insert from Deno | In-process check has a race window between read and write under concurrency |
| Stripe Checkout (one-time payment) | Stripe Payment Intents | Checkout is already proven in the codebase; Payment Intents require more frontend work |

**Installation:** No new npm packages needed. All libraries are already in the project or loaded via Deno's esm.sh imports.

---

## Architecture Patterns

### Recommended Project Structure

New files this phase:

```
supabase/
  functions/
    _shared/
      ai-metering.ts              # consumeAIActions helper (new)
    create-action-pack-session/
      index.ts                    # new EF — Stripe one-time checkout for boosts
  migrations/
    20260307000000_ai_usage_log_and_credits.sql   # ai_usage_log table, tenants columns, subscription_tiers column, consume_ai_actions RPC

src/
  components/
    Settings/
      AIUsagePage.tsx             # new — AI Usage tab content component
      BoostPackModal.tsx          # new — Boost purchase modal
  hooks/
    useAIUsage.ts                 # new — TanStack Query hook for AI usage data
  locales/
    en-US/aiUsage.json            # new namespace (4 langs via i18n:add-namespace)
    es-ES/aiUsage.json
    fr-FR/aiUsage.json
    pt-BR/aiUsage.json
```

Modifications to existing files:

```
supabase/functions/stripe-webhook/index.ts     — add checkout.session.completed branch
supabase/functions/ai-chat-assistant/index.ts  — wire consumeAIActions
supabase/functions/ai-suggest-reply/index.ts   — wire consumeAIActions
supabase/functions/transcribe-audio/index.ts   — wire consumeAIActions
supabase/functions/transcribe-voice-input/index.ts — wire consumeAIActions
supabase/functions/analyze-site-photos/index.ts — wire consumeAIActions
supabase/functions/summarize-meeting/index.ts  — wire consumeAIActions
supabase/functions/extract-meeting-notes/index.ts — wire consumeAIActions
supabase/functions/analyze-budget-intelligence/index.ts — wire consumeAIActions
supabase/functions/financial-cashflow-forecast/index.ts — wire consumeAIActions
supabase/functions/generate-proposal-content/index.ts — wire consumeAIActions
supabase/functions/whatsapp-webhook/index.ts   — wire consumeAIActions in AI path only
src/pages/Settings.tsx                         — add ai-usage TabsTrigger + TabsContent
src/locales/critical.ts                        — add aiUsage namespace import
src/lib/i18n/i18n.ts                           — register aiUsage namespace
```

### Pattern 1: consumeAIActions Shared Helper

**What:** Deno module that calls the `consume_ai_actions` Postgres RPC and returns `{ allowed, degraded, remaining }`.

**When to use:** Called at the top of every metered Edge Function handler, before calling `getAICompletion`.

**Example:**

```typescript
// supabase/functions/_shared/ai-metering.ts
import { createServiceRoleClient } from './authorization.ts';

export interface AIActionResult {
  allowed: boolean;
  degraded: boolean;
  remaining: number;
}

export async function consumeAIActions(
  tenantId: string,
  feature: string,
  actionsToConsume: number,
  userId: string,
  modelUsed: string
): Promise<AIActionResult> {
  // Enterprise tenants bypass all metering
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase.rpc('consume_ai_actions', {
    p_tenant_id: tenantId,
    p_feature: feature,
    p_actions: actionsToConsume,
    p_user_id: userId,
    p_model_used: modelUsed,
  });

  if (error) throw new Error(`AI metering error: ${error.message}`);

  return {
    allowed: data.allowed,
    degraded: data.degraded,
    remaining: data.remaining,
  };
}

export async function logAIUsage(
  tenantId: string,
  userId: string,
  feature: string,
  actionsConsumed: number,
  modelUsed: string,
  tokensIn: number,
  tokensOut: number,
  costBrl: number,
  cached: boolean
): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase.from('ai_usage_log').insert({
    tenant_id: tenantId,
    user_id: userId,
    feature,
    actions_consumed: actionsConsumed,
    model_used: modelUsed,
    actual_tokens_in: tokensIn,
    actual_tokens_out: tokensOut,
    actual_cost_brl: costBrl,
    cached,
  });
}
```

### Pattern 2: Postgres `consume_ai_actions` RPC (Atomic)

**What:** A Postgres function that atomically reads current usage, computes remaining, debits if allowed, writes to `ai_usage_log`, and returns status.

**When to use:** Called exclusively by `consumeAIActions` helper via service_role.

**Example (migration SQL):**

```sql
CREATE OR REPLACE FUNCTION public.consume_ai_actions(
  p_tenant_id UUID,
  p_feature TEXT,
  p_actions INT,
  p_user_id UUID,
  p_model_used TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tier_id TEXT;
  v_monthly_budget INT;
  v_credits_purchased INT;
  v_effective_budget INT;
  v_used_this_month INT;
  v_remaining INT;
  v_degraded BOOLEAN := FALSE;
  v_allowed BOOLEAN := TRUE;
BEGIN
  -- Lock tenant row for atomic read-modify-write
  SELECT subscription_tier_id, ai_credits_purchased
  INTO v_tier_id, v_credits_purchased
  FROM public.tenants
  WHERE id = p_tenant_id
  FOR UPDATE;

  -- Enterprise: bypass all metering
  IF v_tier_id = 'enterprise' THEN
    RETURN jsonb_build_object('allowed', TRUE, 'degraded', FALSE, 'remaining', 999999);
  END IF;

  -- Get tier monthly budget
  SELECT ai_monthly_credits INTO v_monthly_budget
  FROM public.subscription_tiers
  WHERE id = v_tier_id;

  v_effective_budget := COALESCE(v_monthly_budget, 0) + COALESCE(v_credits_purchased, 0);

  -- Calculate usage this calendar month
  SELECT COALESCE(SUM(actions_consumed), 0) INTO v_used_this_month
  FROM public.ai_usage_log
  WHERE tenant_id = p_tenant_id
    AND created_at >= date_trunc('month', NOW());

  v_remaining := v_effective_budget - v_used_this_month;

  -- Determine allowed / degraded
  IF v_remaining <= 0 THEN
    v_degraded := TRUE;
    -- Still allowed but degraded (runs on cheapest model)
    v_allowed := TRUE;
  ELSIF v_remaining < (v_effective_budget * 0.1) THEN
    v_degraded := FALSE; -- 90% threshold: UI banner only, not model degraded
    v_allowed := TRUE;
  END IF;

  -- Insert usage log (always, even degraded)
  INSERT INTO public.ai_usage_log (
    tenant_id, user_id, feature, actions_consumed,
    model_used, actual_tokens_in, actual_tokens_out, actual_cost_brl, cached
  ) VALUES (
    p_tenant_id, p_user_id, p_feature, p_actions,
    p_model_used, 0, 0, 0, FALSE
  );

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'degraded', v_degraded,
    'remaining', GREATEST(v_remaining - p_actions, 0)
  );
END;
$$;
```

Note: Token counts and cost are updated post-completion via a separate `logAIUsage` call from the Deno helper once the AI response is received, or the RPC can be split into pre-check + post-update phases. The pre-check approach is recommended to avoid double inserts.

### Pattern 3: Metering an Existing Edge Function

**What:** Insert `consumeAIActions` call at the top of an EF handler, pass `degraded` flag to `getAICompletion` via `preferredProvider`.

**When to use:** Applied to all 9 priority EFs.

**Example:**

```typescript
// In any metered Edge Function (e.g., ai-chat-assistant/index.ts)
import { consumeAIActions } from '../_shared/ai-metering.ts';

// After authenticateRequest and verifyTenantAccess:
const metering = await consumeAIActions(
  tenantId,
  'ai-chat-assistant',
  1,            // actions to consume for this feature
  user.id,
  'anthropic'   // model identifier (updated after actual call)
);

// Pass degraded flag to force cheapest model when over budget
const aiResponse = await getAICompletion({
  prompt,
  systemMessage,
  preferredProvider: metering.degraded ? 'openrouter' : undefined,
});
```

### Pattern 4: Settings Tab Addition

**What:** Adding the "AI Usage" tab to `src/pages/Settings.tsx` following the exact same pattern as the "Billing" tab added in Phase 5.

**When to use:** `Settings.tsx` modifications.

**Example (structure only):**

```typescript
// In Settings.tsx TabsList:
<TabsTrigger value="ai-usage" className="relative">
  {t('settings:tabs.aiUsage')}
  {showAIWarningBadge && (
    <Badge variant="warning" className="ml-1 h-2 w-2 p-0 rounded-full" />
  )}
</TabsTrigger>

// In Settings.tsx TabsContent:
<TabsContent value="ai-usage">
  <AIUsagePage />
</TabsContent>
```

### Pattern 5: Boost Pack Stripe Checkout

**What:** `create-action-pack-session` EF — creates a Stripe Checkout session in `payment` mode (one-time, not subscription). Returns `{ url }`.

**When to use:** Called from `BoostPackModal.tsx` when user selects a pack.

**Key differences from `create-checkout-session`:**
- `mode: 'payment'` (not `'subscription'`)
- `metadata.type = 'ai_action_pack'`, `metadata.pack_size = 200 | 500 | 2000`
- No `stripe_customer_id` upsert to `subscriptions` table; uses existing customer or creates one
- Returns to `settings?tab=ai-usage&boost_success=1`

**stripe-webhook extension:**

```typescript
case 'checkout.session.completed': {
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.metadata?.type === 'ai_action_pack') {
    const tenantId = session.metadata.tenant_id;
    const packSize = parseInt(session.metadata.pack_size ?? '0', 10);
    if (tenantId && packSize > 0) {
      await supabase
        .from('tenants')
        .update({
          ai_credits_purchased: supabase.rpc('tenants.ai_credits_purchased + $1', [packSize])
        })
        .eq('id', tenantId);
      // Use safe atomic increment:
      await supabase.rpc('add_ai_credits', { p_tenant_id: tenantId, p_credits: packSize });
    }
  }
  break;
}
```

Note: Use a dedicated RPC `add_ai_credits` for the atomic increment to avoid race conditions on the webhook.

### Anti-Patterns to Avoid

- **Non-atomic check-then-debit in Deno:** Never read `ai_credits_purchased` in Deno, compute remaining, then update — this creates a race window. Always use the Postgres RPC.
- **Modifying `aiProviderClient.ts`:** The `degraded` flag is consumed at each EF call site, not inside the provider client.
- **Writing to `ai_usage_logs` (old table):** The new table is `ai_usage_log` (no trailing `s`). The old `ai_usage_logs` belongs to old CastorWorks and must not be touched.
- **Blocking the user at 100%:** 100% exhaustion must not block; the app degrades silently.
- **Skipping RLS on `ai_usage_log`:** All new tenant-scoped tables must have RLS enabled.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic credit debit | Custom Deno mutex | Postgres RPC with `FOR UPDATE` | DB is the only shared state; Deno is stateless across invocations |
| Stripe one-time payment | Custom payment form | Stripe Checkout (`mode: 'payment'`) | Already proven in codebase via `create-checkout-session`; handles SCA/3DS |
| Progress bar UI | Custom `<div>` with width calculations | `shadcn/ui` `<Progress>` | Already in project at `src/components/ui/progress.tsx` |
| Modal | Custom overlay | `shadcn/ui` `<Dialog>` | Project standard |
| Monthly usage aggregation | In-Deno array reduce over log rows | Postgres `SUM` in the RPC | DB-side aggregation is atomic and efficient |
| i18n string setup | Manual JSON editing + critical.ts update | `npm run i18n:add-namespace -- aiUsage` | Project has a dedicated script that wires both files automatically |

**Key insight:** The temptation to compute credit balances in the frontend or Deno layer causes race conditions. The only correct place for this logic is an atomic Postgres transaction.

---

## Common Pitfalls

### Pitfall 1: Race Condition in Credit Debit

**What goes wrong:** Two simultaneous AI requests both read `remaining = 5`, both pass the check, both debit, consuming 10 instead of 5 — or going negative.

**Why it happens:** Non-atomic check + debit. Reading balance in Deno and writing separately has a window.

**How to avoid:** The `consume_ai_actions` Postgres RPC must use `SELECT ... FOR UPDATE` on the tenants row before reading/writing credits.

**Warning signs:** Usage logs showing credits going below zero; users getting degraded mode even when budget shows available credits.

### Pitfall 2: Wrong Table Name

**What goes wrong:** Code accidentally writes to `ai_usage_logs` (old CastorWorks table, no `tenant_id`, different schema) instead of `ai_usage_log` (new table).

**Why it happens:** The old table is already in migrations and the name is very similar.

**How to avoid:** The new table is `ai_usage_log` (singular, no trailing `s`). Add a code search check before shipping each EF.

**Warning signs:** RLS violations (old table has no `tenant_id`); data appearing in wrong dashboard.

### Pitfall 3: `checkout.session.completed` Not Filtering by `metadata.type`

**What goes wrong:** The stripe-webhook `checkout.session.completed` handler adds AI credits to every completed checkout, including subscription upgrades.

**Why it happens:** Subscription upgrades also fire `checkout.session.completed` — the webhook must distinguish by `metadata.type === 'ai_action_pack'`.

**How to avoid:** Always check `session.metadata?.type` before processing as a boost purchase.

**Warning signs:** Tenants getting unexpected AI credit boosts after subscription changes.

### Pitfall 4: Enterprise Tier Not Bypassing Metering

**What goes wrong:** Enterprise tenants hit the credit limit path and get degraded mode.

**Why it happens:** RPC checks a numeric budget limit; `enterprise` tier has `ai_monthly_credits = NULL` and the arithmetic treats NULL as 0.

**How to avoid:** In `consume_ai_actions`, explicitly check for Enterprise tier ID before any budget arithmetic. Return `{ allowed: true, degraded: false, remaining: 999999 }` immediately.

**Warning signs:** Enterprise customer complaints about degraded AI; NULL arithmetic in Postgres queries.

### Pitfall 5: Missing `ai_credits_purchased` Persistence Across Plan Changes

**What goes wrong:** When a tenant upgrades their plan, purchased credits are zeroed out.

**Why it happens:** `change_tenant_tier` RPC (from Phase 2) may reset tenant fields.

**How to avoid:** `ai_credits_purchased` must NOT be reset by `change_tenant_tier`. It persists permanently until consumed. Claude's discretion per CONTEXT.md: recommend persisting across upgrades for correctness (credits were paid for).

**Warning signs:** Customer support tickets about lost boost credits after plan change.

### Pitfall 6: i18n Namespace Not Wired

**What goes wrong:** The `aiUsage` namespace loads in dev but fails in production; translations fall back to key names.

**Why it happens:** Adding only the JSON files without updating `critical.ts` and `i18n.ts`.

**How to avoid:** Always run `npm run i18n:add-namespace -- aiUsage` which handles both files automatically.

---

## Code Examples

Verified patterns from existing codebase:

### Stripe Checkout Session (payment mode for one-time pack)

```typescript
// supabase/functions/create-action-pack-session/index.ts
// Based on create-checkout-session pattern

const PACK_PRICES: Record<string, { brl: number; size: number; stripe_price_id: string }> = {
  boost_200:  { brl: 29,  size: 200,  stripe_price_id: Deno.env.get('STRIPE_PRICE_BOOST_200')! },
  boost_500:  { brl: 59,  size: 500,  stripe_price_id: Deno.env.get('STRIPE_PRICE_BOOST_500')! },
  boost_2000: { brl: 199, size: 2000, stripe_price_id: Deno.env.get('STRIPE_PRICE_BOOST_2000')! },
};

const session = await stripe.checkout.sessions.create({
  customer: stripeCustomerId,
  mode: 'payment',              // one-time, not subscription
  line_items: [{ price: priceId, quantity: 1 }],
  metadata: {
    tenant_id: tenantId,
    type: 'ai_action_pack',
    pack_size: String(pack.size),
  },
  success_url: `${appUrl}/settings?tab=ai-usage&boost_success=1`,
  cancel_url:  `${appUrl}/settings?tab=ai-usage`,
});
```

### useAIUsage Hook (TanStack Query pattern)

```typescript
// src/hooks/useAIUsage.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useTenantId } from '@/contexts/TenantContext'

export function useAIUsage() {
  const tenantId = useTenantId()

  return useQuery({
    queryKey: ['tenant', tenantId, 'ai-usage'],
    queryFn: async () => {
      if (!tenantId) return null

      // Current month usage
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const { data: logs, error } = await supabase
        .from('ai_usage_log')
        .select('feature, actions_consumed, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', monthStart)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch tier budget + purchased credits
      const { data: tenant } = await supabase
        .from('tenants')
        .select('subscription_tier_id, ai_credits_purchased')
        .eq('id', tenantId)
        .single()

      return { logs: logs ?? [], tenant }
    },
    enabled: !!tenantId,
    staleTime: 60_000, // 1 minute
  })
}
```

### Stripe Webhook Branch for Action Pack

```typescript
// In stripe-webhook/index.ts switch(event.type):
case 'checkout.session.completed': {
  const session = event.data.object as Stripe.Checkout.Session
  if (session.metadata?.type === 'ai_action_pack') {
    const tenantId = session.metadata.tenant_id
    const packSize = parseInt(session.metadata.pack_size ?? '0', 10)
    if (tenantId && packSize > 0) {
      await supabase.rpc('add_ai_credits', {
        p_tenant_id: tenantId,
        p_credits: packSize,
      })
    }
  }
  break
}
```

### Migration Schema

```sql
-- New table: ai_usage_log (distinct from old ai_usage_logs)
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  feature TEXT NOT NULL,
  actions_consumed INT NOT NULL DEFAULT 1,
  model_used TEXT,
  actual_tokens_in INT DEFAULT 0,
  actual_tokens_out INT DEFAULT 0,
  actual_cost_brl DECIMAL(10, 6) DEFAULT 0,
  cached BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_log_tenant_date ON public.ai_usage_log (tenant_id, created_at DESC);
CREATE INDEX idx_ai_usage_log_feature ON public.ai_usage_log (feature);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

-- Authenticated users read their own tenant's log
CREATE POLICY "ai_usage_log_select_tenant"
  ON public.ai_usage_log FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));

-- Only service_role inserts (via consume_ai_actions RPC with SECURITY DEFINER)
-- No INSERT policy for authenticated role needed.

-- Add ai_monthly_credits to subscription_tiers
ALTER TABLE public.subscription_tiers
  ADD COLUMN IF NOT EXISTS ai_monthly_credits INT;

UPDATE public.subscription_tiers SET ai_monthly_credits = 100  WHERE id = 'trial';
UPDATE public.subscription_tiers SET ai_monthly_credits = 0    WHERE id = 'sandbox';
UPDATE public.subscription_tiers SET ai_monthly_credits = 0    WHERE id = 'architect_office';
UPDATE public.subscription_tiers SET ai_monthly_credits = 500  WHERE id = 'architect_office_ai';
UPDATE public.subscription_tiers SET ai_monthly_credits = 0    WHERE id = 'construction';
UPDATE public.subscription_tiers SET ai_monthly_credits = 2000 WHERE id = 'construction_ai';
UPDATE public.subscription_tiers SET ai_monthly_credits = NULL WHERE id = 'enterprise'; -- unlimited

-- Add ai_credits_purchased to tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS ai_credits_purchased INT NOT NULL DEFAULT 0;

-- Helper RPC for webhook atomic increment
CREATE OR REPLACE FUNCTION public.add_ai_credits(
  p_tenant_id UUID,
  p_credits INT
) RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.tenants
  SET ai_credits_purchased = ai_credits_purchased + p_credits
  WHERE id = p_tenant_id;
$$;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-user AI logging (old `ai_usage_logs`) | Per-tenant AI metering (`ai_usage_log`) | Phase 7 | Enables tenant-level budgets and credit pooling |
| No credit enforcement | Atomic `consume_ai_actions` RPC | Phase 7 | Real metering with degradation path |
| All EFs call AI unconditionally | EFs call `consumeAIActions` first | Phase 7 | Credit-aware model routing |

**Deprecated/outdated:**
- `ai-usage-tracker` Edge Function: Phase 7 writes directly to `ai_usage_log` from the shared helper's Postgres RPC, not via this EF. The EF can remain but is not used for the new metering path.

---

## Open Questions

1. **Token count and cost update timing**
   - What we know: `consume_ai_actions` RPC inserts a log row before the AI call (actions_consumed known, tokens unknown). Actual tokens are only available after `getAICompletion` returns.
   - What's unclear: Best strategy — pre-insert with zeros and UPDATE after, or single insert after completion.
   - Recommendation: Pre-check only (no insert) via a lightweight RPC that just returns `{ allowed, degraded, remaining }`, then do the actual log INSERT after the AI call completes with real token counts. Avoids UPDATE and simplifies the RPC.

2. **Cached AI calls: 0 actions or reduced?**
   - What we know: CONTEXT.md says "cached calls should return `cached: true` and consume 0 actions or reduced actions."
   - What's unclear: Exact cost for cached hits was not locked in CONTEXT.md.
   - Recommendation: Cached hits consume 0 actions. The log entry is still written (with `cached: true`, `actions_consumed: 0`) for audit purposes.

3. **`ai_credits_purchased` on plan downgrade**
   - What we know: CONTEXT.md leaves this to Claude's discretion.
   - Recommendation: Purchased credits persist through any plan change (up or down). Credits were paid for and should never be silently removed. This is the correct behavior for customer trust.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (project-wide) |
| Config file | `vite.config.ts` (Vitest config embedded) |
| Quick run command | `npm run test:run -- --reporter=verbose src/hooks/__tests__/useAIUsage.test.ts` |
| Full suite command | `npm run test:run` (63 files, ~13s) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| AI-01 | `ai_usage_log` receives a row for each metered action (tenant_id, feature, actions_consumed present) | unit | `npm run test:run -- src/hooks/__tests__/useAIUsage.test.ts` | ❌ Wave 0 |
| AI-01 | Feature breakdown aggregation returns correct top-5 counts from mock log data | unit | `npm run test:run -- src/hooks/__tests__/useAIUsage.test.ts` | ❌ Wave 0 |
| AI-02 | `useAIUsage` computes effective budget as `ai_monthly_credits + ai_credits_purchased` | unit | `npm run test:run -- src/hooks/__tests__/useAIUsage.test.ts` | ❌ Wave 0 |
| AI-02 | Enterprise tier returns unlimited (no usage cap enforced) | unit | `npm run test:run -- src/hooks/__tests__/useAIUsage.test.ts` | ❌ Wave 0 |
| AI-03 | `consumeAIActions` returns `{ allowed: true, degraded: false }` when credits remain | unit (mock RPC) | `npm run test:run -- src/hooks/__tests__/useAIUsage.test.ts` | ❌ Wave 0 |
| AI-03 | `consumeAIActions` returns `{ allowed: true, degraded: true }` when credits are at 0 | unit (mock RPC) | `npm run test:run -- src/hooks/__tests__/useAIUsage.test.ts` | ❌ Wave 0 |
| AI-04 | When `degraded: true`, metered EF passes `preferredProvider` override (cheapest model) | unit | `npm run test:run -- supabase/functions/__tests__/ai-metering.test.ts` | ❌ Wave 0 |
| AI-04 | AIUsagePage renders progress bar with correct "used / total" values | unit (component) | `npm run test:run -- src/components/Settings/__tests__/AIUsagePage.test.tsx` | ❌ Wave 0 |
| AI-04 | 80% threshold: badge is shown on tab trigger; no app-wide banner | unit (component) | `npm run test:run -- src/components/Settings/__tests__/AIUsagePage.test.tsx` | ❌ Wave 0 |
| AI-04 | 100% threshold: inline nudge renders; no blocking modal | unit (component) | `npm run test:run -- src/components/Settings/__tests__/AIUsagePage.test.tsx` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run test:run -- src/hooks/__tests__/useAIUsage.test.ts src/components/Settings/__tests__/AIUsagePage.test.tsx`
- **Per wave merge:** `npm run test:run` (full 63-file suite)
- **Phase gate:** Full suite green + `npm run lint` clean before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/hooks/__tests__/useAIUsage.test.ts` — covers AI-01, AI-02, AI-03 (mock Supabase client)
- [ ] `src/components/Settings/__tests__/AIUsagePage.test.tsx` — covers AI-04 UI states (80%, 90%, 100%, Enterprise)
- [ ] `supabase/functions/__tests__/ai-metering.test.ts` — covers AI-04 model routing with TEST_MODE=stub (Deno test, separate from Vitest)

Note: The Deno EF tests in `supabase/functions/__tests__/` use `TEST_MODE=stub` (already supported by `aiProviderClient.ts`). The `analyze-site-photos.test.ts` in that directory is an existing reference for the Deno test pattern.

---

## Sources

### Primary (HIGH confidence)

- Direct codebase read — `supabase/functions/_shared/authorization.ts` — `authenticateRequest`, `createServiceRoleClient`, `verifyTenantAccess` patterns
- Direct codebase read — `supabase/functions/_shared/aiProviderClient.ts` — `preferredProvider` hook point, `TEST_MODE=stub` support, fallback chain
- Direct codebase read — `supabase/functions/create-checkout-session/index.ts` — Stripe checkout pattern (mode, metadata, customer resolution)
- Direct codebase read — `supabase/functions/stripe-webhook/index.ts` — Event switch pattern, idempotency via `stripe_events`, existing subscription lifecycle
- Direct codebase read — `supabase/migrations/20260302000000_license_modules_tiers_tenant_licensed.sql` — `subscription_tiers` schema (no `ai_monthly_credits` yet), `tenants.subscription_tier_id`
- Direct codebase read — `supabase/migrations/20260302000001_seed_license_modules_and_tiers.sql` — Tier IDs confirmed: trial, sandbox, architect_office, architect_office_ai, construction, construction_ai, enterprise
- Direct codebase read — `src/hooks/useSubscription.ts` — TanStack Query hook pattern for `useAIUsage`
- Direct codebase read — `src/components/Settings/BillingPage.tsx` — Reference component for AIUsagePage structure
- Direct codebase read — `supabase/functions/_shared/aiCache.ts` — Cache check/store pattern; cached=true behavior
- Direct codebase read — `supabase/functions/ai-usage-tracker/index.ts` — Confirms old `ai_usage_logs` table schema; Phase 7 does NOT use this EF
- Direct codebase read — `package.json` test scripts — `npm run test:run` confirmed, Vitest framework, 63 test files passing

### Secondary (MEDIUM confidence)

- Codebase glob — `supabase/functions/__tests__/` — Confirms Deno test infrastructure exists (2 files); TEST_MODE=stub pattern available
- Codebase inspection — `src/locales/en-US/` — `aiUsage` namespace does NOT yet exist; must be created
- Memory.md — `npm run i18n:add-namespace -- <name>` script creates 4 JSON files and wires critical.ts + i18n.ts automatically

### Tertiary (LOW confidence)

- None. All findings are directly supported by codebase evidence.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified present in codebase; Stripe@14 confirmed in create-checkout-session
- Architecture: HIGH — patterns confirmed from existing EF implementations and migration files
- Pitfalls: HIGH — race condition and table name pitfalls verified from schema inspection

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable stack; Stripe API version pinned)
