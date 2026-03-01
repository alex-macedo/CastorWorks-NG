-- Add description and unit columns to template table
-- Migration: 20251225160000_add_template_description_unit.sql
-- Purpose: Store template-specific description and unit from sinapi_list_project.csv

BEGIN;

-- Add description column
ALTER TABLE public.sinapi_project_template_items
ADD COLUMN IF NOT EXISTS description text;

-- Add unit column
ALTER TABLE public.sinapi_project_template_items
ADD COLUMN IF NOT EXISTS unit text;

-- Add comment explaining these fields
COMMENT ON COLUMN public.sinapi_project_template_items.description IS 'Template-specific description from sinapi_list_project.csv (overrides sinapi_items description)';
COMMENT ON COLUMN public.sinapi_project_template_items.unit IS 'Template-specific unit from sinapi_list_project.csv (overrides sinapi_items unit)';

COMMIT;
