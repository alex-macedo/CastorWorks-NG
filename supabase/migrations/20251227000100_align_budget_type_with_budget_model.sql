-- Align project_budgets.budget_type with projects.budget_model
-- Migration: 20251227000100_align_budget_type_with_budget_model.sql
--
-- This migration aligns the budget_type values in project_budgets table
-- to match the budget_model values in projects table:
-- - simple (unchanged)
-- - detailed → bdi_brazil
-- - parametric → cost_control

BEGIN;

-- Drop the old constraint
ALTER TABLE public.project_budgets
  DROP CONSTRAINT IF EXISTS project_budgets_budget_type_check;

-- Add new constraint with values matching budget_model
ALTER TABLE public.project_budgets
  ADD CONSTRAINT project_budgets_budget_type_check
  CHECK (budget_type IN ('simple', 'bdi_brazil', 'cost_control'));

-- Migrate existing data to use new values
UPDATE public.project_budgets
SET budget_type = CASE
  WHEN budget_type = 'detailed' THEN 'bdi_brazil'
  WHEN budget_type = 'parametric' THEN 'cost_control'
  WHEN budget_type = 'simple' THEN 'simple'
  ELSE 'simple'  -- fallback for any other values
END
WHERE budget_type IN ('detailed', 'parametric') OR budget_type NOT IN ('simple', 'bdi_brazil', 'cost_control');

-- Update default value to match projects.budget_model default
ALTER TABLE public.project_budgets
  ALTER COLUMN budget_type SET DEFAULT 'simple';

-- Update column comment to document the alignment
COMMENT ON COLUMN public.project_budgets.budget_type IS 'Budget type matching projects.budget_model: simple, bdi_brazil, or cost_control';

COMMIT;
