# Phase 4 Plan 04-02 — Summary

**Completed:** 2026-03-01

## Delivered

- **Edge Functions**
  - `create-checkout-session/index.ts` — Validates body (tenant_id, tier_id, billing_period), verifies tenant access, resolves Stripe price from `subscription_tiers`, gets or creates Stripe customer and subscription row, creates Checkout session with metadata; returns `{ url }`. CORS and OPTIONS handled.
  - `create-billing-portal-session/index.ts` — Validates tenant_id, verifies tenant access, looks up stripe_customer_id from subscriptions, creates Customer Portal session; returns `{ url }`.
- **Hook** `useSubscription.ts` — TanStack Query key `['tenant', tenantId, 'subscription']`; returns subscription, isActive, isCancelling, currentTier, isLoading, error.
- **Component** `SubscriptionCheckoutFlow.tsx` — Fetches active paid tiers (excludes sandbox/trial), monthly/annual toggle, tier cards, confirm button invokes `create-checkout-session` and redirects to Stripe Checkout.
- **TrialCountdownBanner** — "Upgrade Now" button and Dialog with SubscriptionCheckoutFlow; trial locale keys `upgradeNow` added in all 4 locales.
- **i18n** — `subscription` namespace added to critical and ns; `subscription.json` (en-US, pt-BR, es-ES, fr-FR) with tierPicker and payment strings.

## Notes

- Success/cancel redirect handling and toasts implemented in SubscriptionPage (Plan 04-03).
- APP_URL env for Edge Functions defaults to `http://localhost:5181` when unset.
