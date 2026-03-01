-- Migration: Cleanup old template data
-- Purpose: Delete old template materials and labor from project_materials/project_labor
-- that used the all-zeros UUID pattern
-- 
-- NOTE: This migration should be run AFTER frontend is updated and verified working.
-- The old data is kept until this point to allow rollback if needed.

BEGIN;

-- Delete old template materials (all-zeros UUID)
DELETE FROM public.project_materials
WHERE project_id = '00000000-0000-0000-0000-000000000000';

-- Delete old template labor (all-zeros UUID)
DELETE FROM public.project_labor
WHERE project_id = '00000000-0000-0000-0000-000000000000';

-- Verify cleanup
DO $$
DECLARE
  remaining_materials INTEGER;
  remaining_labor INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_materials 
  FROM public.project_materials
  WHERE project_id = '00000000-0000-0000-0000-000000000000';
  
  SELECT COUNT(*) INTO remaining_labor
  FROM public.project_labor
  WHERE project_id = '00000000-0000-0000-0000-000000000000';
  
  IF remaining_materials > 0 OR remaining_labor > 0 THEN
    RAISE WARNING 'Still found % materials and % labor items with template UUID', remaining_materials, remaining_labor;
  ELSE
    RAISE NOTICE 'Successfully cleaned up old template data';
  END IF;
END $$;

COMMIT;
