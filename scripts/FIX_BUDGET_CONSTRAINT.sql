-- Quick Fix for Budget Type Constraint Error
-- Run this in Supabase Studio SQL Editor
-- Date: 2025-12-23

BEGIN;

-- Step 1: Drop old constraint
ALTER TABLE public.project_budgets
  DROP CONSTRAINT IF EXISTS project_budgets_budget_type_check;

-- Step 2: Add new constraint with correct values
ALTER TABLE public.project_budgets
  ADD CONSTRAINT project_budgets_budget_type_check 
  CHECK (budget_type IN ('simple', 'detailed', 'parametric'));

-- Step 3: Update existing records (if any)
UPDATE public.project_budgets
SET budget_type = CASE
  WHEN budget_type = 'synthetic' THEN 'simple'
  WHEN budget_type = 'comparative' THEN 'parametric'
  ELSE budget_type
END
WHERE budget_type IN ('synthetic', 'comparative');

-- Step 4: Update default value
ALTER TABLE public.project_budgets
  ALTER COLUMN budget_type SET DEFAULT 'detailed';

COMMIT;

-- Verify the fix
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.project_budgets'::regclass
  AND conname = 'project_budgets_budget_type_check';

