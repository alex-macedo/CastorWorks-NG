# Roadmap: CastorWorks-NG

## Overview

Multi-tenant SaaS transformation. Phase 0–1 complete; Phase 2 next.

## Phases

- [x] **Phase 0: New Supabase DB** — NG DB provisioned, schema and config/templates in place
- [x] **Phase 1: Foundation** — Tenants, RLS, TenantContext, onboarding, super admin
- [ ] **Phase 2: Module-Based Licensing** — Flexible feature gating at every layer

## Phase Details

### Phase 0: New Supabase DB

(Complete.)

### Phase 1: Foundation

(Complete.)

### Phase 2: Module-Based Licensing

**Goal:** Flexible feature gating that works at every layer (DB, frontend, Edge Functions, sidebar). Tiers resolve to modules; runtime checks use modules only.

**Requirements:** P2-1, P2-2, P2-3, P2-4, P2-5 (from PROJECT.md)

**Plans:** 3 plans

Plans:
- [ ] 02-01-PLAN.md — Licensing schema, RPC get_tenant_licensed_modules, seed modules/tiers
- [ ] 02-02-PLAN.md — useLicensedModules, ModuleGuard, UpgradePrompt, sidebar required_module filter
- [ ] 02-03-PLAN.md — verifyModuleAccess (Edge Functions), super admin tenant module overrides UI

**Success Criteria:**

1. Tenant tier determines which modules are available; switching tier changes access.
2. Super admin can add/remove individual modules per tenant.
3. useLicensedModules() and ModuleGuard enforce access in the app.
4. Sidebar options filter by required_module and tenant license.
5. Edge Functions verify module access via shared authorization.
