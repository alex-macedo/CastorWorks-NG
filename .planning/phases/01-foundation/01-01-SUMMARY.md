---
phase: 01-foundation
plan: "01"
subsystem: database
tags: [supabase, rls, multi-tenant, postgres, migrations]

# Dependency graph
requires:
  - phase: 00-new-supabase-db
    provides: NG DB schema and config/templates on castorworks-ng-db
provides:
  - tenants and tenant_users tables with RLS and has_tenant_access()
  - set_tenant_context(tenant_id) RPC and app.current_tenant_id session variable
  - tenant_id on all tenant-scoped tables (root, config, project dependents, templates, rest)
  - Seed tenant "CastorWorks NG" and backfilled tenant_id NOT NULL
  - RLS policies enforcing tenant_id + has_tenant_access or super_admin on root and key project tables
affects: [01-02 TenantContext and client, signup/onboarding, super admin]

# Tech tracking
tech-stack:
  added: [super_admin app_role, tenant_and_project_using RLS helper]
  patterns: [shared-schema multi-tenancy, session-local tenant context, SECURITY DEFINER has_tenant_access]

key-files:
  created:
    - supabase/migrations/20260301000000_add_super_admin_app_role.sql
    - supabase/migrations/20260301000001_create_tenants_and_tenant_users.sql
    - supabase/migrations/20260301000002_set_tenant_context_rpc.sql
    - supabase/migrations/20260301000003_add_tenant_id_batch1_root_entities.sql
    - supabase/migrations/20260301000004_add_tenant_id_batch2_config.sql
    - supabase/migrations/20260301000005_add_tenant_id_batch3_project_dependents.sql
    - supabase/migrations/20260301000006_add_tenant_id_batch4_templates.sql
    - supabase/migrations/20260301000007_add_tenant_id_batch5_rest.sql
    - supabase/migrations/20260301000008_seed_tenant_and_backfill_tenant_id.sql
    - supabase/migrations/20260301000009_rls_tenant_isolation.sql
  modified: []

key-decisions:
  - "super_admin enum value in separate migration so it can be committed before use in policies"
  - "NG DB container name is castorworks-ng-db (not supabase-ng-db) on remote host"
  - "tenant_and_project_using(tenant_id, project_id) helper for project-scoped RLS to avoid repetition"

patterns-established:
  - "Tenant isolation: tenant_id = current_setting('app.current_tenant_id', true)::uuid AND (has_tenant_access(auth.uid(), tenant_id) OR has_role(auth.uid(), 'super_admin'))"
  - "Project-scoped tables: combine tenant check with has_project_access via tenant_and_project_using()"

requirements-completed: []

# Metrics
duration: ~25min
completed: "2026-03-01"
---

# Phase 1 Plan 01: Foundation — Migrations Summary

**Tenant DB schema, RPC, tenant_id on all tenant-scoped tables, backfill, and RLS so that data is isolated by tenant and set_tenant_context gates access.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 8
- **Files created:** 10 migration files
- **Migrations applied on:** castorworks-ng-db (remote)

## Accomplishments

- **Tenants and tenant_users** with RLS; `has_tenant_access(_user_id, _tenant_id)` SECURITY DEFINER; super_admin in app_role.
- **set_tenant_context(tenant_id)** RPC: validates membership or super_admin, sets `app.current_tenant_id` session-local.
- **tenant_id** added (nullable then NOT NULL) to root entities (projects, clients, company_settings), config (app_settings, user_preferences, dropdown_options), project/client dependents (Batch 3), templates (Batch 4), and rest (Batch 5: forms, tax, notifications, roadmap, financial, AI, etc.).
- **Seed tenant** "CastorWorks NG" (slug castorworks-ng); backfill and SET NOT NULL on all tables with tenant_id.
- **RLS tenant isolation** on projects, clients, company_settings, app_settings, and key project-scoped tables (daily_logs, project_phases, project_team_members, project_financial_entries, project_materials, project_activities, project_budget_items, project_purchase_requests) using tenant_id + has_tenant_access or super_admin; `tenant_and_project_using()` for project-scoped policies.

## Task Commits

1. **Task 1: Create tenants and tenant_users with RLS and has_tenant_access** - `b5a2b2b` (feat)
2. **Task 2: Add set_tenant_context RPC** - `c5a80d5` (feat)
3. **Task 3: Add tenant_id Batch 1 (root entities)** - `c232ca7` (feat)
4. **Task 4: Add tenant_id Batch 2 (config)** - `c2dda07` (feat)
5. **Task 5: Add tenant_id Batch 3 (project dependents)** - `4434077` (feat)
6. **Task 6: Add tenant_id Batch 4 and Batch 5** - `c09b3b0` (feat)
7. **Task 7: Seed tenant and backfill tenant_id** - `06d6b4f` (feat)
8. **Task 8: RLS tenant isolation** - `907dd18` (feat)

## Files Created/Modified

- `supabase/migrations/20260301000000_add_super_admin_app_role.sql` - Add super_admin to app_role (must commit before use).
- `supabase/migrations/20260301000001_create_tenants_and_tenant_users.sql` - tenants, tenant_users, has_tenant_access, RLS.
- `supabase/migrations/20260301000002_set_tenant_context_rpc.sql` - set_tenant_context RPC.
- `supabase/migrations/20260301000003_add_tenant_id_batch1_root_entities.sql` - projects, clients, company_settings.
- `supabase/migrations/20260301000004_add_tenant_id_batch2_config.sql` - app_settings, user_preferences, dropdown_options.
- `supabase/migrations/20260301000005_add_tenant_id_batch3_project_dependents.sql` - project_*, client_*, architect_*, etc.
- `supabase/migrations/20260301000006_add_tenant_id_batch4_templates.sql` - project_wbs_templates, budget_templates, phase/activity/document/folder_templates, company_profiles, cost_codes, simplebudget_*.
- `supabase/migrations/20260301000007_add_tenant_id_batch5_rest.sql` - forms, notifications, tax_*, roadmap_*, invoices, estimates, proposals, quotes, purchase_orders, suppliers, contractors, ai_usage_logs, etc.
- `supabase/migrations/20260301000008_seed_tenant_and_backfill_tenant_id.sql` - Insert seed tenant, backfill tenant_id, SET NOT NULL.
- `supabase/migrations/20260301000009_rls_tenant_isolation.sql` - RLS policies for root and key project tables; tenant_and_project_using().

## Decisions Made

- **super_admin in separate migration:** PostgreSQL does not allow using a new enum value in the same transaction that adds it; 20260301000000 adds the value, 20260301000001 uses it in policies.
- **NG container name:** Migrations were applied to `castorworks-ng-db` (not `supabase-ng-db`); documented for future runs.
- **RLS helper:** Introduced `tenant_and_project_using(tbl_tenant_id, p_project_id)` to keep project-scoped policies DRY and consistent.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] super_admin enum usage in same transaction**
- **Found during:** Task 1 (create tenants and tenant_users)
- **Issue:** CREATE POLICY using 'super_admin'::app_role failed with "unsafe use of new value of enum type app_role"
- **Fix:** Split into 20260301000000 (add super_admin) and 20260301000001 (tables and policies). Enum migration has no BEGIN/COMMIT so it commits immediately.
- **Files modified:** New 20260301000000_add_super_admin_app_role.sql; 20260301000001 no longer adds enum.
- **Committed in:** b5a2b2b (Task 1 commit)

**2. [Rule 3 - Blocking] Wrong container name for NG DB**
- **Found during:** Task 1 (applying migration)
- **Issue:** `supabase-ng-db` not found; runbook uses NG_CONTAINER variable.
- **Fix:** Listed containers on host; NG DB is `castorworks-ng-db`. Used that for all subsequent migrations.
- **Impact:** Documented in SUMMARY for future execution.

---

**Total deviations:** 2 (both Rule 3 blocking)
**Impact on plan:** Necessary for migration to run on actual NG DB; no scope creep.

## Issues Encountered

None beyond the deviations above.

## User Setup Required

None - migrations run remotely via SSH to castorworks host and `docker exec -i castorworks-ng-db psql ...`. App must call `set_tenant_context(tenant_id)` after login/tenant selection (Phase 1 Plan 02).

## Next Phase Readiness

- **01-02 (TenantContext, tenant-client, signup/onboarding):** DB is ready. Frontend should call `set_tenant_context(tenant_id)` when tenant is set; query tenant list from tenant_users + tenants.
- **RLS follow-up:** Remaining tenant-scoped tables (e.g. project_documents, project_photos, client_project_access, architect_*, tax_*, forms, etc.) can get tenant isolation in a follow-up migration using the same pattern (tenant_id + has_tenant_access or super_admin, and tenant_and_project_using where project_id exists).

## Self-Check: PASSED

- All 10 migration files exist under supabase/migrations/.
- Commits b5a2b2b through 907dd18 and final 40c80fd present in git log.
