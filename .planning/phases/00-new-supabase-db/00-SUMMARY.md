# Phase 0: New Supabase DB & Config/Template Migration — Execution Summary

**Executed:** 2026-03-01  
**Status:** Complete

## Objective

Create the CastorWorks-NG database by applying the full schema and importing configuration/template/reference data only from the current CastorWorks database. No projects, clients, or transactional data.

## What Was Done

1. **Schema on NG**
   - Restored full `public` schema from SOURCE (`supabase-db`) via `pg_dump --schema-only --clean --if-exists` and applied to NG (`castorworks-ng-db`). Migrations were not run in order (660 files have dependency issues on a fresh DB); schema dump ensured exact match with source.

2. **Data export (from SOURCE)**
   - **Layer 1:** Config and reference (app_settings, company_settings, cost_codes, currencies, phase_templates, activity_templates, dropdown_options, INSS tables, castormind_prompt_templates, sidebar_option_permissions, simplebudget_*, sinapi_project_template_items, whatsapp_templates, seed_data_registry, etc.).
   - **Layer 1b:** construction_cost_benchmark_*.
   - **Layer 2:** project_wbs_templates, project_wbs_template_items, budget_templates, budget_template_items, budget_template_phases, budget_template_cost_codes.

3. **Pre-import on NG**
   - Dropped FKs to `auth.users` (and `project_task_statuses.project_id` → `projects`) on tables being imported so inserts would not fail for missing users/projects.
   - Added missing `app_role` enum values on NG: `architect`, `editor`, `global_admin`.
   - Dropped check constraint `check_sinapi_code_exists` on `sinapi_project_template_items` for import.

4. **Import**
   - Stripped `pg_dump` warning lines from layer1 and layer2 dump files, then imported in order: layer1 → layer1b → layer2.

5. **Post-import**
   - Set `created_by = NULL` on budget_templates, project_wbs_templates, phase_templates, folder_templates (columns altered to allow NULL where needed).
   - Set `project_id = NULL` on project_task_statuses (column altered to allow NULL). FKs were not re-added so config remains independent of auth/users and projects.

6. **Verification**
   - Confirmed row counts on app_settings, phase_templates, budget_templates, cost_codes, sidebar_option_permissions.
   - Confirmed `projects` and `clients` counts are 0.

## Key Files / Artifacts

- **Runbook:** `docs/runbooks/ng-db-migration.md`
- **Dumps (local):** `.migration-dumps/layer1_config_and_ref.sql`, `layer1b_benchmarks.sql`, `layer2_templates.sql`, `ng_schema_from_source.sql`
- **NG container:** `castorworks-ng-db` (Hostinger, `/root/supabase-CastorWorks-NG`)
- **Source container:** `supabase-db`

## App configuration (Step 7)

To point the CastorWorks-NG app at this NG database:

- Set in `.env.local` (or `.env`):
  - `VITE_SUPABASE_URL` = NG Supabase API URL (e.g. Kong public URL for the NG stack).
  - `VITE_SUPABASE_ANON_KEY` = anon key for the NG project (value in `docs/.env.supabase` as `ANON_KEY`).
- Do not use production CastorWorks keys for the NG app.

## Deviations / Notes

- Schema was applied via dump/restore from SOURCE instead of running all migrations on NG, due to migration order/dependencies on a clean DB.
- Some RLS/enum differences during schema restore were fixed (app_role values, nullable columns) to allow data import.
- Optional runbook steps (sinapi_items, user_preferences) were not run.
