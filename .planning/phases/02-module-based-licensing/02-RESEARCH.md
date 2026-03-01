# Phase 2: Module-Based Licensing - Research

**Researched:** 2026-03-01  
**Domain:** Tier-to-module licensing, runtime feature gating, DB schema for licenses, frontend guards and sidebar filtering, Edge Function authorization  
**Confidence:** HIGH

## Summary

Phase 2 adds flexible feature gating so that tenant tier (and super-admin overrides) determine which modules are available at runtime. All enforcement uses **modules** only; tiers are commercial bundles that resolve to a set of modules. The codebase already has TenantContext (tenantId, set_tenant_context RPC), useSidebarPermissions (role-based option/tab access), and Edge Functions that call verifyProjectAccess/verifyAdminRole from `_shared/authorization.ts`. The current `tenants` table has no `subscription_tier_id`; PROJECT.md defines the target schema (license_modules, subscription_tiers, tier_modules, tenant_licensed_modules). Success requires: (1) tenant tier → modules; (2) super admin per-tenant module overrides; (3) useLicensedModules() + ModuleGuard in the app; (4) sidebar filtered by required_module + license; (5) Edge Functions verifying module access via shared authorization.

**Primary recommendation:** Add licensing tables and `subscription_tier_id` on tenants in migrations; seed modules and tier→module mappings from PROJECT.md; implement useLicensedModules() (tenant-scoped, tier + overrides); add ModuleGuard and UpgradePrompt; extend sidebar config and filtering with required_module; add verifyModuleAccess (and optionally verifyTenantAccess) in _shared/authorization.ts; then wrap feature routes and call verifyModuleAccess in Edge Functions that are module-gated.

---

## User Constraints

No CONTEXT.md was found for Phase 2. Research is unconstrained by locked decisions. Planner should follow PROJECT.md Phase 2 scope and ROADMAP success criteria.

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| P2-1 | Tenant tier determines which modules are available; switching tier changes access | Schema: subscription_tiers, tier_modules, tenants.subscription_tier_id; resolution: tier modules + tenant_licensed_modules overrides |
| P2-2 | Super admin can add/remove individual modules per tenant | tenant_licensed_modules with source 'tier' \| 'override'; super admin UI to insert/delete override rows |
| P2-3 | useLicensedModules() and ModuleGuard enforce access in the app | Hook: TanStack Query for effective modules; guard component that checks hasModule(moduleId) and renders fallback or children |
| P2-4 | Sidebar options filter by required_module and tenant license | Add required_module to SidebarOptionConfig (and optionally to sidebar_option_permissions); filter: hasOptionAccess(option) && (!required_module \|\| hasModule(required_module)) |
| P2-5 | Edge Functions verify module access via shared authorization | verifyModuleAccess(supabase, userId, tenantId, moduleId) in _shared/authorization.ts; call after authenticateRequest and tenant context known |

---

## Standard Stack

### Core (existing)

| Library / System | Version / Usage | Purpose |
|------------------|-----------------|---------|
| React 19 + Vite 7 | Project standard | UI |
| TanStack Query | Existing | Server state for licensed modules, cache invalidation on tenant/tier change |
| Supabase (Postgres) | Remote, migrations via SSH | license_modules, subscription_tiers, tier_modules, tenant_licensed_modules; RLS on new tables |
| TenantContext | Phase 1 | tenantId for useLicensedModules() and set_tenant_context |

### New / extended

| Component | Purpose |
|-----------|---------|
| useLicensedModules() | Hook returning { modules: string[], hasModule(id): boolean, isLoading }. Must run inside TenantProvider; keyed by tenantId. |
| ModuleGuard | Component: &lt;ModuleGuard module="financial_full" fallback={&lt;UpgradePrompt /&gt;}&gt;{children}&lt;/ModuleGuard&gt; |
| verifyModuleAccess() | Edge Function shared helper: verify user has tenant access and tenant has module (via tenant_licensed_modules or tier). |
| required_module on sidebar | Optional field on SidebarOptionConfig; filter in AppSidebar with hasModule(option.required_module). |

**Alternatives considered:** Keeping tier names in runtime checks (rejected — PROJECT.md: "All runtime permission checks operate on modules, never tier names"). Building a custom entitlement service (rejected — DB-driven with tier_modules + tenant_licensed_modules is sufficient and matches PROJECT.md).

---

## Architecture Patterns

### Recommended project structure (additions)

```
src/
  contexts/          TenantContext.tsx (existing; no need to hold modules)
  hooks/
    useLicensedModules.ts   # NEW: effective modules for current tenant
  components/
    ModuleGuard.tsx         # NEW: gate by module
    UpgradePrompt.tsx      # NEW: upsell/upgrade UI (optional placeholder)
  constants/
    rolePermissions.ts     # EXTEND: add required_module to SidebarOptionConfig
supabase/
  migrations/
    YYYYMMDD_license_modules_tiers_tenant_licensed.sql   # NEW
    YYYYMMDD_tenants_add_subscription_tier_id.sql        # NEW (or in same migration)
  functions/
    _shared/
      authorization.ts     # EXTEND: verifyModuleAccess, optionally verifyTenantAccess
```

### Pattern 1: Resolving effective modules for a tenant

**What:** Tenant’s effective modules = modules from tier (tier_modules for tenant’s subscription_tier_id) plus overrides from tenant_licensed_modules (source = 'override'). Overrides can add or remove (delete row = remove module; insert = add). PROJECT.md uses source 'tier' | 'override'; tier rows can be materialized when tier is set, or computed: "all from tier minus revoked overrides plus granted overrides."

**When to use:** useLicensedModules() and any server-side check (Edge Function, RPC).

**Options:**

- **A (recommended):** Single RPC `get_tenant_licensed_modules(tenant_id uuid)` returns `text[]` of module IDs. Implementation: (1) tier modules from tier_modules join tenants; (2) union with tenant_licensed_modules where source = 'override' and expires_at is null; (3) exclude module_ids that have an override row with a "revoked" sentinel (or use tenant_licensed_modules to mean "granted" only, and tier gives base set — then overrides are only additive). PROJECT.md says "add/remove individual modules" so overrides must support both add and remove: e.g. tenant_licensed_modules rows with source='override' and a "granted" boolean, or two tables (granted_overrides, revoked_overrides). Simplest: tenant_licensed_modules holds all effective modules for the tenant (tier + additive overrides); a "revoke" is implemented by not including that module_id in the view/RPC (e.g. a separate tenant_module_revokes table). Even simpler: one table tenant_licensed_modules (tenant_id, module_id, source). For tier: repopulate or derive from tier_modules. For override: INSERT = add module, DELETE = remove module. So "effective modules" = (tier_modules for tenant’s tier) UNION (tenant_licensed_modules where source='override') MINUS (optional revoke table). PROJECT schema has tenant_licensed_modules with source 'tier' | 'override' — so tier-sourced rows could be materialized when tier is assigned, and override rows are explicit adds. Then effective = all module_ids in tenant_licensed_modules for that tenant. Materializing tier into tenant_licensed_modules on tier change keeps resolution to a single table read.
- **B:** View or RPC that joins tenants → subscription_tiers → tier_modules and union tenant_licensed_modules (source='override'). No materialization; always live.

**Recommendation:** Use an RPC `get_tenant_licensed_modules(p_tenant_id uuid)` that returns the set of module IDs (e.g. `SETOF text` or `text[]`). Implement as: (tier modules from tier_modules JOIN subscription_tiers ON tenants.subscription_tier_id) UNION (SELECT module_id FROM tenant_licensed_modules WHERE tenant_id = p_tenant_id AND source = 'override'). So overrides are additive only. To "remove" a module from a tier, add a table tenant_module_revokes(tenant_id, module_id) and in the RPC exclude those module_ids. Alternatively, document that "remove" is implemented by deleting from tenant_licensed_modules for source='override' and not having that module in tier — then overrides are additive; "remove" is only for modules that would otherwise come from tier, which requires a revoke table. PROJECT says "add/remove individual modules" — so support both: overrides add, revokes remove. Schema: tenant_licensed_modules (tenant_id, module_id, source 'tier'|'override'); tenant_module_revokes (tenant_id, module_id) for tier modules to hide. RPC: (tier_modules for tenant’s tier UNION tenant_licensed_modules WHERE source='override') EXCEPT (SELECT module_id FROM tenant_module_revokes WHERE tenant_id = p_tenant_id).

**Example (additive overrides only; no revoke table in first cut):**

```sql
-- Effective modules = tier modules + override rows
CREATE OR REPLACE FUNCTION get_tenant_licensed_modules(p_tenant_id uuid)
RETURNS text[] AS $$
  SELECT array_agg(DISTINCT m.module_id) FROM (
    SELECT tm.module_id FROM tenants t
    JOIN tier_modules tm ON tm.tier_id = t.subscription_tier_id
    WHERE t.id = p_tenant_id
    UNION
    SELECT tlm.module_id FROM tenant_licensed_modules tlm
    WHERE tlm.tenant_id = p_tenant_id AND tlm.source = 'override'
      AND (tlm.expires_at IS NULL OR tlm.expires_at > now())
  ) m
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
```

Then super admin "add module" = INSERT into tenant_licensed_modules (tenant_id, module_id, source='override'). "Remove module" = if from tier, need revoke table; if from override, DELETE. For Phase 2 minimal, overrides additive only and "remove" = delete override row (so only override-sourced modules can be removed).

### Pattern 2: useLicensedModules() hook

**What:** Hook that returns the list of licensed module IDs for the current tenant and a hasModule(id) helper. Must be used inside TenantProvider; depends on tenantId.

**When to use:** Any component that needs to show/hide or guard by module (sidebar, ModuleGuard, feature pages).

**Example:**

```typescript
// useLicensedModules.ts
export function useLicensedModules(): {
  modules: string[];
  hasModule: (moduleId: string) => boolean;
  isLoading: boolean;
} {
  const { tenantId } = useTenant();
  const { data, isLoading } = useQuery({
    queryKey: ['tenant-licensed-modules', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase.rpc('get_tenant_licensed_modules', { p_tenant_id: tenantId });
      if (error) throw error;
      return (data ?? []) as string[];
    },
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 2, // 2 min
  });
  const modules = data ?? [];
  const hasModule = useCallback((id: string) => modules.includes(id), [modules]);
  return { modules, hasModule, isLoading };
}
```

Invalidate query when tenant changes (tenantId in key) or when super admin updates overrides (e.g. after mutation invalidate ['tenant-licensed-modules', tenantId]).

### Pattern 3: ModuleGuard and UpgradePrompt

**What:** ModuleGuard wraps children and renders fallback (e.g. UpgradePrompt) when the tenant does not have the required module.

**When to use:** Wrap route-level or section-level UI that belongs to a licensed module.

**Example:**

```tsx
<ModuleGuard module="financial_full" fallback={<UpgradePrompt module="financial_full" />}>
  <FinancialLedgerPage />
</ModuleGuard>
```

ModuleGuard uses useLicensedModules(). If loading, show spinner; if !hasModule(module), render fallback; else render children. UpgradePrompt can be a simple placeholder with tier comparison link (Phase 3 can fill in real upgrade flow).

### Pattern 4: Sidebar filtering by required_module

**What:** Each sidebar option can declare an optional required_module. Show option only if user has role access and tenant has the module (or no required_module).

**When to use:** AppSidebar already filters by hasOptionAccess(option.id). Add: if option.required_module, require hasModule(option.required_module).

**Implementation:** Extend SidebarOptionConfig in rolePermissions.ts with optional required_module?: string. In AppSidebar, when building filtered list: keep option only if (!option.required_module || hasModule(option.required_module)) and existing role check. Map each option id to a module from PROJECT.md (e.g. financials → financial_full, templates → templates, castormind-ai → ai_core).

### Pattern 5: Edge Function verifyModuleAccess

**What:** After authenticating the user and knowing the tenant (from request body or from project → tenant), verify the tenant has the given module before performing module-gated work.

**When to use:** Every Edge Function that implements a feature belonging to a specific module (e.g. financial_full, ai_core).

**Signature (recommended):** verifyModuleAccess(supabase: SupabaseClient, userId: string, tenantId: string, moduleId: string): Promise&lt;void&gt; — throws if no access. Implementation: (1) Verify user has tenant access (has_tenant_access(userId, tenantId) via RPC or service-role read of tenant_users). (2) Call get_tenant_licensed_modules(tenantId) or equivalent and check moduleId is in the set. Use service role client so RLS does not block.

**Tenant source:** For project-scoped Edge Functions, tenantId can be derived from project_id (select tenant_id from projects where id = project_id). For tenant-scoped calls, client can send tenant_id in body/header; then verify has_tenant_access(userId, tenantId) first.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Effective module set for tenant | Ad-hoc JOINs in frontend or multiple queries | RPC get_tenant_licensed_modules(tenant_id) | Single source of truth, RLS/SECURITY DEFINER under control, cacheable by key |
| Feature gate in UI | Inline if (tier === 'x') | ModuleGuard + useLicensedModules().hasModule(moduleId) | Tiers can change; modules are stable; one place to change behavior |
| "Can user use this Edge Function?" | Custom per-function logic | verifyModuleAccess() in _shared/authorization.ts | Consistent pattern; same as verifyProjectAccess |
| Upgrade / paywall UI | One-off modal per page | UpgradePrompt component with module prop (i18n key by module) | Reusable, consistent messaging |

---

## Common Pitfalls

### Pitfall 1: Forgetting to invalidate licensed modules after tier or override change

**What goes wrong:** User or super admin changes tier or overrides; UI still shows old modules until refresh.

**Why it happens:** TanStack Query cache for ['tenant-licensed-modules', tenantId] is not invalidated.

**How to avoid:** After any mutation that changes tenant tier or tenant_licensed_modules (or tenant_module_revokes), invalidate queryClient for ['tenant-licensed-modules', tenantId]. If super admin changes another tenant, that tenant’s key is different; consider invalidating all tenant-licensed-modules if admin panel is used by same browser.

**Warning signs:** Tests or manual checks that change tier and still see old sidebar/guards without reload.

### Pitfall 2: Checking tier name in code instead of module

**What goes wrong:** if (tier === 'Construction+AI') — tiers are marketing; renames or new tiers break logic.

**Why it happens:** PROJECT.md explicitly says "Tiers are marketing, modules are engineering."

**How to avoid:** All guards and Edge Function checks use module IDs only (e.g. hasModule('ai_core'), verifyModuleAccess(..., 'financial_full')).

### Pitfall 3: RLS blocking get_tenant_licensed_modules or license tables

**What goes wrong:** Anonymous or authenticated RLS prevents reading tier_modules or tenant_licensed_modules so hook or RPC fails.

**Why it happens:** New tables have RLS enabled; policies must allow members of that tenant (or super_admin) to read.

**How to avoid:** RPC get_tenant_licensed_modules is SECURITY DEFINER and should enforce that the caller (auth.uid()) has_tenant_access(auth.uid(), p_tenant_id) or is super_admin. Table policies: tenants can read their own tenant’s license data; super_admin can read/write all. Do not expose service role to client.

### Pitfall 4: Sidebar shows option by role but not by module (or vice versa)

**What goes wrong:** Option visible to role but tenant has no module (user sees 403 or blank after click); or option hidden when tenant has module but role logic is wrong.

**How to avoid:** Single filter: show option only if hasOptionAccess(option.id) && (!option.required_module || hasModule(option.required_module)). Document required_module for each option in SIDEBAR_OPTIONS.

### Pitfall 5: Edge Function trusts client-sent tenant_id without verifying membership

**What goes wrong:** Attacker sends another tenant’s ID and gets that tenant’s module list or performs actions.

**How to avoid:** verifyModuleAccess (or a dedicated verifyTenantAccess) must call has_tenant_access(userId, tenantId) before any tenant-scoped action or module check. Use Supabase RPC or service-role read to tenant_users.

### Pitfall 6: Adding licensing to an existing app — routes unprotected

**What goes wrong:** Sidebar hides items but direct URL still loads the page (e.g. /financial-ledger) because route is not wrapped with ModuleGuard.

**How to avoid:** Wrap every route that corresponds to a licensed module with ModuleGuard (or a route-level wrapper that uses useLicensedModules and redirects/shows UpgradePrompt). Plan a pass over all feature routes and map each to a module from PROJECT.md.

---

## Code Examples

### Effective modules RPC (additive overrides; no revoke in first cut)

```sql
CREATE OR REPLACE FUNCTION public.get_tenant_licensed_modules(p_tenant_id uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_tenant_access(auth.uid(), p_tenant_id)
     AND NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied to tenant';
  END IF;
  RETURN (
    SELECT COALESCE(array_agg(DISTINCT m.module_id ORDER BY m.module_id), '{}')
    FROM (
      SELECT tm.module_id
      FROM public.tenants t
      JOIN public.tier_modules tm ON tm.tier_id = t.subscription_tier_id
      WHERE t.id = p_tenant_id
      UNION
      SELECT tlm.module_id
      FROM public.tenant_licensed_modules tlm
      WHERE tlm.tenant_id = p_tenant_id
        AND tlm.source = 'override'
        AND (tlm.expires_at IS NULL OR tlm.expires_at > now())
    ) m
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_tenant_licensed_modules(uuid) TO authenticated;
```

### ModuleGuard (conceptual)

```tsx
function ModuleGuard({ module, fallback, children }: { module: string; fallback: ReactNode; children: ReactNode }) {
  const { hasModule, isLoading } = useLicensedModules();
  if (isLoading) return <Spinner />;
  if (!hasModule(module)) return <>{fallback}</>;
  return <>{children}</>;
}
```

### Sidebar filter (extend existing)

```ts
// In AppSidebar, where filtered options are built:
const { hasModule } = useLicensedModules();
const filtered = SIDEBAR_OPTIONS.filter(option => {
  const roleOk = optionPermissions.has(option.id) ? hasOptionAccess(option.id) : (option.allowedRoles?.some(...) ?? false);
  const moduleOk = !option.required_module || hasModule(option.required_module);
  return roleOk && moduleOk;
});
```

### verifyModuleAccess (Edge Function shared)

```typescript
export async function verifyModuleAccess(
  client: SupabaseClient,
  userId: string,
  tenantId: string,
  moduleId: string
): Promise<void> {
  const hasTenantAccess = await callBooleanFunction('has_tenant_access', { _user_id: userId, _tenant_id: tenantId }, client);
  if (!hasTenantAccess) throw new Error('Access denied to tenant');
  const { data: modules, error } = await client.rpc('get_tenant_licensed_modules', { p_tenant_id: tenantId });
  if (error || !Array.isArray(modules) || !modules.includes(moduleId)) throw new Error('Module not licensed');
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Tier name in code | Module ID only in guards and Edge Functions | Tiers can be renamed; no code change |
| No tenant in Edge Functions | Pass tenant_id or derive from project; verify has_tenant_access then module | Safe multi-tenant Edge Function pattern |
| Sidebar role-only | Role + required_module; useLicensedModules() | Feature gating and sidebar aligned |

**Deprecated / avoid:** Hardcoding tier names for feature flags. Checking only role without module for licensed features.

---

## Open Questions

1. **Revoke semantics for "super admin removes module"**  
   - What we know: PROJECT.md says super admin can add/remove individual modules. tenant_licensed_modules has source 'tier' | 'override'.  
   - What's unclear: Whether "remove" means only deleting an override (additive overrides only) or also revoking a tier-included module.  
   - Recommendation: Phase 2 implement additive overrides only (remove = delete override row). Add tenant_module_revokes (tenant_id, module_id) in a follow-up if product requires revoking tier modules.

2. **TenantContext holding tier or modules**  
   - What we know: TenantContext currently exposes tenantId, tenants list, loading, setTenantId, refreshTenants.  
   - What's unclear: Whether to put licensed modules in context vs. a dedicated hook.  
   - Recommendation: Keep useLicensedModules() as a separate hook keyed by tenantId. Avoids bloating TenantContext and keeps cache boundaries clear (invalidate modules without refreshing full tenant list).

3. **required_module in DB vs. constant only**  
   - What we know: sidebar_option_permissions today has option_id, role, sort_order; no module column.  
   - What's unclear: Whether to add required_module to the DB table or only to SIDEBAR_OPTIONS in code.  
   - Recommendation: Start with required_module only in SidebarOptionConfig (rolePermissions.ts). If product later wants admin-configurable module→option mapping, add a column or new table and migrate.

---

## Validation Architecture

No `.planning/config.json` with `workflow.nyquist_validation` was found. Validation Architecture section is omitted. If phase verification is added later, recommend: unit tests for useLicensedModules (mocked RPC), ModuleGuard render behavior; E2E (agent-browser) for sidebar visibility after tier change and for ModuleGuard fallback when module is missing.

---

## Sources

### Primary (HIGH confidence)

- PROJECT.md — Licensing Architecture, Module Inventory, Tier Definitions, Database Schema for Licensing, Runtime Enforcement Pattern, Phase 2 checklist.
- ROADMAP.md — Phase 2 success criteria.
- Existing code: TenantContext.tsx, useSidebarPermissions.tsx, AppSidebar.tsx (filter logic), rolePermissions.ts (SIDEBAR_OPTIONS, SidebarOptionConfig), authorization.ts (verifyProjectAccess, verifyAdminRole), supabase/migrations (tenants, tenant_users, set_tenant_context).

### Secondary (MEDIUM confidence)

- Phase 1 RESEARCH.md — Patterns for RLS, TenantContext, migrations.
- sidebar_option_permissions schema (option_id, role; no required_module).

### Tertiary (LOW confidence)

- General multi-tenant licensing patterns (add licensing to existing app) — applied as pitfalls; no external doc cited.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — PROJECT.md and existing codebase define stack; no new external libs required.
- Architecture: HIGH — PROJECT.md gives schema and runtime pattern; resolution (tier + overrides) and RPC pattern are standard.
- Pitfalls: HIGH — Derived from PROJECT.md constraints and common multi-tenant + licensing mistakes.

**Research date:** 2026-03-01  
**Valid until:** ~30 days; re-check if PROJECT.md tier–module matrix or schema changes.

---

## RESEARCH COMPLETE
