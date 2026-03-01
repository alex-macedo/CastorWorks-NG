# Phase 2 Plan 02-01 — Summary

**Completed:** 2026-03-01

## Objective

Add licensing schema and seed so tenant tier resolves to modules and super-admin overrides are stored. Enables useLicensedModules() and Edge Function checks in later plans.

## Delivered

1. **Migration `20260302000000_license_modules_tiers_tenant_licensed.sql`**
   - `license_modules` (id, name, description, category, depends_on, created_at)
   - `subscription_tiers` (id, name, price_monthly_brl, price_annual_brl, max_*, trial_days, display_order, is_active)
   - `tier_modules` (tier_id, module_id) PK
   - `tenant_licensed_modules` (tenant_id, module_id, source 'tier'|'override', quota fields, granted_at, expires_at)
   - `tenants.subscription_tier_id` FK to subscription_tiers
   - RLS: license_modules, subscription_tiers, tier_modules — authenticated SELECT; tenant_licensed_modules — SELECT for tenant/super_admin, INSERT/UPDATE/DELETE for super_admin only
   - RPC `get_tenant_licensed_modules(p_tenant_id uuid)` RETURNS text[] — SECURITY DEFINER, enforces has_tenant_access or super_admin; returns tier modules UNION override rows (source='override', not expired)

2. **Migration `20260302000001_seed_license_modules_and_tiers.sql`**
   - Seed ~25 license_modules (core, functional, portal, ai, enterprise)
   - Seed 7 subscription_tiers (trial, sandbox, architect_office, architect_office_ai, construction, construction_ai, enterprise)
   - Seed tier_modules from PROJECT.md Tier-to-Module Matrix (Trial = all except enterprise-only; Sandbox = core, financial_basic, schedule_basic, roadmap, mobile_app; etc.)

## Verification

- **What I will do:** Run migrations in order on NG DB (scp + ssh to castorworks, docker exec castorworks-ng-db). Backfill `subscription_tier_id` for existing tenants (migration `20260302000002`). Phase 2 E2E (`npm run test:e2e -- phase2`) validates completion.
- RPC: `SELECT get_tenant_licensed_modules('<tenant_uuid>')` returns array when tenant has subscription_tier_id set and tier has tier_modules rows.

## Next

02-02: useLicensedModules hook, ModuleGuard, UpgradePrompt, sidebar required_module filter.
