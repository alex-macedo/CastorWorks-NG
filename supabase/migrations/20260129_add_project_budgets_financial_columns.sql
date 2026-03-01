-- Add missing financial columns to project_budgets table
-- Migration: 20260129_add_project_budgets_financial_columns.sql
--
-- This migration adds the columns required by the architect-financial-advisor edge function:
-- - total_budget
-- - contingency_amount
-- - labor_budget
-- - materials_budget
-- - equipment_budget
-- - subcontractor_budget

-- Add financial columns to project_budgets table
ALTER TABLE public.project_budgets
  ADD COLUMN IF NOT EXISTS total_budget DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contingency_amount DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labor_budget DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS materials_budget DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS equipment_budget DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subcontractor_budget DECIMAL(15,2) DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN public.project_budgets.total_budget IS 'Total budget amount for the project';
COMMENT ON COLUMN public.project_budgets.contingency_amount IS 'Contingency/reserve amount for unexpected costs';
COMMENT ON COLUMN public.project_budgets.labor_budget IS 'Budget allocated for labor costs';
COMMENT ON COLUMN public.project_budgets.materials_budget IS 'Budget allocated for materials costs';
COMMENT ON COLUMN public.project_budgets.equipment_budget IS 'Budget allocated for equipment costs';
COMMENT ON COLUMN public.project_budgets.subcontractor_budget IS 'Budget allocated for subcontractor costs';

-- Create indexes for common financial queries
CREATE INDEX IF NOT EXISTS idx_project_budgets_total_budget ON public.project_budgets(total_budget);
CREATE INDEX IF NOT EXISTS idx_project_budgets_project_id_total_budget ON public.project_budgets(project_id, total_budget);
