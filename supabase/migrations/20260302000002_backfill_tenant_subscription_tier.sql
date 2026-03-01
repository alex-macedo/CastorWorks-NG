-- Backfill subscription_tier_id for existing tenants so get_tenant_licensed_modules returns modules.
-- Sets tenants without a tier to 'sandbox' (core + financial_basic, schedule_basic, roadmap, mobile_app).

BEGIN;

UPDATE public.tenants
SET subscription_tier_id = 'sandbox'
WHERE subscription_tier_id IS NULL;

COMMIT;
