-- Migration: Add standard_duration_days and standard_cost_code to project_wbs_template_items
-- Created: 2026-01-30
-- Purpose: Add duration and cost code fields to WBS template items for sync with phases

-- Add standard_duration_days column
ALTER TABLE public.project_wbs_template_items
ADD COLUMN IF NOT EXISTS standard_duration_days INTEGER;

-- Add standard_cost_code column
ALTER TABLE public.project_wbs_template_items
ADD COLUMN IF NOT EXISTS standard_cost_code TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.project_wbs_template_items.standard_duration_days IS 'Standard duration in days for this WBS item, synced from phases template';
COMMENT ON COLUMN public.project_wbs_template_items.standard_cost_code IS 'Standard cost code for this WBS item';
