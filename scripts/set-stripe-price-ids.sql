-- Set Stripe Price IDs on subscription_tiers for Phase 4 checkout.
-- 1. In Stripe Dashboard create Products and recurring Prices (monthly + annual) for each tier.
-- 2. Replace the placeholder price_xxx / price_yyy below with real Price IDs from Stripe.
-- 3. Run on NG DB: scp this file to castorworks:/tmp/ then:
--    docker exec -i castorworks-ng-db psql -U postgres -d postgres < /tmp/set-stripe-price-ids.sql

BEGIN;

-- Architect Office
UPDATE public.subscription_tiers
SET stripe_price_id_monthly = 'price_xxx', stripe_price_id_annual = 'price_yyy'
WHERE id = 'arch_office';

-- Architect Office + AI
UPDATE public.subscription_tiers
SET stripe_price_id_monthly = 'price_xxx', stripe_price_id_annual = 'price_yyy'
WHERE id = 'arch_office_ai';

-- Construction
UPDATE public.subscription_tiers
SET stripe_price_id_monthly = 'price_xxx', stripe_price_id_annual = 'price_yyy'
WHERE id = 'construction';

-- Construction + AI
UPDATE public.subscription_tiers
SET stripe_price_id_monthly = 'price_xxx', stripe_price_id_annual = 'price_yyy'
WHERE id = 'construction_ai';

-- Enterprise: leave NULL for custom pricing, or set if you have a standard price
-- UPDATE public.subscription_tiers
-- SET stripe_price_id_monthly = 'price_xxx', stripe_price_id_annual = 'price_yyy'
-- WHERE id = 'enterprise';

COMMIT;
