-- =============================================================================
-- Phase 7: AI Action Credits & Metering
-- Migration: ai_usage_log table, schema columns, and atomic RPCs
-- =============================================================================

-- 1. CREATE TABLE public.ai_usage_log
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID          NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id             UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  feature             TEXT          NOT NULL,
  actions_consumed    INT           NOT NULL DEFAULT 1,
  model_used          TEXT,
  actual_tokens_in    INT           DEFAULT 0,
  actual_tokens_out   INT           DEFAULT 0,
  actual_cost_brl     DECIMAL(10,6) DEFAULT 0,
  cached              BOOLEAN       DEFAULT FALSE,
  created_at          TIMESTAMPTZ   DEFAULT NOW()
);

-- 2. Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_tenant_date
  ON public.ai_usage_log (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_feature
  ON public.ai_usage_log (feature);

-- 3. Enable Row Level Security
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

-- 4. RLS policy — tenant read access (service_role inserts via SECURITY DEFINER RPC)
CREATE POLICY "ai_usage_log_select_tenant"
  ON public.ai_usage_log
  FOR SELECT
  TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));

-- 5. Add ai_monthly_credits column to subscription_tiers
ALTER TABLE public.subscription_tiers
  ADD COLUMN IF NOT EXISTS ai_monthly_credits INT;

-- Seed locked credit budgets per tier
UPDATE public.subscription_tiers SET ai_monthly_credits = 100   WHERE id = 'trial';
UPDATE public.subscription_tiers SET ai_monthly_credits = 0     WHERE id = 'sandbox';
UPDATE public.subscription_tiers SET ai_monthly_credits = 0     WHERE id = 'architect_office';
UPDATE public.subscription_tiers SET ai_monthly_credits = 500   WHERE id = 'architect_office_ai';
UPDATE public.subscription_tiers SET ai_monthly_credits = 0     WHERE id = 'construction';
UPDATE public.subscription_tiers SET ai_monthly_credits = 2000  WHERE id = 'construction_ai';
UPDATE public.subscription_tiers SET ai_monthly_credits = NULL  WHERE id = 'enterprise';

-- 6. Add ai_credits_purchased column to tenants (persistent, never expires)
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS ai_credits_purchased INT NOT NULL DEFAULT 0;

-- 7. add_ai_credits RPC — atomically increments purchased credits on a tenant
CREATE OR REPLACE FUNCTION public.add_ai_credits(
  p_tenant_id UUID,
  p_credits   INT
) RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.tenants
  SET ai_credits_purchased = ai_credits_purchased + p_credits
  WHERE id = p_tenant_id;
$$;

-- 8. consume_ai_actions RPC — atomically debits credits, logs usage, returns metering result
--
-- Returns JSONB: { allowed: boolean, degraded: boolean, remaining: int }
--
-- Business rules (per CONTEXT.md locked decisions):
--   - allowed is ALWAYS true — 100% exhaustion degrades silently, never blocks
--   - Enterprise tier bypasses all budget checks entirely
--   - Degraded = true when v_remaining <= 0 (cheapest model tier is forced by the caller)
--   - Purchased credits stack on top of monthly budget; monthly budget resets each calendar month
CREATE OR REPLACE FUNCTION public.consume_ai_actions(
  p_tenant_id   UUID,
  p_feature     TEXT,
  p_actions     INT,
  p_user_id     UUID,
  p_model_used  TEXT,
  p_tokens_in   INT              DEFAULT 0,
  p_tokens_out  INT              DEFAULT 0,
  p_cost_brl    DECIMAL          DEFAULT 0,
  p_cached      BOOLEAN          DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tier_id           TEXT;
  v_monthly_budget    INT;
  v_credits_purchased INT;
  v_effective_budget  INT;
  v_used_this_month   INT;
  v_remaining         INT;
  v_degraded          BOOLEAN := FALSE;
BEGIN
  -- Lock tenant row to prevent concurrent credit race conditions
  SELECT subscription_tier_id, ai_credits_purchased
  INTO v_tier_id, v_credits_purchased
  FROM public.tenants
  WHERE id = p_tenant_id
  FOR UPDATE;

  -- Enterprise: unlimited — bypass all budget checks
  IF v_tier_id = 'enterprise' THEN
    INSERT INTO public.ai_usage_log (
      tenant_id, user_id, feature, actions_consumed, model_used,
      actual_tokens_in, actual_tokens_out, actual_cost_brl, cached
    ) VALUES (
      p_tenant_id, p_user_id, p_feature, p_actions, p_model_used,
      p_tokens_in, p_tokens_out, p_cost_brl, p_cached
    );
    RETURN jsonb_build_object('allowed', TRUE, 'degraded', FALSE, 'remaining', 999999);
  END IF;

  -- Non-enterprise: fetch monthly budget from subscription tier
  SELECT ai_monthly_credits
  INTO v_monthly_budget
  FROM public.subscription_tiers
  WHERE id = v_tier_id;

  -- Effective budget = tier monthly credits + accumulated purchased credits
  v_effective_budget := COALESCE(v_monthly_budget, 0) + COALESCE(v_credits_purchased, 0);

  -- Count actions already consumed this calendar month
  SELECT COALESCE(SUM(actions_consumed), 0)
  INTO v_used_this_month
  FROM public.ai_usage_log
  WHERE tenant_id = p_tenant_id
    AND created_at >= date_trunc('month', NOW());

  v_remaining := v_effective_budget - v_used_this_month;

  -- Silent degradation: allowed=true always, degraded=true when budget exhausted
  IF v_remaining <= 0 THEN
    v_degraded := TRUE;
  END IF;

  -- Always log the usage (even when degraded)
  INSERT INTO public.ai_usage_log (
    tenant_id, user_id, feature, actions_consumed, model_used,
    actual_tokens_in, actual_tokens_out, actual_cost_brl, cached
  ) VALUES (
    p_tenant_id, p_user_id, p_feature, p_actions, p_model_used,
    p_tokens_in, p_tokens_out, p_cost_brl, p_cached
  );

  RETURN jsonb_build_object(
    'allowed',    TRUE,
    'degraded',   v_degraded,
    'remaining',  GREATEST(v_remaining - p_actions, 0)
  );
END;
$$;
