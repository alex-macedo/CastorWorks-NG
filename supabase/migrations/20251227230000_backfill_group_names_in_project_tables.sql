-- Migration: backfill_group_names_in_project_tables
-- Description: Backfills NULL or empty group_name/group fields in project_materials and project_labor
-- This ensures all items have proper group names for correct categorization

BEGIN;

-- Backfill project_materials.group_name
-- Set to 'Materials' ONLY if NULL or empty AND not already set from template
-- This ensures we don't overwrite correct group names from templates
UPDATE public.project_materials
SET group_name = 'Materials'
WHERE (group_name IS NULL OR group_name = '')
  AND NOT EXISTS (
    -- Don't overwrite if this material matches a template material with a group_name
    SELECT 1 FROM public.simplebudget_materials_template smt
    WHERE smt.description = project_materials.description
      AND smt.group_name IS NOT NULL
      AND smt.group_name != ''
  );

-- Log how many rows were updated
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % project_materials rows with NULL/empty group_name', v_updated_count;
END $$;

-- Backfill project_labor.group
-- Set to 'Labor' ONLY if NULL or empty AND not already set from template
-- This ensures we don't overwrite correct group names from templates
UPDATE public.project_labor
SET "group" = 'Labor'
WHERE ("group" IS NULL OR "group" = '')
  AND NOT EXISTS (
    -- Don't overwrite if this labor item matches a template labor item with a group
    SELECT 1 FROM public.simplebudget_labor_template slt
    WHERE slt.description = project_labor.description
      AND slt."group" IS NOT NULL
      AND slt."group" != ''
  );

-- Log how many rows were updated
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % project_labor rows with NULL/empty group', v_updated_count;
END $$;

-- Add constraint to prevent future NULL values (optional, but helpful)
-- Note: We'll make these NOT NULL with defaults instead of constraints to avoid breaking existing code

-- Ensure group_name has a default for project_materials
ALTER TABLE public.project_materials
ALTER COLUMN group_name SET DEFAULT 'Materials';

-- Ensure group has a default for project_labor  
ALTER TABLE public.project_labor
ALTER COLUMN "group" SET DEFAULT 'Labor';

COMMIT;
