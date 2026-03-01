# Phase 3 Plan 03-02 — Summary

**Completed:** 2026-03-01

## Objective

Expose trial end date to the app and show a countdown UI so users see remaining trial days (TRIAL-02).

## Delivered

1. **`src/hooks/useTenantTrial.ts`**
   - Uses useTenantId(); when tenantId is set, queries `tenants(trial_ends_at, subscription_tier_id)` for current tenant.
   - Returns `{ trial_ends_at, subscription_tier_id, daysRemaining, isOnTrial, isLoading }`. daysRemaining = max(0, ceil((end - now) / MS_PER_DAY)); isOnTrial = subscription_tier_id === 'trial' && trial_ends_at in future.
   - TanStack Query key `['tenant', tenantId, 'trial']`, staleTime 2 min.

2. **`src/components/TrialCountdownBanner.tsx`**
   - Uses useTenantTrial and useTranslation('trial'). When isOnTrial && daysRemaining !== null, renders Alert with "X days left in your trial" (or "1 day left" for count 1). Non-blocking, compact.

3. **`src/App.tsx`**
   - Import TrialCountdownBanner; render after ScheduledMaintenanceBanner inside main (DesktopRouteLayout).

4. **i18n**
   - New namespace `trial`: `src/locales/{en-US,pt-BR,es-ES,fr-FR}/trial.json` with keys daysLeft, daysLeft_one, endsOn. Added trial to criticalTranslations and i18n ns list.

## Verification

- npm run validate:json passes. User on trial sees banner with remaining days; after expiry (or backdate trial_ends_at) banner does not show; no hard block.

## Next

Phase 3 complete. Proceed to Phase 4 (Payment & Subscription Management) or run E2E/manual verification for trial flow.
