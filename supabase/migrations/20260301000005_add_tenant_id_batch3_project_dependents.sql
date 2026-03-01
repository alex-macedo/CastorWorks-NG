-- Phase 1 Wave 1: Add tenant_id to project/client dependents (Batch 3).
-- Plan: 01-01-PLAN.md Task 5. Nullable; backfill in Task 7.

-- Project-scoped
ALTER TABLE public.project_phases ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_project_phases_tenant_id ON public.project_phases(tenant_id);

ALTER TABLE public.project_team_members ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_project_team_members_tenant_id ON public.project_team_members(tenant_id);

ALTER TABLE public.project_documents ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_project_documents_tenant_id ON public.project_documents(tenant_id);

ALTER TABLE public.project_photos ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_project_photos_tenant_id ON public.project_photos(tenant_id);

ALTER TABLE public.daily_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_tenant_id ON public.daily_logs(tenant_id);

ALTER TABLE public.client_project_access ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_client_project_access_tenant_id ON public.client_project_access(tenant_id);

ALTER TABLE public.project_access_grants ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_project_access_grants_tenant_id ON public.project_access_grants(tenant_id);

ALTER TABLE public.project_financial_entries ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_project_financial_entries_tenant_id ON public.project_financial_entries(tenant_id);

ALTER TABLE public.project_materials ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_project_materials_tenant_id ON public.project_materials(tenant_id);

ALTER TABLE public.project_activities ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_project_activities_tenant_id ON public.project_activities(tenant_id);

ALTER TABLE public.project_resources ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_project_resources_tenant_id ON public.project_resources(tenant_id);

ALTER TABLE public.project_comments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_project_comments_tenant_id ON public.project_comments(tenant_id);

ALTER TABLE public.project_budget_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_project_budget_items_tenant_id ON public.project_budget_items(tenant_id);

ALTER TABLE public.project_purchase_requests ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_project_purchase_requests_tenant_id ON public.project_purchase_requests(tenant_id);

ALTER TABLE public.purchase_request_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_purchase_request_items_tenant_id ON public.purchase_request_items(tenant_id);

ALTER TABLE public.project_budget_versions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_project_budget_versions_tenant_id ON public.project_budget_versions(tenant_id);

ALTER TABLE public.project_budget_lines ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_project_budget_lines_tenant_id ON public.project_budget_lines(tenant_id);

ALTER TABLE public.project_commitments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_project_commitments_tenant_id ON public.project_commitments(tenant_id);

ALTER TABLE public.project_folders ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_project_folders_tenant_id ON public.project_folders(tenant_id);

ALTER TABLE public.folder_client_access ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_folder_client_access_tenant_id ON public.folder_client_access(tenant_id);

-- project_task_statuses may exist without public prefix in some migrations
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_task_statuses') THEN
    ALTER TABLE public.project_task_statuses ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_project_task_statuses_tenant_id ON public.project_task_statuses(tenant_id);
  END IF;
END $$;

-- project_calendar, milestone_delays, project_wbs_items, project_wbs_nodes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_calendar') THEN
    ALTER TABLE public.project_calendar ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_project_calendar_tenant_id ON public.project_calendar(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'milestone_delays') THEN
    ALTER TABLE public.milestone_delays ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_milestone_delays_tenant_id ON public.milestone_delays(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_wbs_items') THEN
    ALTER TABLE public.project_wbs_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_project_wbs_items_tenant_id ON public.project_wbs_items(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_wbs_nodes') THEN
    ALTER TABLE public.project_wbs_nodes ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_project_wbs_nodes_tenant_id ON public.project_wbs_nodes(tenant_id);
  END IF;
END $$;

-- content_hub
ALTER TABLE public.content_hub ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_content_hub_tenant_id ON public.content_hub(tenant_id);

-- architect_*
ALTER TABLE public.architect_opportunities ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_architect_opportunities_tenant_id ON public.architect_opportunities(tenant_id);

ALTER TABLE public.architect_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_architect_tasks_tenant_id ON public.architect_tasks(tenant_id);

ALTER TABLE public.architect_site_diary ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_architect_site_diary_tenant_id ON public.architect_site_diary(tenant_id);

ALTER TABLE public.architect_client_portal_tokens ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_architect_client_portal_tokens_tenant_id ON public.architect_client_portal_tokens(tenant_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'architect_pipeline_statuses') THEN
    ALTER TABLE public.architect_pipeline_statuses ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_architect_pipeline_statuses_tenant_id ON public.architect_pipeline_statuses(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'architect_briefings') THEN
    ALTER TABLE public.architect_briefings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_architect_briefings_tenant_id ON public.architect_briefings(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'architect_meetings') THEN
    ALTER TABLE public.architect_meetings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_architect_meetings_tenant_id ON public.architect_meetings(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'architect_task_comments') THEN
    ALTER TABLE public.architect_task_comments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_architect_task_comments_tenant_id ON public.architect_task_comments(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'architect_moodboard_sections') THEN
    ALTER TABLE public.architect_moodboard_sections ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_architect_moodboard_sections_tenant_id ON public.architect_moodboard_sections(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'architect_moodboard_images') THEN
    ALTER TABLE public.architect_moodboard_images ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_architect_moodboard_images_tenant_id ON public.architect_moodboard_images(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'architect_moodboard_colors') THEN
    ALTER TABLE public.architect_moodboard_colors ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_architect_moodboard_colors_tenant_id ON public.architect_moodboard_colors(tenant_id);
  END IF;
END $$;

-- invoice_conversations
ALTER TABLE public.invoice_conversations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_invoice_conversations_tenant_id ON public.invoice_conversations(tenant_id);

-- project_labor, project_milestones, project_milestone_definitions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_labor') THEN
    ALTER TABLE public.project_labor ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_project_labor_tenant_id ON public.project_labor(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_milestones') THEN
    ALTER TABLE public.project_milestones ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_project_milestones_tenant_id ON public.project_milestones(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_milestone_definitions') THEN
    ALTER TABLE public.project_milestone_definitions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_project_milestone_definitions_tenant_id ON public.project_milestone_definitions(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_stakeholders') THEN
    ALTER TABLE public.project_stakeholders ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_project_stakeholders_tenant_id ON public.project_stakeholders(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'milestone_dependencies') THEN
    ALTER TABLE public.milestone_dependencies ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_milestone_dependencies_tenant_id ON public.milestone_dependencies(tenant_id);
  END IF;
END $$;
