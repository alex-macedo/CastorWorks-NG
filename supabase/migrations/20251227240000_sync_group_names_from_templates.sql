-- Migration: sync_group_names_from_templates
-- Description: Syncs group_name/group from template tables to existing project_materials and project_labor
-- This fixes cases where duplication didn't preserve group names correctly

BEGIN;

-- Sync project_materials.group_name from simplebudget_materials_template
-- Match by description (case-insensitive, trimmed) and update group_name
-- This fixes existing data that was created without proper group names
UPDATE public.project_materials pm
SET group_name = smt.group_name
FROM public.simplebudget_materials_template smt
WHERE TRIM(LOWER(pm.description)) = TRIM(LOWER(smt.description))
  AND smt.group_name IS NOT NULL
  AND smt.group_name != ''
  AND (pm.group_name IS NULL 
       OR pm.group_name = '' 
       OR pm.group_name = 'Materials'  -- Update if currently default
       OR pm.group_name != smt.group_name);  -- Or if group name doesn't match template

-- Log how many rows were updated
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Synced group_name for % project_materials rows from template', v_updated_count;
END $$;

-- Sync project_labor.group from simplebudget_labor_template
-- Match by description (case-insensitive, trimmed) and update group
-- This fixes existing data that was created without proper group names
UPDATE public.project_labor pl
SET "group" = slt."group"
FROM public.simplebudget_labor_template slt
WHERE TRIM(LOWER(pl.description)) = TRIM(LOWER(slt.description))
  AND slt."group" IS NOT NULL
  AND slt."group" != ''
  AND (pl."group" IS NULL 
       OR pl."group" = '' 
       OR pl."group" = 'Labor'  -- Update if currently default
       OR pl."group" != slt."group");  -- Or if group doesn't match template

-- Log how many rows were updated
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Synced group for % project_labor rows from template', v_updated_count;
END $$;

COMMIT;
