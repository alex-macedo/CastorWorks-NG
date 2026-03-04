# Phase 4 Plan 04-01 — Summary

**Completed:** 2026-03-01

## Delivered

- **Migrations**
  - `20260304000000_subscriptions_and_stripe.sql` — `subscriptions` table (RLS, SELECT for tenant members via `has_tenant_access`), `stripe_events` idempotency table, `change_tenant_tier(UUID, TEXT, TEXT)` SECURITY DEFINER RPC, `set_updated_at` trigger on `subscriptions`.
  - `20260304000001_stripe_price_ids.sql` — `stripe_price_id_monthly` and `stripe_price_id_annual` on `subscription_tiers`.
- **Edge Function** `stripe-webhook/index.ts` — Stripe signature verification (Deno + createSubtleCryptoProvider), idempotency via `stripe_events`, handlers for `customer.subscription.created/updated/deleted`, `invoice.payment_succeeded/failed`; calls `change_tenant_tier` for tier sync.
- **Authorization** — `verifyTenantAccess(req, tenantId)` added to `_shared/authorization.ts` for Edge Functions that accept `tenant_id` in body.

## Notes

- Migrations use timestamps `20260304*` so they run after existing Phase 2/3 migrations.
- `change_tenant_tier` refreshes `tenant_licensed_modules` with `source = 'tier'` (schema uses `source`, not `enabled`).
- Run migrations on target DB: `scp ... 20260304000000_*.sql castorworks:/tmp/` then `ssh castorworks "docker exec -i supabase-db psql ..."` (or `supabase-ng-db` per PROJECT.md).
- Set Edge Function secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
