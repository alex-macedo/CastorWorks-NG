# Phase 3: Trial Experience — Research

**Researched:** 2026-03-01  
**Domain:** 30-day trial start, countdown UI, sandbox fallback on expiry  
**Confidence:** HIGH

## Summary

Phase 3 delivers TRIAL-01, TRIAL-02, TRIAL-04: users can start a 30-day trial with full access to licensed modules, see a countdown for remaining days, and when the trial expires the tenant moves to sandbox without being blocked. The schema already has `tenants.trial_ends_at` (Phase 1) and `tenants.subscription_tier_id` (Phase 2). The `subscription_tiers` seed includes a `trial` tier with `trial_days = 30` and full module set (except enterprise-only). `get_tenant_licensed_modules` resolves modules from `subscription_tier_id` only; it does not yet consider `trial_ends_at`. Onboarding creates tenants via Edge Function `create-tenant`, which currently inserts only `name` and `slug` (no tier or trial). TenantContext fetches `tenants(id, name, slug)` and does not expose `trial_ends_at`.

**Decisions:**

1. **Trial start:** New tenants start trial at onboarding. Set `subscription_tier_id = 'trial'` and `trial_ends_at = now() + interval '30 days'` in `create-tenant`. Existing sandbox tenants get an RPC `start_trial(p_tenant_id)` so they can opt in (e.g. from UpgradePrompt or a "Start trial" CTA).
2. **Licensing during trial:** Use the existing `trial` tier. No RPC change for module resolution; when tier is `trial`, `get_tenant_licensed_modules` already returns trial-tier modules.
3. **Expiry:** Lazy expiry inside `get_tenant_licensed_modules`: at start of the function, if tenant has `subscription_tier_id = 'trial'` and `trial_ends_at < now()`, run a single-row `UPDATE tenants SET subscription_tier_id = 'sandbox', trial_ends_at = NULL WHERE id = p_tenant_id` then proceed with normal resolution. No cron or Edge Function scheduler required; next RPC call (e.g. useLicensedModules) triggers the move.
4. **Countdown UI:** Extend tenant fetch (TenantContext or dedicated hook) to include `trial_ends_at` and `subscription_tier_id` for the current tenant; show a banner or settings line when `trial_ends_at` is set and in the future. i18n for en-US, pt-BR, es-ES, fr-FR.

## Requirements Coverage

| ID       | Description | Approach |
|----------|-------------|----------|
| TRIAL-01 | User can start a 30-day trial with full access to licensed modules | create-tenant sets trial tier + trial_ends_at; start_trial RPC for existing tenants; trial tier has full modules in tier_modules |
| TRIAL-02 | User sees countdown UI for remaining trial days | Tenant data with trial_ends_at in context/hook; banner or settings with "X days left"; i18n |
| TRIAL-04 | When trial expires, tenant falls back to sandbox (no hard block) | get_tenant_licensed_modules runs lazy UPDATE to sandbox when trial_ends_at < now(); no blocking gate |

## Existing Assets

- `tenants.trial_ends_at` — already in schema (Phase 1).
- `tenants.subscription_tier_id` — already in schema (Phase 2).
- `subscription_tiers`: `trial` (trial_days=30, full modules), `sandbox` (limited modules).
- `get_tenant_licensed_modules(p_tenant_id)` — returns modules by tier; no trial_ends_at logic yet.
- `create-tenant` Edge Function — inserts tenant with name, slug only.
- TenantContext — fetches tenants with id, name, slug; used by useLicensedModules and layout.

## Out of Scope (Phase 3)

- TRIAL-03 (trial-to-paid) → Phase 4.
- Payment gateway, subscription management, billing, emails → Phases 4–6.

## Technical Notes

- RLS: tenants UPDATE policy is not present for tenant members; only SELECT and INSERT. Expiry UPDATE runs inside SECURITY DEFINER `get_tenant_licensed_modules`, so it must perform the UPDATE with elevated privileges. Alternatively, add a SECURITY DEFINER function `move_expired_trial_to_sandbox(p_tenant_id)` that does the UPDATE and is called at the start of `get_tenant_licensed_modules`, or do the UPDATE in the same function (which is already DEFINER). Same-function UPDATE is simpler: the RPC already has DEFINER; we can run `UPDATE tenants SET ... WHERE id = p_tenant_id AND subscription_tier_id = 'trial' AND trial_ends_at IS NOT NULL AND trial_ends_at < now()` before the SELECT. RLS does not apply to DEFINER execution, so the UPDATE will succeed.
- start_trial RPC: must enforce has_tenant_access(auth.uid(), p_tenant_id) and optionally restrict to current tier = sandbox so only sandbox tenants can start a trial (or allow any non-trial tenant to "restart" — product decision; plan assumes "only if currently sandbox" for simplicity).
