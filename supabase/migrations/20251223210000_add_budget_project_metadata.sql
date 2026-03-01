-- Add project metadata fields to project_budgets table
-- Migration: 20251223210000_add_budget_project_metadata.sql
-- Purpose: Support Overview (sin) worksheet with project information

BEGIN;

-- Add project metadata columns
ALTER TABLE public.project_budgets
  ADD COLUMN IF NOT EXISTS project_location TEXT,
  ADD COLUMN IF NOT EXISTS project_area NUMERIC,
  ADD COLUMN IF NOT EXISTS project_area_unit VARCHAR(10) DEFAULT 'm²',
  ADD COLUMN IF NOT EXISTS construction_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS client_contact TEXT,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add index for common searches
CREATE INDEX IF NOT EXISTS idx_project_budgets_client_name 
  ON public.project_budgets(client_name);

CREATE INDEX IF NOT EXISTS idx_project_budgets_construction_type 
  ON public.project_budgets(construction_type);

-- Add comment for documentation
COMMENT ON COLUMN public.project_budgets.project_location IS 'Physical location of the project (city, state, address)';
COMMENT ON COLUMN public.project_budgets.project_area IS 'Total construction area';
COMMENT ON COLUMN public.project_budgets.project_area_unit IS 'Unit of measurement for area (m², ft², etc.)';
COMMENT ON COLUMN public.project_budgets.construction_type IS 'Type of construction (Residential, Commercial, Industrial, etc.)';
COMMENT ON COLUMN public.project_budgets.client_name IS 'Client or property owner name';
COMMENT ON COLUMN public.project_budgets.client_contact IS 'Client contact information (email, phone)';
COMMENT ON COLUMN public.project_budgets.start_date IS 'Project start date';
COMMENT ON COLUMN public.project_budgets.end_date IS 'Project end date';
COMMENT ON COLUMN public.project_budgets.notes IS 'Additional project notes and observations';

COMMIT;

