# Phase 1: Foundation — Executable Plan

**Phase goal:** Tenant infrastructure and basic isolation so that a user can sign up, create a tenant, and access only their tenant's data.

**Success criteria (from PROJECT.md):** A user can sign up, create a tenant, and access only their tenant's data.

**Goal-backward trace:** Every task below traces to that outcome — either by creating the DB/RLS/auth primitives (tenants, tenant_users, RLS, RPC), by adding tenant_id and enforcing it in RLS, or by providing the UI and flows (TenantContext, tenant-client, onboarding, super admin) that make signup → tenant creation → scoped access possible.

---

## Reference

- **Phase checklist:** `.planning/PROJECT.md` — Phase 1 (Foundation)
- **Research:** `.planning/phases/01-foundation/RESEARCH.md` — tables, batches, RLS patterns, auth hooks, pitfalls

---

## Task list (ordered with dependencies)

### 1. Create tenants and tenant_users tables with RLS and helpers

**Depends on:** None (first migration).

**Description:** Add core tenant schema: `tenants` (id, name, slug, status, trial_ends_at, max_*, settings, created_at, updated_at), `tenant_users` (tenant_id, user_id, role app_role, is_owner, invited_at, accepted_at, PK (tenant_id, user_id)). Enable RLS on both. Add helper `has_tenant_access(_user_id uuid, _tenant_id uuid) RETURNS boolean` (SECURITY DEFINER, EXISTS in tenant_users). Add RLS policies: **tenants** — SELECT where user has row in tenant_users (or super_admin); INSERT allowed for authenticated (onboarding creates new tenant). **tenant_users** — SELECT own rows; INSERT for self (user_id = auth.uid()) when the tenant exists (onboarding: create tenant then add self as owner). Ensure super_admin is not required to be in tenant_users (super_admin check will be added in RLS via has_role).

**Deliverables:**

- `supabase/migrations/YYYYMMDD_create_tenants_and_tenant_users.sql` (or next available date):
  - CREATE TABLE tenants (per PROJECT.md / RESEARCH.md).
  - CREATE TABLE tenant_users with FK to tenants and auth.users.
  - CREATE FUNCTION has_tenant_access (SECURITY DEFINER, simple EXISTS on tenant_users).
  - RLS on tenants, tenant_users; policies: SELECT as above; **INSERT on tenants** for authenticated; **INSERT on tenant_users** for auth.uid() when inserting own user_id and tenant exists.

**Verification:** Run migration against NG DB (e.g. `docker exec -i supabase-ng-db psql -U postgres -d postgres < /tmp/migration.sql`). Confirm tables and function exist; `SELECT * FROM tenants` / `tenant_users` respect RLS for a test user.

---

### 2. Add set_tenant_context RPC and enforce in RLS

**Depends on:** Task 1 (tenants, tenant_users, has_tenant_access exist).

**Description:** Create RPC `public.set_tenant_context(tenant_id uuid)`: (1) validate that auth.uid() is in tenant_users for that tenant OR has_role(auth.uid(), 'super_admin'); (2) set_config('app.current_tenant_id', tenant_id::text, true). Grant EXECUTE to authenticated. Document that all tenant-scoped RLS policies will use `current_setting('app.current_tenant_id', true)::uuid`.

**Deliverables:**

- New migration (e.g. `YYYYMMDD_set_tenant_context_rpc.sql`):
  - CREATE OR REPLACE FUNCTION public.set_tenant_context(tenant_id uuid) ... SECURITY DEFINER, with tenant_users + super_admin check, then set_config.
  - REVOKE ALL / GRANT EXECUTE to authenticated.

**Verification:** In psql, as a user in tenant_users: `SELECT set_tenant_context('<tenant-uuid>'); SELECT current_setting('app.current_tenant_id', true);` returns the uuid. As user not in tenant_users (and not super_admin), set_tenant_context should raise.

---

### 3. Add tenant_id to tables — Batch 1 (root entities)

**Depends on:** Task 1 (tenants table exists).

**Description:** Add column `tenant_id uuid REFERENCES tenants(id)` to root entities that have no FK to other tenant-scoped tables: `projects`, `clients`, `company_settings`. Add as NULLable for now (backfill in Task 6). Create index on tenant_id for each for RLS performance.

**Deliverables:**

- Migration `YYYYMMDD_add_tenant_id_batch1_root_entities.sql`:
  - ALTER TABLE projects ADD COLUMN tenant_id uuid REFERENCES tenants(id); CREATE INDEX ...
  - Same for clients, company_settings.

**Verification:** Migration runs; \d projects/clients/company_settings show tenant_id; no NOT NULL yet.

---

### 4. Add tenant_id to tables — Batch 2 (user/app config)

**Depends on:** Task 3 (tenant_id on root entities if any of these reference them; RESEARCH says user_roles can stay or get tenant_id; tenant_users already exists). Batch 2 is optional per RESEARCH: user_roles (if adding tenant_id), app_settings, user_preferences, dropdown_options if per-tenant. For Phase 1 minimal path, add tenant_id only where clearly required for “access only their tenant’s data” — e.g. company_settings already in Batch 1. If app_settings / user_preferences are global, skip or add one migration that adds tenant_id only to tables that will be backfilled and used by tenant-scoped RLS. Recommendation: one migration adding tenant_id (nullable) to any of: user_roles (optional), app_settings, user_preferences, dropdown_options — only those that RESEARCH marks as per-tenant; otherwise skip Batch 2 or make it minimal.

**Description:** Add tenant_id (nullable) to per-tenant config tables as per RESEARCH: e.g. app_settings if per-tenant, user_preferences if per-tenant, dropdown_options if per-tenant. Omit user_roles if using only tenant_users for tenant-scoped roles. Create indexes where useful.

**Deliverables:**

- Migration `YYYYMMDD_add_tenant_id_batch2_config.sql` (or merged into a single “batch 2” migration with clear comment).

**Verification:** Migration runs; columns present; no NOT NULL.

---

### 5. Add tenant_id to tables — Batch 3 (project/client dependents)

**Depends on:** Task 3 (projects, clients have tenant_id).

**Description:** Add tenant_id (nullable) to all tables that depend on projects or clients: project_phases, project_team_members, project_documents, project_photos, daily_logs, client_project_access, project_access_grants, project_financial_entries, project_materials, project_activities, project_budget_*, project_wbs_*, project_task_statuses, project_resources, project_comments, project_calendar, milestone_delays, architect_*, content_hub, invoice_conversations, and all other project_id/client_id tables listed in RESEARCH. Add FK to tenants(id) and index. Optionally add CHECK/trigger that tenant_id matches project.tenant_id in a later cleanup; Phase 1 can rely on backfill + RLS.

**Deliverables:**

- One or more migrations (e.g. `YYYYMMDD_add_tenant_id_batch3_project_dependents.sql`) covering all Batch 3 tables from RESEARCH.

**Verification:** Migration runs; every listed table has tenant_id nullable; FKs valid.

---

### 6. Add tenant_id to tables — Batch 4 (templates) and Batch 5 (rest)

**Depends on:** Task 3, 5 (no circular dependency; Batch 4/5 don’t depend on each other for column existence).

**Description:** Batch 4: Add tenant_id (nullable) to project_wbs_templates, budget_templates, phase_templates, activity_templates, document_templates, folder_templates, company_profiles, cost_codes (if per-tenant), and other template tables from RESEARCH. Batch 5: Add tenant_id to remaining tenant-scoped tables: financial_*, tax_*, forms, notifications, roadmap_*, sprints, procurement, AI usage, etc. (Full list in RESEARCH; resolve from migrations + types.)

**Deliverables:**

- Migrations `YYYYMMDD_add_tenant_id_batch4_templates.sql` and `YYYYMMDD_add_tenant_id_batch5_rest.sql` (or split by file size if needed).

**Verification:** Migrations run; all target tables have tenant_id; no NOT NULL yet.

---

### 7. Seed initial tenant and backfill tenant_id

**Depends on:** Tasks 1, 3–6 (all tenant_id columns exist).

**Description:** Insert one seed tenant (e.g. “Default” / “CastorWorks NG”) and capture its id. Run UPDATE on every table that has tenant_id: SET tenant_id = '<seed-tenant-id>' WHERE tenant_id IS NULL. Then ALTER COLUMN tenant_id SET NOT NULL on all tables where applicable (excluding tenants, tenant_users which don’t have self-tenant_id).

**Deliverables:**

- Migration `YYYYMMDD_seed_tenant_and_backfill_tenant_id.sql`:
  - INSERT INTO tenants (...); (single row).
  - UPDATE projects SET tenant_id = ... WHERE tenant_id IS NULL; (repeat for all tables).
  - ALTER TABLE ... ALTER COLUMN tenant_id SET NOT NULL; for each table.

**Verification:** All tenant-scoped tables have non-null tenant_id; one row in tenants; backfill counts match expectations (e.g. zero or known count for empty NG DB).

---

### 8. Update all RLS policies to include tenant_id and has_tenant_access

**Depends on:** Tasks 2, 7 (set_tenant_context exists; tenant_id is set and NOT NULL where needed).

**Description:** For every table with tenant_id, add or replace RLS policies to include: (1) tenant_id = current_setting('app.current_tenant_id', true)::uuid, and (2) has_tenant_access(auth.uid(), tenant_id) OR has_role(auth.uid(), 'super_admin'). Keep existing project/role checks (e.g. has_project_access) where they still apply, and ensure no recursive RLS (has_tenant_access must remain SECURITY DEFINER and only read tenant_users). Ensure super_admin bypass is consistent (has_role(..., 'super_admin')).

**Deliverables:**

- One or more migrations (e.g. `YYYYMMDD_rls_tenant_isolation.sql` and follow-ups if size is large) that update/create policies on all tenant-scoped tables. Reference existing policy names from migrations so policies are replaced, not duplicated.

**Verification:** As authenticated user: set_tenant_context(tenant A); only tenant A’s rows visible. As super_admin: all rows visible (or tenant-scoped if policy design keeps super_admin as “can set any tenant”). Test with has_tenant_access and without to confirm denial when not member.

---

### 9. TenantContext provider

**Depends on:** Task 2 (RPC exists); frontend can call set_tenant_context.

**Description:** Create TenantContext: state for current tenantId, list of tenants for the user, loading. On mount (when user is available from AuthContext), fetch tenants via tenant_users + tenants (e.g. from('tenant_users').select('tenant_id, tenants(id, name, slug)').eq('user_id', user.id)). When tenantId is set, call supabase.rpc('set_tenant_context', { tenant_id: tenantId }). Export useTenant(), useTenantId(), and optionally useTenantClient() that returns the Supabase client (and ensures RPC was called when tenantId is set). Handle “no tenants” and “single tenant” (auto-set) in provider.

**Deliverables:**

- `src/contexts/TenantContext.tsx` (provider, hooks, RPC call on set tenant).

**Verification:** In app, after login, provider loads; selecting a tenant calls RPC; current_setting in DB reflects selection (e.g. via a small debug query or next task’s client usage).

---

### 10. Tenant-scoped Supabase client (tenant-client)

**Depends on:** Task 9 (TenantContext exposes tenantId and possibly setTenant).

**Description:** Create a wrapper or hook (e.g. `src/integrations/supabase/tenant-client.ts`) that returns a Supabase client and ensures set_tenant_context has been called for the current tenantId before any tenant-scoped query. Option: getTenantClient() or useTenantSupabase() that uses TenantContext and re-calls RPC when tenantId changes so that RLS sees the correct session variable. Do not duplicate Supabase client creation; reuse existing client from `src/integrations/supabase/client.ts` and add the RPC guarantee.

**Deliverables:**

- `src/integrations/supabase/tenant-client.ts` (and/or hook in TenantContext): tenant-aware client or useTenantSupabase() that calls set_tenant_context when tenantId is set/changed.

**Verification:** After selecting tenant, a query that depends on RLS (e.g. projects) returns only that tenant’s rows; after switching tenant, rows change without full reload.

---

### 11. App.tsx wiring and tenant guard

**Depends on:** Task 9 (TenantContext), Task 10 (tenant client available).

**Description:** Mount TenantProvider inside AuthProvider in App.tsx (so tenant resolution has user). Wrap protected routes with a guard that: if user has no tenants, redirect to onboarding/signup-tenant; if one tenant, set it and proceed; if multiple, show tenant picker then set and proceed. Ensure TenantProvider calls set_tenant_context when tenant is set so the first tenant-scoped request sees the correct context.

**Deliverables:**

- `src/App.tsx`: Add TenantProvider; add route/guard for “tenant required” that redirects to onboarding or tenant picker when no tenant is set.
- Optionally a small `TenantGuard` component that redirects to `/onboarding` or `/tenant-picker` when tenant is missing.

**Verification:** Logged-in user with no tenants is redirected to onboarding; with one tenant lands in app with tenant set; with multiple can pick and then land in app. RLS tests (e.g. projects list) show correct tenant data.

---

### 12. Tenant signup/onboarding flow

**Depends on:** Tasks 1, 9, 11 (tenants/tenant_users exist; TenantContext and routing in place).

**Description:** Build onboarding route (e.g. `/onboarding` or `/signup/tenant`): after signup, user lands here if they have no tenants. Form: company/tenant name, optional slug. On submit: insert into tenants (name, slug, …), then insert into tenant_users (tenant_id, user_id, role e.g. 'admin', is_owner true). Set TenantContext to the new tenant and redirect to app (e.g. `/`). Use Supabase client with RLS (tenant_users insert policy must allow the creating user to insert themselves for the new tenant). If signup and onboarding are separate pages, ensure Login.tsx or signup flow redirects “no tenants” to this route.

**Deliverables:**

- `src/pages/Onboarding.tsx` (or `TenantSignup.tsx`): form, create tenant + tenant_users, set context, redirect.
- Route in router for `/onboarding` (or chosen path).
- RLS policy on tenant_users allowing insert when inserting for self (e.g. user_id = auth.uid()) and tenant exists; optionally restrict to one “owner” per tenant by convention.

**Verification:** New user signs up, is sent to onboarding, creates tenant, is redirected into app; can see only their tenant’s data (e.g. empty projects list scoped to that tenant).

---

### 13. Super admin role and panel

**Depends on:** Task 2 (super_admin bypass in set_tenant_context and RLS), Task 8 (RLS includes has_role(..., 'super_admin')).

**Description:** Ensure super_admin is a valid app_role and is used in RLS and set_tenant_context. Add a super admin panel (e.g. `/admin/tenants`): list tenants, basic info (name, slug, status, user count). Restrict route to users with has_role(auth.uid(), 'super_admin'). Use existing user_roles table: allow a row with role = 'super_admin' and optionally tenant_id NULL to denote platform super admin. Panel reads from tenants (and optionally tenant_users) using the same Supabase client; RLS must allow super_admin to SELECT all tenants (policy: has_role(auth.uid(), 'super_admin')).

**Deliverables:**

- Migration or existing role enum: ensure app_role includes 'super_admin' (or equivalent); document that super_admin in user_roles (with tenant_id NULL if user_roles has tenant_id) grants platform admin.
- `src/pages/admin/TenantList.tsx` (or similar): list tenants; route `/admin/tenants`.
- Router: protect `/admin/*` or `/admin/tenants` by super_admin check (e.g. useRole or has_role check in guard).
- RLS policy on tenants: allow SELECT for has_tenant_access(auth.uid(), id) OR has_role(auth.uid(), 'super_admin').

**Verification:** As super_admin user, open /admin/tenants and see all tenants. As normal user, route is forbidden or redirects. set_tenant_context and RLS allow super_admin to operate across tenants as designed.

---

## Migration order summary

1. **Tenant schema and helpers:** Tenants + tenant_users + RLS + has_tenant_access (Task 1).
2. **Session context:** set_tenant_context RPC (Task 2).
3. **Add tenant_id (nullable):** Batch 1 root (Task 3) → Batch 2 config (Task 4) → Batch 3 project/client dependents (Task 5) → Batch 4 templates + Batch 5 rest (Task 6).
4. **Backfill + NOT NULL:** Seed tenant + UPDATE all tenant_id + SET NOT NULL (Task 7).
5. **RLS updates:** All policies include tenant_id and has_tenant_access / super_admin (Task 8).

Then frontend: TenantContext (9) → tenant-client (10) → App wiring + guard (11) → onboarding (12) → super admin panel (13).

---

## Verification checklist

- **Migrations:** Run each migration in order on NG DB; no errors; tables/functions present.
- **RLS:** As normal user, set_tenant_context(tenant A); SELECT from projects/clients returns only tenant A’s rows; as super_admin, can see all (or set any tenant and see that tenant).
- **Signup flow:** New user → sign up → onboarding → create tenant → redirect to app → only that tenant’s data.
- **Tenant switch:** User with two tenants can switch; tenant-scoped data updates without full reload.
- **Super admin:** Super admin can open /admin/tenants and list all tenants; non–super_admin cannot.

---

## What this plan does not do

- Does not run migrations or modify the database (plan only).
- Does not implement licensing or modules (Phase 2).
- Does not change storage bucket paths to tenant-prefixed (Phase 5).
- Does not audit Edge Functions for tenant context (Phase 6).
