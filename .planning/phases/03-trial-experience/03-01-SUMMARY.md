# Phase 3 Plan 03-01 — Summary

**Completed:** 2026-03-01

## Objective

Implement trial start at onboarding and for existing sandbox tenants, and lazy trial expiry so expired trials move to sandbox without blocking (TRIAL-01, TRIAL-04).

## Delivered

1. **`supabase/migrations/20260303000000_trial_start_rpc_and_expiry.sql`**
   - **start_trial(p_tenant_id UUID):** SECURITY DEFINER; enforces has_tenant_access or super_admin; UPDATE tenants SET subscription_tier_id = 'trial', trial_ends_at = now() + 30 days, updated_at = now() WHERE id = p_tenant_id AND subscription_tier_id = 'sandbox'. Raises if no row updated. GRANT EXECUTE TO authenticated.
   - **get_tenant_licensed_modules:** Now VOLATILE; after access check, runs UPDATE to set subscription_tier_id = 'sandbox', trial_ends_at = NULL for tenants where subscription_tier_id = 'trial' AND trial_ends_at < now(); then unchanged RETURN (tier_modules UNION override). GRANT preserved.

2. **`supabase/functions/create-tenant/index.ts`**
   - INSERT into public.tenants now includes subscription_tier_id = 'trial' and trial_ends_at = now() + interval '30 days'. New tenants created via onboarding receive full trial access.

3. **Migration executed** on target DB (supabase-db) via scp + ssh docker exec.

## Verification

- start_trial(tenant_id) callable by tenant members; only sandbox tenants can start trial.
- get_tenant_licensed_modules for expired trial tenant: tenant row updated to sandbox; returned modules are sandbox modules.
- New signups via create-tenant get trial tier and trial_ends_at set (verify after next onboarding).

## Next

Proceed to Plan 03-02 (countdown UI: useTenantTrial, TrialCountdownBanner, i18n).
