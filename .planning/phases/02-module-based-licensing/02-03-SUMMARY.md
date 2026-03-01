# Phase 2 Plan 02-03 — Summary

**Completed:** 2026-03-01

## Objective

Add Edge Function shared helper verifyModuleAccess() and super admin UI to add/remove override modules per tenant. Satisfies Phase 2 success criteria 2 and 5.

## Delivered

1. **`supabase/functions/_shared/authorization.ts`**
   - Added `verifyModuleAccess(client, userId, tenantId, moduleId): Promise<void>`.
   - Calls `has_tenant_access` via callBooleanFunction; throws "Access denied to tenant" if false.
   - Calls `client.rpc('get_tenant_licensed_modules', { p_tenant_id: tenantId })`; throws "Module not licensed" if error, !Array.isArray(data), or !data.includes(moduleId).
   - Caller passes userId and tenantId after auth; uses same service-role client for RPC.

2. **`src/pages/Admin/TenantModules.tsx`**
   - Route param `id` (tenantId) from `/admin/tenants/:id/modules`.
   - Fetches tenant (name, slug, subscription_tier_id), override rows from tenant_licensed_modules (source='override'), and license_modules for dropdown.
   - Displays tenant name; list of override module_ids with Remove button (DELETE from tenant_licensed_modules where tenant_id, module_id, source='override').
   - "Add module" select (modules not already in overrides) and submit (INSERT into tenant_licensed_modules with source='override').
   - TanStack Query; on insert/delete invalidates ['admin', 'tenant-modules', tenantId] and ['tenant-licensed-modules', tenantId].
   - Back link to /admin/tenants. RoleGuard applied at route level (super_admin).

3. **`src/App.tsx`**
   - Lazy TenantModules; route `/admin/tenants/:id/modules` with RoleGuard allowedRoles={["super_admin"]}.

4. **`src/pages/Admin/TenantList.tsx`**
   - Added "Modules" column with link to `/admin/tenants/${tenant.id}/modules`.

5. **i18n**
   - common:adminTenantModules (title, subtitle, addModule, addModulePlaceholder, remove, noOverrides, added, removed, invalidTenant) and common:adminTenants.modules in en-US, pt-BR, es-ES, fr-FR.

## Verification

- **What I will do:** Run Phase 2 E2E (`phase2-admin-tenant-modules`) to verify admin tenants list and (with E2E_TENANT_ID) tenant modules page. Manual: As super_admin, add/remove override and confirm useLicensedModules() updates. Edge Functions: call verifyModuleAccess(client, userId, tenantId, moduleId) after auth.

## Next

Phase 2 complete. Proceed to Phase 3 (Trial & Subscription Management) or run Phase 2 verification (tier change, sidebar, ModuleGuard, super admin overrides).
