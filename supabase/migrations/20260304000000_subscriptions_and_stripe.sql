-- Phase 4 Plan 04-01: subscriptions table, stripe_events idempotency, change_tenant_tier RPC
-- Enables Stripe webhook handler and tier synchronization.

BEGIN;

-- 1. subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id        TEXT,
  tier_id                TEXT NOT NULL REFERENCES public.subscription_tiers(id),
  billing_period         TEXT NOT NULL CHECK (billing_period IN ('monthly', 'annual')),
  status                 TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','trialing','past_due','canceled','unpaid','incomplete','incomplete_expired','paused')),
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  cancel_at_period_end   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_tenant_id_idx ON public.subscriptions(tenant_id);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Tenant members can read their own subscription row (has_tenant_access for tenant_id)
DROP POLICY IF EXISTS "Tenant members can view own subscription" ON public.subscriptions;
CREATE POLICY "Tenant members can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (
    public.has_tenant_access(auth.uid(), tenant_id)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

-- No INSERT or UPDATE policy: only SECURITY DEFINER / service_role can write

-- 2. stripe_events table (idempotency log)
CREATE TABLE IF NOT EXISTS public.stripe_events (
  stripe_event_id TEXT PRIMARY KEY,
  event_type      TEXT NOT NULL,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
-- No policies: only webhook (service_role) accesses it

-- 3. change_tenant_tier RPC
CREATE OR REPLACE FUNCTION public.change_tenant_tier(
  p_tenant_id              UUID,
  p_new_tier_id            TEXT,
  p_stripe_subscription_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tenants
  SET subscription_tier_id = p_new_tier_id,
      updated_at = now()
  WHERE id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant % not found', p_tenant_id;
  END IF;

  -- Refresh tenant_licensed_modules: delete then re-seed from tier (source = 'tier')
  DELETE FROM public.tenant_licensed_modules WHERE tenant_id = p_tenant_id;
  INSERT INTO public.tenant_licensed_modules (tenant_id, module_id, source)
  SELECT p_tenant_id, tm.module_id, 'tier'
  FROM public.tier_modules tm
  WHERE tm.tier_id = p_new_tier_id;

  IF p_stripe_subscription_id IS NOT NULL THEN
    UPDATE public.subscriptions
    SET tier_id   = p_new_tier_id,
        updated_at = now()
    WHERE stripe_subscription_id = p_stripe_subscription_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.change_tenant_tier(UUID, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.change_tenant_tier(UUID, TEXT, TEXT) IS
  'Updates tenant tier and tenant_licensed_modules. Called by Stripe webhook or admin. Service role only.';

-- 4. updated_at trigger for subscriptions
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_subscriptions_updated_at'
  ) THEN
    CREATE TRIGGER set_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
END $$;

COMMIT;
