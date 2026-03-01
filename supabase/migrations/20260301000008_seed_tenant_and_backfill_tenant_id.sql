-- Phase 1 Wave 1: Seed initial tenant and backfill tenant_id on all tables.
-- Plan: 01-01-PLAN.md Task 7. Then set tenant_id NOT NULL where applicable.

DO $$
DECLARE
  v_tenant_id UUID;
  r RECORD;
BEGIN
  INSERT INTO public.tenants (name, slug, status)
  VALUES ('CastorWorks NG', 'castorworks-ng', 'active')
  ON CONFLICT (slug) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_tenant_id;

  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'castorworks-ng' LIMIT 1;
  END IF;

  -- Backfill: every table that has tenant_id column
  UPDATE public.projects SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.clients SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.company_settings SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.app_settings SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.user_preferences SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.dropdown_options SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;

  UPDATE public.project_phases SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.project_team_members SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.project_documents SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.project_photos SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.daily_logs SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.client_project_access SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.project_access_grants SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.project_financial_entries SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.project_materials SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.project_activities SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.project_resources SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.project_comments SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.project_budget_items SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.project_purchase_requests SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.purchase_request_items SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.project_budget_versions SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.project_budget_lines SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.project_commitments SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.project_folders SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.folder_client_access SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.content_hub SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.architect_opportunities SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.architect_tasks SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.architect_site_diary SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.architect_client_portal_tokens SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.invoice_conversations SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;

  UPDATE public.project_wbs_templates SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.project_wbs_template_items SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;

  UPDATE public.tax_projects SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.tax_estimates SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.tax_submissions SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.tax_payments SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.tax_documents SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;

  -- Optional tables (may not exist or may have no column yet)
  FOR r IN (
    SELECT table_schema, table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'tenant_id'
      AND table_name NOT IN (
        'tenants', 'tenant_users',
        'projects', 'clients', 'company_settings', 'app_settings', 'user_preferences', 'dropdown_options',
        'project_phases', 'project_team_members', 'project_documents', 'project_photos', 'daily_logs',
        'client_project_access', 'project_access_grants', 'project_financial_entries', 'project_materials',
        'project_activities', 'project_resources', 'project_comments', 'project_budget_items',
        'project_purchase_requests', 'purchase_request_items', 'project_budget_versions', 'project_budget_lines',
        'project_commitments', 'project_folders', 'folder_client_access', 'content_hub',
        'architect_opportunities', 'architect_tasks', 'architect_site_diary', 'architect_client_portal_tokens',
        'invoice_conversations', 'project_wbs_templates', 'project_wbs_template_items',
        'tax_projects', 'tax_estimates', 'tax_submissions', 'tax_payments', 'tax_documents'
      )
  ) LOOP
    EXECUTE format('UPDATE %I.%I SET tenant_id = $1 WHERE tenant_id IS NULL', r.table_schema, r.table_name)
      USING v_tenant_id;
  END LOOP;
END $$;

-- Set NOT NULL on tenant_id for all tables that have it (except tenants, tenant_users)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT table_schema, table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'tenant_id'
      AND table_name NOT IN ('tenants', 'tenant_users')
  ) LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN tenant_id SET NOT NULL', r.table_schema, r.table_name);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not set NOT NULL on %.% (%). Skipping.', r.table_schema, r.table_name, SQLERRM;
    END;
  END LOOP;
END $$;
