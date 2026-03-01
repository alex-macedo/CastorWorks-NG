-- Rename budget_type to budget_model in project_budgets table
-- Migration: 20251227000200_rename_budget_type_to_budget_model.sql
--
-- This migration renames the budget_type column to budget_model
-- to match the naming convention used in the projects table

BEGIN;

-- Rename the column
ALTER TABLE public.project_budgets
  RENAME COLUMN budget_type TO budget_model;

-- Update the constraint name to match the new column name
ALTER TABLE public.project_budgets
  DROP CONSTRAINT IF EXISTS project_budgets_budget_type_check;

ALTER TABLE public.project_budgets
  ADD CONSTRAINT project_budgets_budget_model_check
  CHECK (budget_model IN ('simple', 'bdi_brazil', 'cost_control'));

-- Update column comment
COMMENT ON COLUMN public.project_budgets.budget_model IS 'Budget model type matching projects.budget_model: simple, bdi_brazil, or cost_control';

COMMIT;
