-- Fix budget_type constraint to match frontend values
-- Migration: 20251223190000_fix_budget_type_constraint.sql

-- Drop the constraint if it exists (must be done outside transaction for some constraint types)
ALTER TABLE public.project_budgets
  DROP CONSTRAINT IF EXISTS project_budgets_budget_type_check;

BEGIN;

-- Update existing data to use new values before applying constraint
-- Convert old values to new values
UPDATE public.project_budgets
SET budget_type = 'simple'
WHERE budget_type = 'synthetic';

UPDATE public.project_budgets
SET budget_type = 'parametric'
WHERE budget_type = 'comparative';

-- Fix any other invalid values to default to 'simple'
UPDATE public.project_budgets
SET budget_type = 'simple'
WHERE budget_type NOT IN ('simple', 'detailed', 'parametric');

-- Add new constraint with correct values matching the frontend
ALTER TABLE public.project_budgets
  ADD CONSTRAINT project_budgets_budget_type_check
  CHECK (budget_type IN ('simple', 'detailed', 'parametric'));

-- Update default value
ALTER TABLE public.project_budgets
  ALTER COLUMN budget_type SET DEFAULT 'simple';

COMMIT;

