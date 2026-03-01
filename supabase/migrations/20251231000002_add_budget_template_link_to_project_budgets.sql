-- Add budget template linkage and materials flag support
-- Migration: 20251231000002_add_budget_template_link_to_project_budgets.sql

BEGIN;

ALTER TABLE public.project_budgets
  ADD COLUMN IF NOT EXISTS budget_template_id UUID
    REFERENCES public.budget_templates(id)
    ON DELETE SET NULL;

ALTER TABLE public.budget_templates
  ADD COLUMN IF NOT EXISTS has_materials BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN public.project_budgets.budget_template_id IS 'Budget template used to initialize this budget';
COMMENT ON COLUMN public.budget_templates.has_materials IS 'Whether the template includes materials in its line items';

COMMIT;
