# Phase 2 Plan 02-02 — Summary

**Completed:** 2026-03-01

## Objective

Implement frontend licensing: useLicensedModules() hook, ModuleGuard, UpgradePrompt, and sidebar filtering by required_module so that tier and overrides drive what the user can see and access.

## Delivered

1. **`src/hooks/useLicensedModules.ts`**
   - Uses useTenant() for tenantId; useQuery key ['tenant-licensed-modules', tenantId]; queryFn calls supabase.rpc('get_tenant_licensed_modules', { p_tenant_id: tenantId }); returns { modules, hasModule(id), isLoading }; staleTime 2 min; enabled when tenantId is set.

2. **`src/components/ModuleGuard.tsx`**
   - Props: module, fallback, children. Uses useLicensedModules(); when isLoading shows Loader2 spinner; when !hasModule(module) returns fallback; otherwise returns children.

3. **`src/components/UpgradePrompt.tsx`**
   - Props: module (optional). Placeholder message via i18n common:licensing.upgradePrompt and common:licensing.upgradePromptModule (with {{module}}). All four locales updated (en-US, pt-BR, es-ES, fr-FR).

4. **`src/constants/rolePermissions.ts`**
   - SidebarOptionConfig extended with optional required_module?: string. Set on: castormind-ai (ai_core), financials (financial_full), templates (templates), architect (architect_portal), mobile-app (mobile_app), supervisor (supervisor_portal), client-portal (client_portal), content-hub (content_hub), content-hub-admin (content_hub).

5. **`src/components/Layout/AppSidebar.tsx`**
   - Imports useLicensedModules; filters options so that option is kept only if (!option.required_module || hasModule(option.required_module)); while isLoadingModules, module-gated options are hidden (conservative). Applied in both database-permissions and fallback (constants) branches.

## Verification

- **What I will do:** Run `npm run validate:json`; run Phase 2 E2E (`phase2-licensing-sidebar`) to verify sidebar and module gating. Manual: switch tenant/tier to confirm sidebar items appear/disappear per tier; ModuleGuard shows UpgradePrompt when tenant lacks module.

## Next

02-03: verifyModuleAccess in Edge Functions, super admin TenantModules page and route.
