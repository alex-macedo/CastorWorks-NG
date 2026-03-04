# Stripe setup for Phase 4 (Payment & Subscription)

This runbook configures Stripe so Phase 4 payment and subscription flows work end-to-end with CastorWorks-NG.

## Prerequisites

- Phase 4 migrations already applied on the NG database (`subscriptions`, `stripe_events`, `change_tenant_tier`, `stripe_price_id_*` columns). See below if not done.
- Access to the CastorWorks-NG Supabase env (e.g. `docs/.env.supabase` on the server) and ability to restart Edge Functions.

## 1. Run Phase 4 migrations (if not already done)

From the project root:

```bash
scp -i ~/.ssh/castorworks_deploy supabase/migrations/20260304000000_subscriptions_and_stripe.sql supabase/migrations/20260304000001_stripe_price_ids.sql castorworks:/tmp/
ssh -i ~/.ssh/castorworks_deploy castorworks "docker exec -i castorworks-ng-db psql -U postgres -d postgres < /tmp/20260304000000_subscriptions_and_stripe.sql"
ssh -i ~/.ssh/castorworks_deploy castorworks "docker exec -i castorworks-ng-db psql -U postgres -d postgres < /tmp/20260304000001_stripe_price_ids.sql"
```

## 2. Stripe account and API keys

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com).
2. **Developers → API keys**: copy the **Secret key** (starts with `sk_`). Put it in `STRIPE_SECRET_KEY` in `docs/.env.supabase` (and on the server in step 5).
3. (Optional) For client-side Stripe.js later: copy **Publishable key** (`pk_`) and set `VITE_STRIPE_PUBLISHABLE_KEY` in `.env.local` if needed.

## 3. Create Products and Prices in Stripe (automated)

From the project root, with `STRIPE_SECRET_KEY` set in `docs/.env.supabase` or in the environment:

```bash
node scripts/stripe-phase4-setup.mjs
```

This script creates one Product per tier (arch_office, arch_office_ai, construction, construction_ai) with monthly and annual Prices in BRL, registers the webhook endpoint, and **prints the SQL** to update `subscription_tiers`. Copy the printed SQL and run it on the NG DB (see step 4). It also prints the webhook **signing secret**—add it as `STRIPE_WEBHOOK_SECRET` on the server and restart Edge Functions.

Manual alternative (if you prefer to create products in the Dashboard):

| Tier ID            | Product name (example) | Monthly (BRL) | Annual (BRL/mo) |
|--------------------|------------------------|---------------|------------------|
| arch_office        | Architect Office       | R$ 349        | R$ 279           |
| arch_office_ai     | Architect Office + AI  | R$ 599        | R$ 479           |
| construction       | Construction           | R$ 999        | R$ 799           |
| construction_ai    | Construction + AI      | R$ 1,499      | R$ 1,199         |
| enterprise         | Enterprise             | Custom        | Custom           |

Create each product and two Prices (recurring monthly, recurring yearly in BRL), then run the SQL in step 4 with the Price IDs from the Dashboard.

## 4. Set Stripe Price IDs in the database

If you used the script in step 3, run the SQL it printed. Otherwise, after creating Prices in the Stripe Dashboard, update `subscription_tiers` with your Price IDs:

```sql
-- Replace price_xxx with real Price IDs from Stripe Dashboard.
UPDATE public.subscription_tiers SET stripe_price_id_monthly = 'price_xxx', stripe_price_id_annual = 'price_yyy' WHERE id = 'arch_office';
UPDATE public.subscription_tiers SET stripe_price_id_monthly = 'price_xxx', stripe_price_id_annual = 'price_yyy' WHERE id = 'arch_office_ai';
UPDATE public.subscription_tiers SET stripe_price_id_monthly = 'price_xxx', stripe_price_id_annual = 'price_yyy' WHERE id = 'construction';
UPDATE public.subscription_tiers SET stripe_price_id_monthly = 'price_xxx', stripe_price_id_annual = 'price_yyy' WHERE id = 'construction_ai';
-- Enterprise: optional, or leave NULL for custom quotes.
```

To run remotely:

```bash
# Save the UPDATE statements to a file, then:
scp -i ~/.ssh/castorworks_deploy /path/to/update-stripe-prices.sql castorworks:/tmp/
ssh -i ~/.ssh/castorworks_deploy castorworks "docker exec -i castorworks-ng-db psql -U postgres -d postgres < /tmp/update-stripe-prices.sql"
```

Or use the helper script: `scripts/set-stripe-price-ids.sql` (fill in your Price IDs and run as above).

## 5. Add Stripe secrets to Supabase env

On the server where CastorWorks-NG Supabase runs (e.g. `/root/supabase-CastorWorks-NG/.env`):

1. Add or set:
   - `STRIPE_SECRET_KEY` — Secret key from step 2.
   - `STRIPE_WEBHOOK_SECRET` — Signing secret from step 6 (after registering the webhook).
   - `APP_URL` — Public app URL for redirects, e.g. `https://devng.castorworks.cloud`.

2. Restart the Edge Functions container so it picks up the new env (exact container name may vary):

   ```bash
   ssh -i ~/.ssh/castorworks_deploy castorworks "cd /root/supabase-CastorWorks-NG && docker compose restart <edge-functions-service-name>"
   ```

## 6. Register Stripe webhook

1. **Stripe Dashboard → Developers → Webhooks → Add endpoint**.
2. **Endpoint URL**: `https://devng.castorworks.cloud/functions/v1/stripe-webhook`  
   (Use your actual NG functions base URL if different.)
3. **Events to send**: select:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. After creating the endpoint, open it and reveal **Signing secret**. Set it as `STRIPE_WEBHOOK_SECRET` in the Supabase env (step 5) and restart Edge Functions.

## 7. Deploy Phase 4 Edge Functions

Deploy these functions to the **CastorWorks-NG** Edge Functions runtime (not the original CastorWorks):

- `stripe-webhook`
- `create-checkout-session`
- `create-billing-portal-session`
- `_shared` (for `authorization.ts` used by the checkout/portal functions)

From the project root:

```bash
./deploy/deploy-edge-functions-ng.sh _shared stripe-webhook create-checkout-session create-billing-portal-session
```

If the NG edge container has a different Compose service name, set it before running:  
`EDGE_CONTAINER_NAME=edge-functions ./deploy/deploy-edge-functions-ng.sh ...`

## 8. Verify end-to-end

1. **Webhook**: In Stripe Dashboard → Webhooks → your endpoint, use **Send test webhook** (e.g. `customer.subscription.created`). Check Edge Function logs; the handler should return 200 and log the event in `stripe_events`.
2. **Checkout**: In the app, as a tenant on trial, click **Upgrade Now** in the trial banner (or open Settings → Subscription). Choose a plan and billing period, confirm → you should be redirected to Stripe Checkout. Use Stripe test card `4242 4242 4242 4242` to complete payment; then you should be redirected back to `/settings/subscription?success=1`.
3. **Portal**: With an active subscription, click **Manage Billing** on the Subscription page → you should be redirected to the Stripe Customer Portal.

## Troubleshooting

- **Checkout returns "Stripe price not configured"**: Run the UPDATEs in step 4 for the tier you selected; ensure Price IDs are correct and not expired.
- **Webhook returns 400**: Check that `STRIPE_WEBHOOK_SECRET` matches the endpoint’s signing secret and that the Edge Function receives the raw body for signature verification.
- **Redirect goes to wrong URL**: Set `APP_URL` in the Supabase env to the exact base URL of the NG app (e.g. `https://devng.castorworks.cloud`).
