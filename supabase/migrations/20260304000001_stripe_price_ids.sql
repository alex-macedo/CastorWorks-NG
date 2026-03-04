-- Phase 4 Plan 04-01: Stripe Price ID columns on subscription_tiers
-- Populated via super admin or seed after creating products in Stripe Dashboard.

BEGIN;

ALTER TABLE public.subscription_tiers
  ADD COLUMN IF NOT EXISTS stripe_price_id_monthly TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id_annual  TEXT;

COMMENT ON COLUMN public.subscription_tiers.stripe_price_id_monthly
  IS 'Stripe Price ID for monthly billing (set in Stripe Dashboard then super admin)';
COMMENT ON COLUMN public.subscription_tiers.stripe_price_id_annual
  IS 'Stripe Price ID for annual billing (set in Stripe Dashboard then super admin)';

COMMIT;
