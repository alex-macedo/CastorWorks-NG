-- Migration: Add default and budget_has_column columns to simple budget templates
-- Purpose: Add missing columns needed for proper filtering during budget generation

BEGIN;

-- Add 'default' column to materials template
-- This will be used to filter which materials should be copied to budget
ALTER TABLE public.simplebudget_materials_template 
  ADD COLUMN IF NOT EXISTS "default" BOOLEAN NOT NULL DEFAULT true;

-- Add 'budget_has_column' column to labor template  
-- This will be used to filter which labor items should be copied
ALTER TABLE public.simplebudget_labor_template 
  ADD COLUMN IF NOT EXISTS budget_has_column BOOLEAN NOT NULL DEFAULT false;

-- Create indexes for these new filter columns
CREATE INDEX IF NOT EXISTS idx_simplebudget_materials_template_default 
  ON public.simplebudget_materials_template("default");
CREATE INDEX IF NOT EXISTS idx_simplebudget_labor_template_budget_has_column 
  ON public.simplebudget_labor_template(budget_has_column);

COMMIT;
