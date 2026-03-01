# Runbook: CastorWorks-NG Database Migration (Config & Templates Only)

**Purpose**: Create the CastorWorks-NG database by copying **schema** (from migrations) and **configuration/template/reference data only** from the current CastorWorks database. No projects, clients, purchases, or other transactional data.

**Audience**: AI Agent or human operator. Execute steps in order. All commands are copy-pasteable; replace placeholders where indicated.

**Schema reference**: When adding or changing multi-tenant schema (e.g. `tenant_id`, RLS, `tenants` table), use **CastorWorks/docs/plans/multi-tenant/multi-tenancy-best-practices.md** as the authoritative reference (shared schema with tenant_id approach). See also `.planning/PROJECT.md` in this repo.

**Prerequisites**:
- SSH access to Hostinger with alias `castorworks` and key `~/.ssh/castorworks_deploy`
- Current CastorWorks DB in container `supabase-db`
- New CastorWorks-NG DB already provisioned in container `supabase-ng-db` (or set `NG_CONTAINER` to the actual name)
- Working directory: project root (e.g. `/Users/amacedo/github/CastorWorks-NG` or repo root where `supabase/migrations` exists)

**Variables** (set once; use in commands below):

```bash
export SSH_HOST="castorworks"
export SSH_KEY="$HOME/.ssh/castorworks_deploy"
export SOURCE_CONTAINER="supabase-db"
export NG_CONTAINER="supabase-ng-db"
export DB_NAME="postgres"
export DB_USER="postgres"
export DUMP_DIR="./.migration-dumps"
```

Create dump directory and verify SSH:

```bash
mkdir -p "$DUMP_DIR"
ssh -i "$SSH_KEY" "$SSH_HOST" "echo 'SSH OK'"
ssh -i "$SSH_KEY" "$SSH_HOST" "docker exec $SOURCE_CONTAINER pg_isready -U $DB_USER -d $DB_NAME"
ssh -i "$SSH_KEY" "$SSH_HOST" "docker exec $NG_CONTAINER pg_isready -U $DB_USER -d $DB_NAME"
```

---

## Step 1: Apply full schema on NG database

Run all migrations from `supabase/migrations/` **in order** on the **NG** container so every table exists (no data yet).

From the project root:

```bash
# List migrations in order (by filename)
ls -1 supabase/migrations/*.sql | sort

# For each migration file, copy to remote and run against NG container.
# Example for a single migration (repeat for every file in order):
MIGRATION_FILE="supabase/migrations/20230126220613_doc_embeddings.sql"
scp -i "$SSH_KEY" "$MIGRATION_FILE" "$SSH_HOST:/tmp/"
ssh -i "$SSH_KEY" "$SSH_HOST" "docker exec -i $NG_CONTAINER psql -U $DB_USER -d $DB_NAME < /tmp/$(basename $MIGRATION_FILE)"
```

**Bulk run all migrations** (recommended):

```bash
for f in $(ls -1 supabase/migrations/*.sql | sort); do
  echo "Applying $(basename "$f")..."
  scp -i "$SSH_KEY" "$f" "$SSH_HOST:/tmp/"
  ssh -i "$SSH_KEY" "$SSH_HOST" "docker exec -i $NG_CONTAINER psql -U $DB_USER -d $DB_NAME < /tmp/$(basename "$f")"
done
```

If a migration fails (e.g. object already exists), fix or skip and continue. Ensure at least one user exists in NG’s `auth.users` (e.g. sign up once via the app) if any table has FK to `auth.users` and you plan to preserve `created_by`; otherwise use the FK-drop and NULL-out approach below.

---

## Step 2: Export data from current DB (config & templates only)

Export in **dependency order** so parent rows exist before child rows. Use separate dump files per layer and import in the same order.

**Table list by dependency layer**

- **Layer 1** (no FKs to other copied tables):  
  `cost_codes`, `company_profiles`, `currencies`, `app_settings`, `company_settings`, `maintenance_settings`, `integration_settings`, `project_task_statuses`, `dropdown_options`, `folder_templates`, `phase_templates`, `activity_templates`, `document_templates`, `sinapi_line_items_template`, `sinapi_project_template_items`, `simplebudget_materials_template`, `simplebudget_labor_template`, `simplebudget_materials_template_meta`, `simplebudget_labor_template_meta`, `whatsapp_templates`, `evolution_message_templates`, `inss_rates_history`, `inss_fator_social_brackets`, `inss_category_reductions`, `inss_labor_percentages`, `inss_destination_factors`, `inss_fator_ajuste_rules`, `inss_prefab_rules`, `inss_usinados_rules`, `castormind_prompt_templates`, `castormind_tool_permissions`, `ai_configurations`, `sidebar_option_permissions`, `sidebar_tab_permissions`, `notification_reminder_settings`, `financial_collection_sequences`, `construction_cost_benchmark_projects`, `construction_cost_benchmark_materials`, `construction_cost_benchmark_averages`, `construction_cost_benchmark_sources`, `construction_cost_benchmark_source_pages`, `exchange_rates`, `seed_data_registry`

- **Layer 2** (depend on Layer 1 or no FK to auth):  
  `project_wbs_templates`, `project_wbs_template_items`, `budget_templates`, `budget_template_items`, `budget_template_phases`, `budget_template_cost_codes`

- **Optional** (can be large; skip or export last):  
  `sinapi_items`, `user_preferences`

**Export commands** (run from host; dumps land in `$DUMP_DIR`):

```bash
# Layer 1 (single pg_dump with all Layer 1 tables)
ssh -i "$SSH_KEY" "$SSH_HOST" "docker exec $SOURCE_CONTAINER pg_dump -U $DB_USER -d $DB_NAME --data-only --no-owner --no-privileges \
  --table=public.cost_codes \
  --table=public.company_profiles \
  --table=public.currencies \
  --table=public.app_settings \
  --table=public.company_settings \
  --table=public.maintenance_settings \
  --table=public.integration_settings \
  --table=public.project_task_statuses \
  --table=public.dropdown_options \
  --table=public.folder_templates \
  --table=public.phase_templates \
  --table=public.activity_templates \
  --table=public.document_templates \
  --table=public.sinapi_line_items_template \
  --table=public.sinapi_project_template_items \
  --table=public.simplebudget_materials_template \
  --table=public.simplebudget_labor_template \
  --table=public.simplebudget_materials_template_meta \
  --table=public.simplebudget_labor_template_meta \
  --table=public.whatsapp_templates \
  --table=public.evolution_message_templates \
  --table=public.inss_rates_history \
  --table=public.inss_fator_social_brackets \
  --table=public.inss_category_reductions \
  --table=public.inss_labor_percentages \
  --table=public.inss_destination_factors \
  --table=public.inss_fator_ajuste_rules \
  --table=public.inss_prefab_rules \
  --table=public.inss_usinados_rules \
  --table=public.castormind_prompt_templates \
  --table=public.castormind_tool_permissions \
  --table=public.ai_configurations \
  --table=public.sidebar_option_permissions \
  --table=public.sidebar_tab_permissions \
  --table=public.notification_reminder_settings \
  --table=public.financial_collection_sequences \
  --table=public.exchange_rates \
  --table=public.seed_data_registry \
  " > "$DUMP_DIR/layer1_config_and_ref.sql"

# Layer 1b: construction_cost_benchmark_* (projects before materials/sources to satisfy FKs)
ssh -i "$SSH_KEY" "$SSH_HOST" "docker exec $SOURCE_CONTAINER pg_dump -U $DB_USER -d $DB_NAME --data-only --no-owner --no-privileges \
  --table=public.construction_cost_benchmark_projects \
  --table=public.construction_cost_benchmark_materials \
  --table=public.construction_cost_benchmark_averages \
  --table=public.construction_cost_benchmark_sources \
  --table=public.construction_cost_benchmark_source_pages \
  " > "$DUMP_DIR/layer1b_benchmarks.sql"

# Layer 2 (templates that reference company_profiles, cost_codes, or auth.users)
ssh -i "$SSH_KEY" "$SSH_HOST" "docker exec $SOURCE_CONTAINER pg_dump -U $DB_USER -d $DB_NAME --data-only --no-owner --no-privileges \
  --table=public.project_wbs_templates \
  --table=public.project_wbs_template_items \
  --table=public.budget_templates \
  --table=public.budget_template_items \
  --table=public.budget_template_phases \
  --table=public.budget_template_cost_codes \
  " > "$DUMP_DIR/layer2_templates.sql"
```

**Optional tables** (run only if you need them):

```bash
# sinapi_items (can be large)
ssh -i "$SSH_KEY" "$SSH_HOST" "docker exec $SOURCE_CONTAINER pg_dump -U $DB_USER -d $DB_NAME --data-only --no-owner --no-privileges --table=public.sinapi_items" > "$DUMP_DIR/optional_sinapi_items.sql"

# user_preferences (optional)
ssh -i "$SSH_KEY" "$SSH_HOST" "docker exec $SOURCE_CONTAINER pg_dump -U $DB_USER -d $DB_NAME --data-only --no-owner --no-privileges --table=public.user_preferences" > "$DUMP_DIR/optional_user_preferences.sql"
```

**Note**: Do **not** export `user_roles` or any table that is purely transactional (projects, clients, purchases, etc.). See PROJECT.md “Data to Exclude”.

---

## Step 3: Pre-import: relax FKs to auth.users (if needed)

Tables such as `budget_templates` and `project_wbs_templates` may have `created_by UUID REFERENCES auth.users(id)`. The NG DB has no users yet (or different IDs), so imports can fail. Option A: drop those FKs before import and set `created_by` to NULL after. Option B: create one user in NG first and skip dropping FKs if you will not import rows that reference other users.

**Option A – Drop FKs, import, then NULL and re-add** (run against **NG** container):

```bash
# Generate and run SQL to drop FKs that reference auth.users (inspect your schema for exact names)
ssh -i "$SSH_KEY" "$SSH_HOST" "docker exec -i $NG_CONTAINER psql -U $DB_USER -d $DB_NAME" << 'EOF'
-- Example: drop if exists (adjust constraint names per your migrations)
ALTER TABLE public.budget_templates DROP CONSTRAINT IF EXISTS budget_templates_created_by_fkey;
ALTER TABLE public.project_wbs_templates DROP CONSTRAINT IF EXISTS project_wbs_templates_created_by_fkey;
ALTER TABLE public.phase_templates DROP CONSTRAINT IF EXISTS phase_templates_created_by_fkey;
-- Add similar lines for any other table with created_by -> auth.users
EOF
```

Re-add constraints after import (Step 5).

---

## Step 4: Import data into NG database

Copy dump files to the server and feed them into the NG container **in order**: Layer 1, then Layer 2, then optional.

```bash
scp -i "$SSH_KEY" "$DUMP_DIR/layer1_config_and_ref.sql" "$SSH_HOST:/tmp/"
scp -i "$SSH_KEY" "$DUMP_DIR/layer1b_benchmarks.sql" "$SSH_HOST:/tmp/"
scp -i "$SSH_KEY" "$DUMP_DIR/layer2_templates.sql" "$SSH_HOST:/tmp/"

ssh -i "$SSH_KEY" "$SSH_HOST" "docker exec -i $NG_CONTAINER psql -U $DB_USER -d $DB_NAME < /tmp/layer1_config_and_ref.sql"
ssh -i "$SSH_KEY" "$SSH_HOST" "docker exec -i $NG_CONTAINER psql -U $DB_USER -d $DB_NAME < /tmp/layer1b_benchmarks.sql"
ssh -i "$SSH_KEY" "$SSH_HOST" "docker exec -i $NG_CONTAINER psql -U $DB_USER -d $DB_NAME < /tmp/layer2_templates.sql"
```

If you exported optional tables:

```bash
scp -i "$SSH_KEY" "$DUMP_DIR/optional_sinapi_items.sql" "$SSH_HOST:/tmp/"
ssh -i "$SSH_KEY" "$SSH_HOST" "docker exec -i $NG_CONTAINER psql -U $DB_USER -d $DB_NAME < /tmp/optional_sinapi_items.sql"
# optional_user_preferences similarly
```

---

## Step 5: Post-import: fix auth references and re-add FKs

If you dropped FKs in Step 3, set `created_by` (and similar columns) to NULL for imported rows, then re-add the constraints:

```bash
ssh -i "$SSH_KEY" "$SSH_HOST" "docker exec -i $NG_CONTAINER psql -U $DB_USER -d $DB_NAME" << 'EOF'
UPDATE public.budget_templates SET created_by = NULL WHERE created_by IS NOT NULL;
UPDATE public.project_wbs_templates SET created_by = NULL WHERE created_by IS NOT NULL;
UPDATE public.phase_templates SET created_by = NULL WHERE created_by IS NOT NULL;
-- Re-add FKs (adjust constraint names and column types to match your migrations)
-- ALTER TABLE public.budget_templates ADD CONSTRAINT budget_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
-- ALTER TABLE public.project_wbs_templates ADD CONSTRAINT project_wbs_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
-- ALTER TABLE public.phase_templates ADD CONSTRAINT phase_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
EOF
```

Re-add the `ALTER TABLE ... ADD CONSTRAINT` lines that match your migration definitions if you want the FKs back.

---

## Step 6: Verify

Run quick checks on the NG database:

```bash
ssh -i "$SSH_KEY" "$SSH_HOST" "docker exec -i $NG_CONTAINER psql -U $DB_USER -d $DB_NAME" << 'EOF'
SELECT 'app_settings' AS tbl, COUNT(*) AS n FROM public.app_settings
UNION ALL SELECT 'phase_templates', COUNT(*) FROM public.phase_templates
UNION ALL SELECT 'budget_templates', COUNT(*) FROM public.budget_templates
UNION ALL SELECT 'cost_codes', COUNT(*) FROM public.cost_codes
UNION ALL SELECT 'sidebar_option_permissions', COUNT(*) FROM public.sidebar_option_permissions;
EOF
```

Confirm that **no** project/client/purchase data exists:

```bash
ssh -i "$SSH_KEY" "$SSH_HOST" "docker exec -i $NG_CONTAINER psql -U $DB_USER -d $DB_NAME" << 'EOF'
SELECT COUNT(*) AS projects_count FROM public.projects;
SELECT COUNT(*) AS clients_count FROM public.clients;
EOF
```

Expect `0` for both.

---

## Step 7: Configure CastorWorks-NG app

Point the app at the **new** Supabase instance:

- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` (or `.env`) to the NG project’s URL and anon key.
- For the NG deployment in `/root/supabase-CastorWorks-NG`, the anon key is in `docs/.env.supabase` (variable `ANON_KEY`). The URL must be the NG Supabase API (Kong) public endpoint.
- Do **not** use the current CastorWorks production keys for the NG app.

---

## Summary: tables copied vs excluded

**Copied**: Configuration (app_settings, company_settings, maintenance_settings, integration_settings), templates (phase, activity, document, folder, WBS, budget, simplebudget, SINAPI, WhatsApp, Evolution), reference (cost_codes, company_profiles, currencies, exchange_rates, project_task_statuses, dropdown_options, INSS tables, construction_cost_benchmark_*), AI/config (castormind_prompt_templates, castormind_tool_permissions, ai_configurations), UI (sidebar_option_permissions, sidebar_tab_permissions, notification_reminder_settings, financial_collection_sequences), optional (sinapi_items, user_preferences, seed_data_registry).

**Not copied**: user_roles, projects, project_*, clients, suppliers, contacts, purchase_orders, quotes, financial_*, roadmap_*, campaigns (transactional), content_hub, estimates, proposals, ai_usage_logs, voice_recordings, meeting_recordings, and all other transactional or tenant-specific data. See PROJECT.md section “Data to Exclude”.

**Container names**: Current DB = `supabase-db`; NG DB = `supabase-ng-db` (or set `NG_CONTAINER` to the actual name). All commands use SSH host `castorworks` and key `~/.ssh/castorworks_deploy`.
