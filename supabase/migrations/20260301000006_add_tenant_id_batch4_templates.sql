-- Phase 1 Wave 1: Add tenant_id to template tables (Batch 4).
-- Plan: 01-01-PLAN.md Task 6. Nullable; backfill in Task 7.

ALTER TABLE public.project_wbs_templates ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_project_wbs_templates_tenant_id ON public.project_wbs_templates(tenant_id);

ALTER TABLE public.project_wbs_template_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_project_wbs_template_items_tenant_id ON public.project_wbs_template_items(tenant_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budget_templates') THEN
    ALTER TABLE public.budget_templates ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_budget_templates_tenant_id ON public.budget_templates(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budget_template_items') THEN
    ALTER TABLE public.budget_template_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_budget_template_items_tenant_id ON public.budget_template_items(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budget_template_phases') THEN
    ALTER TABLE public.budget_template_phases ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_budget_template_phases_tenant_id ON public.budget_template_phases(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budget_template_cost_codes') THEN
    ALTER TABLE public.budget_template_cost_codes ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_budget_template_cost_codes_tenant_id ON public.budget_template_cost_codes(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'phase_templates') THEN
    ALTER TABLE public.phase_templates ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_phase_templates_tenant_id ON public.phase_templates(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activity_templates') THEN
    ALTER TABLE public.activity_templates ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_activity_templates_tenant_id ON public.activity_templates(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_templates') THEN
    ALTER TABLE public.document_templates ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_document_templates_tenant_id ON public.document_templates(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'folder_templates') THEN
    ALTER TABLE public.folder_templates ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_folder_templates_tenant_id ON public.folder_templates(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'company_profiles') THEN
    ALTER TABLE public.company_profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_company_profiles_tenant_id ON public.company_profiles(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cost_codes') THEN
    ALTER TABLE public.cost_codes ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_cost_codes_tenant_id ON public.cost_codes(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'simplebudget_materials_template') THEN
    ALTER TABLE public.simplebudget_materials_template ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_simplebudget_materials_template_tenant_id ON public.simplebudget_materials_template(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'simplebudget_labor_template') THEN
    ALTER TABLE public.simplebudget_labor_template ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_simplebudget_labor_template_tenant_id ON public.simplebudget_labor_template(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'simplebudget_materials_template_meta') THEN
    ALTER TABLE public.simplebudget_materials_template_meta ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_simplebudget_materials_template_meta_tenant_id ON public.simplebudget_materials_template_meta(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'simplebudget_labor_template_meta') THEN
    ALTER TABLE public.simplebudget_labor_template_meta ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
    CREATE INDEX IF NOT EXISTS idx_simplebudget_labor_template_meta_tenant_id ON public.simplebudget_labor_template_meta(tenant_id);
  END IF;
END $$;
