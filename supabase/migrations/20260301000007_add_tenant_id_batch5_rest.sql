-- Phase 1 Wave 1: Add tenant_id to remaining tenant-scoped tables (Batch 5).
-- Plan: 01-01-PLAN.md Task 6. Nullable; backfill in Task 7.

-- Forms
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forms') THEN
    ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_forms_tenant_id ON public.forms(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'form_questions') THEN
    ALTER TABLE public.form_questions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_form_questions_tenant_id ON public.form_questions(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'form_responses') THEN
    ALTER TABLE public.form_responses ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_form_responses_tenant_id ON public.form_responses(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'form_response_answers') THEN
    ALTER TABLE public.form_response_answers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_form_response_answers_tenant_id ON public.form_response_answers(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'form_collaborators') THEN
    ALTER TABLE public.form_collaborators ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_form_collaborators_tenant_id ON public.form_collaborators(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'form_analytics_cache') THEN
    ALTER TABLE public.form_analytics_cache ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_form_analytics_cache_tenant_id ON public.form_analytics_cache(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'form_webhooks') THEN
    ALTER TABLE public.form_webhooks ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_form_webhooks_tenant_id ON public.form_webhooks(tenant_id);
  END IF;
END $$;

-- Notifications
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON public.notifications(tenant_id);
  END IF;
END $$;

-- Tax (tenant-scoped via project)
ALTER TABLE public.tax_projects ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_tax_projects_tenant_id ON public.tax_projects(tenant_id);

ALTER TABLE public.tax_estimates ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_tax_estimates_tenant_id ON public.tax_estimates(tenant_id);

ALTER TABLE public.tax_submissions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_tax_submissions_tenant_id ON public.tax_submissions(tenant_id);

ALTER TABLE public.tax_payments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_tax_payments_tenant_id ON public.tax_payments(tenant_id);

ALTER TABLE public.tax_documents ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_tax_documents_tenant_id ON public.tax_documents(tenant_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tax_vau_reference') THEN
    ALTER TABLE public.tax_vau_reference ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_tax_vau_reference_tenant_id ON public.tax_vau_reference(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tax_guide_process') THEN
    ALTER TABLE public.tax_guide_process ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_tax_guide_process_tenant_id ON public.tax_guide_process(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tax_alerts') THEN
    ALTER TABLE public.tax_alerts ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_tax_alerts_tenant_id ON public.tax_alerts(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tax_prefab_invoices') THEN
    ALTER TABLE public.tax_prefab_invoices ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_tax_prefab_invoices_tenant_id ON public.tax_prefab_invoices(tenant_id);
  END IF;
END $$;

-- Roadmap
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'roadmap_phases') THEN
    ALTER TABLE public.roadmap_phases ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_roadmap_phases_tenant_id ON public.roadmap_phases(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'roadmap_tasks') THEN
    ALTER TABLE public.roadmap_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_tenant_id ON public.roadmap_tasks(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'roadmap_task_updates') THEN
    ALTER TABLE public.roadmap_task_updates ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_roadmap_task_updates_tenant_id ON public.roadmap_task_updates(tenant_id);
  END IF;
END $$;

-- Financial / invoices / estimates / proposals (tenant-scoped)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON public.invoices(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'estimates') THEN
    ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_estimates_tenant_id ON public.estimates(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'proposals') THEN
    ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_proposals_tenant_id ON public.proposals(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes') THEN
    ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_quotes_tenant_id ON public.quotes(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_orders') THEN
    ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant_id ON public.purchase_orders(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'suppliers') THEN
    ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_id ON public.suppliers(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contractors') THEN
    ALTER TABLE public.contractors ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_contractors_tenant_id ON public.contractors(tenant_id);
  END IF;
END $$;

-- AI usage / architect time entries
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_usage_logs') THEN
    ALTER TABLE public.ai_usage_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_tenant_id ON public.ai_usage_logs(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'architect_time_entries') THEN
    ALTER TABLE public.architect_time_entries ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_architect_time_entries_tenant_id ON public.architect_time_entries(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_logs') THEN
    ALTER TABLE public.time_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_time_logs_tenant_id ON public.time_logs(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calendar_events') THEN
    ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant_id ON public.calendar_events(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'financial_collection_sequences') THEN
    ALTER TABLE public.financial_collection_sequences ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_financial_collection_sequences_tenant_id ON public.financial_collection_sequences(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'financial_collection_actions') THEN
    ALTER TABLE public.financial_collection_actions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_financial_collection_actions_tenant_id ON public.financial_collection_actions(tenant_id);
  END IF;
END $$;
