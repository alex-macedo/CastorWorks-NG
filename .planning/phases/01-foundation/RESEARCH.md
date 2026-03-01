# Phase 1: Foundation - Research

**Researched:** 2026-03-01  
**Domain:** Multi-tenant infrastructure, RLS, Supabase client wiring, tenant signup/onboarding  
**Confidence:** HIGH

## Summary

Phase 1 adds tenant infrastructure and basic isolation to CastorWorks-NG. The codebase currently has no `tenant_id` columns, no `tenants` or `tenant_users` tables, and no TenantContext. The app uses a single Supabase client at `src/integrations/supabase/client.ts`, and RLS relies on `has_project_access(auth.uid(), project_id)` and `has_role(auth.uid(), role)` against `user_roles` and project/client membership tables. Multi-tenancy will follow a shared-schema approach with `tenant_id` on all tenant-scoped tables, a `tenant_users` membership table, and an RPC (or session variable) to set tenant context for RLS. Auth and signup live in `src/pages/Login.tsx` and `src/components/AuthGuard.tsx`; tenant selection and onboarding should hook after successful auth. Context providers are mounted in `src/App.tsx` (AuthProvider, LocalizationProvider, etc.); TenantContext should sit inside AuthProvider and wrap providers that need tenant.

**Primary recommendation:** Implement tenants + tenant_users first with RLS; add `set_tenant_context(uuid)` RPC using `current_setting('app.current_tenant_id')`; add `tenant_id` to tables in dependency order (projects/clients/company_settings first, then project_* and dependents); introduce TenantContext and a tenant-scoped Supabase wrapper that calls the RPC; then build signup/onboarding and super admin panel.

---

## User Constraints

No CONTEXT.md was found for this phase. Research is unconstrained by locked decisions. Planner should follow PROJECT.md Phase 1 checklist and success criteria.

---

## Tables That Need tenant_id

Source: `src/integrations/supabase/types.ts` (Database.public.Tables). The following are the **table names** present in the generated types. Exclude `has_project_access` and `has_role` (they are database views/functions, not base tables). All application data tables below should get a `tenant_id UUID NOT NULL REFERENCES tenants(id)` (or nullable during migration, then backfilled and set NOT NULL).

### Tenant-scoped (add tenant_id)

| Table | Notes / FK dependency |
|-------|------------------------|
| `projects` | Root entity; no tenant FK dependency |
| `project_photos` | project_id → projects |
| `project_financial_entries` | project_id → projects |
| `project_phases` | project_id → projects |
| `project_team_members` | project_id → projects |
| `project_access_grants` | project_id → projects |
| `project_task_statuses` | project_id (nullable in Phase 0) |
| `project_documents` | project_id → projects |
| `project_wbs_templates` | Template; tenant-scoped |
| `project_wbs_items` | (if in types; often via project) |
| `daily_logs` | project_id → projects |
| `content_hub` | project/tenant content |
| `clients` | Root entity per tenant |
| `client_project_access` | client_id, project_id |
| `client_definitions` | Client config |
| `client_project_summary` | View-like; may be view |
| `architect_client_portal_tokens` | project/client scope |
| `architect_pipeline_statuses` | Tenant config |
| `architect_opportunities` | Tenant data |
| `architect_tasks` | Tenant data |
| `architect_site_diary` | Tenant data |
| `invoice_conversations` | Invoice/tenant |
| `company_settings` | One per tenant (or tenant_id) |
| `user_roles` | Either add tenant_id or replace with tenant_users (see below) |
| `user_profiles` | Can stay global keyed by user_id, or tenant_id if profile is per-tenant |
| `budget_templates` | Tenant templates |
| `budget_template_items` | budget_templates |
| `budget_template_phases` | budget_templates |
| `budget_template_cost_codes` | budget_templates |
| `phase_templates` | Tenant templates |
| `activity_templates` | Tenant templates |
| `simplebudget_materials_template_meta` | Tenant |
| `simplebudget_labor_template_meta` | Tenant |
| `forms` | Tenant forms |
| `form_questions` | forms |
| `form_responses` | forms |
| `form_response_answers` | form_responses |
| `form_collaborators` | forms |
| `form_analytics_cache` | forms |
| `form_webhooks` | forms |
| `milestone_delays` | project_id → projects |
| `tax_projects` | Tenant tax data |
| `tax_estimates` | tax_projects |
| `tax_submissions` | tax_* |
| `tax_payments` | tax_* |
| `tax_documents` | tax_* |
| `tax_vau_reference` | tax_* |
| `tax_guide_process` | tax_* |
| `tax_alerts` | tax_* |

Additional tables present in migrations but ensure they are in scope: `project_materials`, `project_activities`, `project_budget_items`, `project_purchase_requests`, `purchase_request_items`, `project_resources`, `project_comments`, `project_budgets`, `project_budget_versions`, `project_budget_lines`, `purchase_orders`, `delivery_confirmations`, `delivery_photos`, `quotes`, `estimates`, `proposals`, `suppliers`, `dropdown_options` (often global; can be per-tenant), `app_settings` (can be global or per-tenant), `user_preferences`, `document_templates`, `folder_templates`, `roadmap_*`, `sprints`, `project_calendar`, `calendar_events`, `site_activity_logs`, `site_issues`, `crew_time_logs`, `quality_inspections`, `time_logs`, `notifications`, `project_milestones`, `project_milestone_definitions`, `project_labor`, `contractors`, `security_events`, `failed_login_attempts`, `quote_requests`, `approval_tokens`, `admin_events`, `ai_usage_logs`, `ai_feedback`, `ai_insights`, `ai_recommendations`, `ai_configurations`, `ai_model_performance`, `ai_training_data`, `voice_transcriptions`, `ai_chat_messages`, `payment_reminders`, `reminder_logs`, `outbound_campaigns`, `campaign_recipients`, `campaign_logs`, `queue_jobs`, `evolution_*`, `financial_*` (ledger, invoices, payments, etc.), `content.service`, `content.error`, `feedback`, `validation_history`, `troubleshooting_entries`, `page_nimbus`, `page_section_nimbus`, `whatsapp_templates`, `whatsapp_rate_limits`, `whatsapp_opt_ins`, `integration_settings`, `email_notifications`, `sidebar_option_permissions`, `sidebar_tab_permissions`, `notification_reminder_settings`, `entity_reminder_overrides`, `notification_sent_log`, `financial_collection_sequences`, `financial_collection_actions`, `castormind_messages`, `castormind_ocr_results`, `financial_pre_launch_entries`, `open_finance_*`, `sefaz_nfe_records`, `payment_gateway_*`, `financial_reconciliation_rules`, `ai_prediction_*`, `financial_exchange_rates`, `financial_fx_transactions`, `financial_payment_*`, `financial_installment_*`, `financial_discount_penalty_rules`, `tax_prefab_invoices`, `inss_*` reference tables, `construction_cost_benchmark_*`, `cost_codes`, `company_profiles`, `currencies`, `exchange_rates`, `project_benchmarks`, `cost_predictions`, `digital_signatures`, `sinapi_catalog`, `sinapi_items`, `sinapi_line_items_template`, `sinapi_project_template_items`, `simplebudget_materials_template`, `simplebudget_labor_template`, `project_wbs_template_items`, `mentions`, `activity_logs`, `communication_logs`, `communication_participants`, `communication_attachments`, `client_tasks`, `meeting_recordings`, `push_subscriptions`, `daily_log_notes`, `content_hub`, `architect_time_entries`, `project_calendar`, `roadmap_item_attachments`, `roadmap_releases`, `sprint_items_snapshot`, `evolution_notification_logs`, `financial_collection_*`, `backup_*` (if any). Planner should resolve final list from migrations + types; the above is the authoritative set from types plus migration CREATE TABLE names.

### Tables to create (no tenant_id column; they define tenancy)

| Table | Purpose |
|-------|---------|
| `tenants` | id (uuid), name, slug, created_at, etc. |
| `tenant_users` | tenant_id, user_id (auth.users), role (e.g. app_role or tenant_role enum), created_at. Primary key (tenant_id, user_id). |

### Optional: global or system tables (no tenant_id)

- `app_settings`: Often single row or keyed by tenant; if global, leave without tenant_id.
- `dropdown_options`: Can remain global if same for all tenants.
- `sinapi_catalog` / `sinapi_items` / INSS reference tables: Usually global reference data.
- `user_profiles`: If one profile per user across tenants, no tenant_id; if profile is per-tenant, add tenant_id.

---

## Current RLS Patterns and Helper Functions

### Locations

- **has_project_access:** Defined in multiple migrations; latest substantive definition in `supabase/migrations/20251230000002_fix_project_client_recovery_and_access.sql`. Signature: `public.has_project_access(_user_id uuid, _project_id uuid) RETURNS boolean` (STABLE SECURITY DEFINER). It delegates to `public.user_has_project_access(p_project_id, p_user_id)`.
- **user_has_project_access:** Same migration. Checks: admin/project_manager/admin_office/manager in `user_roles`, or `projects.owner_id`, or `client_project_access`, or `project_team_members`, or client org link via `client_project_access` + `projects.client_id`.
- **has_role:** Defined in `supabase/migrations/20251102041142_86700330-0255-445d-901b-50d3dd315dae.sql`. Signature: `public.has_role(_user_id UUID, _role app_role) RETURNS boolean` (SQL STABLE SECURITY DEFINER). Implementation: `SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)`.

### RLS usage pattern

Policies use either:

- `has_project_access(auth.uid(), project_id)` for project-scoped tables.
- `has_role(auth.uid(), 'admin'::app_role)` (or other roles) for admin-only or role-gated access.
- Combination: e.g. `has_project_access(...) AND (has_role(..., 'project_manager') OR has_role(..., 'admin'))`.

### Multi-tenant adaptation

- **Option A (recommended):** Introduce `tenant_users(tenant_id, user_id, role)`. Add helper `has_tenant_access(_user_id uuid, _tenant_id uuid) RETURNS boolean` (EXISTS in tenant_users). For tenant-scoped tables, policies add: `tenant_id = current_setting('app.current_tenant_id', true)::uuid AND has_tenant_access(auth.uid(), tenant_id)` (or equivalent). Keep `has_project_access` but have it also require that the project’s tenant matches current tenant context (or derive tenant from project).
- **Option B:** Add `tenant_id` to `user_roles` and keep one row per (user, tenant, role). Then `has_role` becomes tenant-aware using `current_setting('app.current_tenant_id', true)::uuid` and checks `user_roles` for that tenant.

Planner should choose one approach; RESEARCH recommends Option A (tenants + tenant_users + has_tenant_access) for clarity and to support super_admin that is not in tenant_users.

---

## set_tenant_context RPC / Session Variable

### Pattern (standard Supabase/Postgres multi-tenant)

1. **RPC:** `public.set_tenant_context(tenant_id uuid)` (or `app.set_tenant_context` in a non-exposed schema). Body: `PERFORM set_config('app.current_tenant_id', tenant_id::text, true);` (`true` = session-local, not transaction-only). Return void or the set value.
2. **RLS:** In policies, use `current_setting('app.current_tenant_id', true)::uuid`. Example: `USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)`.
3. **Client:** After login and when the user selects a tenant (or when the app resolves the only tenant), call `supabase.rpc('set_tenant_context', { tenant_id: selectedTenantId })` once per session (or on each request if using anon key and no persistent session variable). The tenant-scoped client wrapper (see below) should call this when the tenant changes.

### Security

- Expose only to `authenticated` role. Inside the RPC, optionally validate that `auth.uid()` is a member of the given tenant (e.g. EXISTS in tenant_users) so users cannot set arbitrary tenant_id.
- If using a single anon key, every request must send tenant context (e.g. via RPC at start of session or via a custom header that a Postgres hook/function reads). Using RPC at session start is the simplest and matches common Supabase multi-tenant examples.

### Reference

- Supabase RLS docs (auth.uid(), policies).
- Community pattern: `current_setting('app.current_tenant_id')` for tenant isolation (verified via WebSearch; multiple sources).

---

## Auth / Signup Flow and Where Tenant Hooks In

### Current flow

- **Login/signup:** `src/pages/Login.tsx`. Uses `supabase.auth.signUpWithPassword` / `signInWithPassword`. On success, sends registration email (Edge Function) and clears React Query cache; for sign-in, redirects to `/` via `navigate('/')`.
- **Auth state:** `src/components/AuthGuard.tsx` uses `supabase.auth.onAuthStateChange`. On `SIGNED_OUT`, redirects to `/login`. If session and on `/login`, redirects to `/`. Otherwise sets local state (e.g. userId). Role checks happen after user load.
- **Provider tree:** `src/App.tsx`: `SidebarProvider` → `ThemeProvider` → `TooltipProvider` → `LocalizationProvider` → `BrowserRouter` → `AuthProvider` → `TimeTrackingProvider` → `ChatProvider` → … → `Routes`. Protected routes are wrapped in `<AuthGuard>`.

### Where to hook tenant selection/onboarding

1. **After auth, before app:** When the user is authenticated, resolve their tenant(s) (e.g. query `tenant_users` for `auth.uid()`). If zero tenants → redirect to tenant signup/onboarding flow (new route, e.g. `/onboarding` or `/signup/tenant`). If one tenant → set tenant in TenantContext and proceed (e.g. redirect to `/`). If multiple → show tenant picker, then set tenant and proceed.
2. **TenantContext:** Should be mounted inside `AuthProvider` (so it has access to user). All routes that require a tenant should sit under a wrapper that ensures tenant is set (redirect to onboarding or tenant picker if not).
3. **Signup flow:** Current signup only creates auth user. Phase 1 should add: after signup, create a tenant (e.g. “Company name”) and insert into `tenants`, then create `tenant_users(tenant_id, user_id, role)` (e.g. admin). Then set TenantContext and redirect into app. Optionally collect company name/slug during signup (single-page or wizard).

### Files to touch

- `src/pages/Login.tsx`: After sign-up success, optionally redirect to onboarding to create tenant + tenant_users (or do it in one step with Edge Function).
- New: `src/contexts/TenantContext.tsx`: Provider that holds current `tenantId`, `setTenant`, and loading state; fetches tenant list from `tenant_users` (+ tenants); calls RPC `set_tenant_context` when tenant is set.
- New: `src/integrations/supabase/tenant-client.ts` (or similar): Wrapper that uses the same Supabase client but ensures `set_tenant_context` has been called and optionally adds tenant_id to insert/update where needed (or rely on RLS and defaults).
- `src/App.tsx`: Insert TenantProvider inside AuthProvider; wrap protected routes with a guard that requires tenant and redirects to onboarding/picker if missing.
- New: Onboarding/signup tenant flow (e.g. `src/pages/Onboarding.tsx` or `src/pages/TenantSignup.tsx`).

---

## Context Providers and TenantContext Integration

### Existing providers (from App.tsx)

- `SidebarProvider`, `ThemeProvider`, `TooltipProvider`, `LocalizationProvider`, `BrowserRouter`, `AuthProvider`, `TimeTrackingProvider`, `ChatProvider`, `RouterErrorBoundary`, `Suspense`, `Routes`. Nested under routes: `SupervisorProjectProvider`, etc.

### TenantContext placement

- **Mount:** Inside `AuthProvider`, outside or wrapping `TimeTrackingProvider` and `ChatProvider` so that tenant is available to all feature code. Example: `AuthProvider` → `TenantProvider` → `TimeTrackingProvider` → … .
- **Consumption:** Hooks that query tenant-scoped data should use the tenant-scoped client from TenantContext (or the global client after RPC has been called). No need to change every hook if the single global client is used and RPC is called on login/tenant switch; then RLS alone enforces tenant_id. Alternatively, a `useSupabase()` that returns a client that always sends tenant context (e.g. by calling RPC when tenantId changes) keeps behavior explicit.

### Other contexts

- **AuthContext** (`src/contexts/AuthContext.tsx`): Exposes user and session. TenantContext can depend on `user` to load tenant list.
- **LocalizationContext**: Independent; no change.
- **ConfigContext**, **AppProjectContext**, **ChatContext**, **TimeTrackingContext**, **SupervisorProjectContext**: May eventually need to respect tenant (e.g. project list filtered by tenant). Phase 1 can limit to TenantContext + RLS; later phases can refactor these to use tenant where relevant.

---

## Migration Dependency Order

### 1. Create tenant tables (no tenant_id column on others yet)

1. `tenants`: id (uuid PK), name, slug (unique), created_at, updated_at, etc.
2. `tenant_users`: id (optional), tenant_id (FK tenants), user_id (FK auth.users or no FK if preferred), role (e.g. app_role or tenant_role), created_at. UNIQUE(tenant_id, user_id). RLS: users see only their rows; super_admin can see all (or use a separate mechanism).

### 2. Add tenant_id to tables (order to avoid FK violations)

- **Batch 1 (root entities, no FK to other tenant tables):**  
  `projects`, `clients`, `company_settings`.  
  Add column: `tenant_id uuid REFERENCES tenants(id)`. Allow NULL initially if backfilling later; else set default from a single seeded tenant.

- **Batch 2 (depend on Batch 1 or auth):**  
  `user_roles` (if adding tenant_id) or skip and use only `tenant_users` for tenant-scoped roles.  
  Then: `app_settings` (if per-tenant), `user_preferences` (if per-tenant), `dropdown_options` (if per-tenant).

- **Batch 3 (depend on projects/clients):**  
  All tables with `project_id` or `client_id`: e.g. `project_phases`, `project_team_members`, `project_documents`, `project_photos`, `daily_logs`, `client_project_access`, `project_access_grants`, `project_financial_entries`, `project_materials`, `project_activities`, `project_budget_*`, `project_wbs_*`, `project_task_statuses`, `project_resources`, `project_comments`, `project_calendar`, `milestone_delays`, `architect_*`, `content_hub`, `invoice_conversations`, `payment_reminders`, etc. Add `tenant_id` and optionally a CHECK or trigger that tenant_id matches project’s tenant_id.

- **Batch 4 (templates and config per tenant):**  
  `project_wbs_templates`, `budget_templates`, `phase_templates`, `activity_templates`, `document_templates`, `folder_templates`, `company_profiles`, `cost_codes` (if per-tenant), etc.

- **Batch 5 (rest):**  
  All remaining tenant-scoped tables: financial_*, tax_*, forms, notifications, roadmap_*, sprints, procurement, AI usage, etc.

### 3. Backfill tenant_id (if nullable)

If a single initial tenant exists (e.g. seeded for “existing data migration”): UPDATE each table SET tenant_id = '<initial-tenant-id>' WHERE tenant_id IS NULL. Then ALTER COLUMN tenant_id SET NOT NULL where appropriate.

### 4. RLS updates

- For each table with tenant_id, add or replace policies to include:  
  `tenant_id = current_setting('app.current_tenant_id', true)::uuid`  
  and, where applicable, `has_tenant_access(auth.uid(), tenant_id)` or equivalent. Keep existing project/role checks where they still apply (e.g. has_project_access within the tenant).

---

## Standard Stack

| Library / tech | Purpose |
|----------------|---------|
| Supabase (existing) | Auth, Postgres, RLS, Realtime |
| React 19 + React Router 7 | UI and routing |
| TanStack Query | Server state, cache invalidation |
| Existing RLS helpers | has_project_access, has_role; extend with has_tenant_access and set_tenant_context RPC |

No new infrastructure libraries required for Phase 1; use current Supabase client and add one RPC + tenant tables + TenantContext.

---

## Architecture Patterns

### Tenant-scoped client usage

- **Option A:** Single global `supabase` client. After login/tenant selection, call `supabase.rpc('set_tenant_context', { tenant_id })` once. All subsequent requests use the same client; RLS enforces tenant_id via `current_setting('app.current_tenant_id', true)`.
- **Option B:** Wrapper in `src/integrations/supabase/tenant-client.ts` that holds current tenantId and calls the RPC when tenantId changes; exports `getTenantClient()` or `useTenantSupabase()` so call sites explicitly use the tenant-aware client. Recommended for clarity and to avoid missing RPC after refresh (wrapper can re-call RPC when tenantId is restored from TenantContext).

### Recommended project structure

- `src/contexts/TenantContext.tsx`: Provider, tenant list, current tenant, setTenant, set_tenant_context RPC call.
- `src/integrations/supabase/tenant-client.ts`: Thin wrapper or hook that returns client and ensures RPC is called; used by hooks that perform tenant-scoped queries.
- `src/pages/Onboarding.tsx` (or under `src/pages/signup/`): Tenant creation + tenant_users insert after signup.
- Super admin: New route and panel (e.g. `/admin/tenants`) visible only to a super_admin role (stored in user_roles without tenant_id, or in a separate super_admin table).

---

## Don't Hand-Roll

| Problem | Don't build | Use instead |
|---------|-------------|-------------|
| Tenant isolation in DB | Application-level filtering only | RLS with tenant_id + set_tenant_context RPC |
| Per-request tenant injection | Custom HTTP middleware or manual filters on every query | Single RPC at session/tenant switch + RLS |
| Tenant membership checks | Ad-hoc joins in every policy | has_tenant_access(auth.uid(), tenant_id) SECURITY DEFINER function |

---

## Common Pitfalls

1. **Calling set_tenant_context too late:** If the first query runs before RPC is called, current_setting returns empty and policies may deny all rows. Ensure TenantProvider (or tenant-client) calls the RPC as soon as tenantId is set and before any tenant-scoped query.
2. **Recursive RLS:** has_project_access and similar already touch user_roles and project_team_members. When adding tenant_id to those tables, ensure policies don’t create circular dependency (e.g. has_tenant_access should not depend on tables that in turn depend on has_tenant_access in a way that causes recursion). Prefer SECURITY DEFINER for has_tenant_access and keep it to a simple EXISTS on tenant_users.
3. **Super admin bypass:** Super admin should see all tenants. Options: (a) super_admin role in a non-tenant table (e.g. user_roles with tenant_id NULL or a dedicated super_admins table), and in RLS, `OR has_role(auth.uid(), 'super_admin')` that bypasses tenant check; (b) or allow setting app.current_tenant_id to NULL for super_admin and interpret NULL as “no tenant filter” in policies (more error-prone). Prefer (a).
4. **Seed initial tenant:** Phase 1 checklist includes “Seed initial tenant for existing data migration.” Run a migration or seed script that inserts one tenant and, if needed, backfills existing rows (Phase 0 left projects/clients empty; if any config rows need a tenant, assign them to the seeded tenant).

---

## Code Examples

### set_tenant_context RPC (migration)

```sql
-- Migration: e.g. 20260301000001_set_tenant_context.sql
CREATE OR REPLACE FUNCTION public.set_tenant_context(tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Optional: restrict to current user's tenants
  IF NOT EXISTS (SELECT 1 FROM public.tenant_users WHERE tenant_users.tenant_id = set_tenant_context.tenant_id AND user_id = auth.uid()) THEN
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'::app_role) THEN
      RAISE EXCEPTION 'Access denied to tenant %', tenant_id;
    END IF;
  END IF;
  PERFORM set_config('app.current_tenant_id', tenant_id::text, true);
END;
$$;

-- Grant to authenticated only
REVOKE ALL ON FUNCTION public.set_tenant_context(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_tenant_context(uuid) TO authenticated;
```

### RLS policy example (tenant + existing project check)

```sql
-- Example: projects table
USING (
  tenant_id = current_setting('app.current_tenant_id', true)::uuid
  AND (
    public.has_tenant_access(auth.uid(), tenant_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);
```

### TenantContext (minimal structure)

- State: `tenantId: string | null`, `tenants: Array<{ id, name, slug }>`, `loading`.
- On mount (when user is set): fetch tenants for user via `from('tenant_users').select('tenant_id, tenants(id, name, slug)').eq('user_id', user.id)` (or two queries).
- When `tenantId` is set: call `supabase.rpc('set_tenant_context', { tenant_id: tenantId })`.
- Export: `useTenant()`, `useTenantId()`, `useTenantClient()` (returns supabase client after ensuring RPC was called).

---

## Phase Requirements (Phase 1 checklist from PROJECT.md)

| ID | Description | Research support |
|----|-------------|------------------|
| 1 | Create tenants, tenant_users tables with RLS | Tables and dependency order above; RLS pattern with has_tenant_access and super_admin bypass |
| 2 | Build TenantContext.tsx provider | Placement in App.tsx; integration with AuthProvider; RPC call on set tenant |
| 3 | Create tenant-client.ts Supabase wrapper (auto-inject tenant_id) | Option A vs B; recommendation: wrapper that calls set_tenant_context when tenantId changes |
| 4 | Add tenant_id column to all existing tables via migration | Full table list and batch order (root entities → project/client dependents → templates → rest) |
| 5 | Update all RLS policies to include tenant_id checks | current_setting('app.current_tenant_id', true)::uuid; has_tenant_access; super_admin exception |
| 6 | Build tenant signup/onboarding flow | Hook point after Login.tsx signup; new onboarding route; create tenant + tenant_users |
| 7 | Create super admin role and panel | super_admin in user_roles (or separate table); panel at e.g. /admin/tenants; RLS bypass for super_admin |
| 8 | Seed initial tenant for existing data migration | Single tenant insert in migration or seed script; backfill tenant_id for config rows if needed |

---

## Sources

### Primary (HIGH confidence)

- Codebase: `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `src/App.tsx`, `src/pages/Login.tsx`, `src/components/AuthGuard.tsx`, `src/contexts/AuthContext.tsx`
- Migrations: `20251230000002_fix_project_client_recovery_and_access.sql`, `20251102041142_86700330-0255-445d-901b-50d3dd315dae.sql`
- Project: `.planning/PROJECT.md`, `.planning/phases/00-new-supabase-db/00-SUMMARY.md`

### Secondary (MEDIUM confidence)

- WebSearch: Supabase/Postgres multi-tenant RLS with `current_setting('app.current_tenant_id')` and session variable pattern
- Supabase RLS docs (Row Level Security, auth.uid(), policies)

### Tertiary

- Multi-tenancy reference doc is in parent repo: `CastorWorks/docs/plans/multi-tenant/multi-tenancy-best-practices.md` (not in this repo; planner may need to consult it for naming and conventions)

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — existing Supabase + React; no new stack.
- Architecture: HIGH — patterns from codebase and standard multi-tenant RLS.
- Pitfalls: HIGH — RLS recursion and set_tenant timing are well-known; super_admin and seed tenant are explicit in PROJECT.md.

**Research date:** 2026-03-01  
**Valid until:** ~30 days (stable domain).
