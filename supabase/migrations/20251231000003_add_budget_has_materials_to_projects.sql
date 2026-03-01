-- Add budget_has_materials to projects for simple budget configuration
-- Migration: 20251231000003_add_budget_has_materials_to_projects.sql

BEGIN;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS budget_has_materials BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN public.projects.budget_has_materials IS 'For simple budgets, whether to include materials';

COMMIT;
