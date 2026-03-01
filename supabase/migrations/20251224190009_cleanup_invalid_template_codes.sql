-- Clean up invalid SINAPI template codes
-- Migration: 20251224190009_cleanup_invalid_template_codes.sql
-- Purpose: Remove template items that reference non-existent SINAPI codes
-- This fixes data quality issues while preserving valid template data

BEGIN;

-- Step 1: Create backup table for invalid template items
-- This preserves the data in case we need to investigate or restore later
CREATE TABLE IF NOT EXISTS public.sinapi_project_template_items_invalid_backup AS
SELECT
  *,
  NOW() as backed_up_at,
  '20251224190009_cleanup_invalid_template_codes' as backup_reason
FROM public.sinapi_project_template_items
WHERE NOT EXISTS (
  SELECT 1 FROM public.sinapi_items si
  WHERE si.sinapi_code = sinapi_project_template_items.sinapi_code LIMIT 1
);

-- Add comment to backup table
COMMENT ON TABLE public.sinapi_project_template_items_invalid_backup IS
  'Backup of template items with invalid SINAPI codes removed during cleanup migration 20251224190009';

-- Step 2: Log the cleanup operation
-- Insert a record into a log table if it exists, or just RAISE NOTICE
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM public.sinapi_project_template_items
  WHERE NOT EXISTS (
    SELECT 1 FROM public.sinapi_items si
    WHERE si.sinapi_code = sinapi_project_template_items.sinapi_code LIMIT 1
  );

  RAISE NOTICE 'Found % invalid template items to be removed', invalid_count;

  -- If there's an audit log table, we could log here
  -- INSERT INTO audit_log (action, details) VALUES ('template_cleanup', json_build_object('invalid_items_removed', invalid_count));
END $$;

-- Step 3: Delete invalid template items
-- Only remove items where the SINAPI code doesn't exist in the catalog
DELETE FROM public.sinapi_project_template_items
WHERE NOT EXISTS (
  SELECT 1 FROM public.sinapi_items si
  WHERE si.sinapi_code = sinapi_project_template_items.sinapi_code LIMIT 1
);

-- Step 4: Verify the cleanup
DO $$
DECLARE
  remaining_count INTEGER;
  backup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count FROM public.sinapi_project_template_items;
  SELECT COUNT(*) INTO backup_count FROM public.sinapi_project_template_items_invalid_backup;

  RAISE NOTICE 'Cleanup completed: % items remaining, % items backed up', remaining_count, backup_count;

  -- Verify no invalid items remain
  IF EXISTS (
    SELECT 1 FROM public.sinapi_project_template_items t
    WHERE NOT EXISTS (
      SELECT 1 FROM public.sinapi_items si
      WHERE si.sinapi_code = t.sinapi_code LIMIT 1
    )
  ) THEN
    RAISE EXCEPTION 'Cleanup failed: Invalid items still exist after deletion';
  END IF;
END $$;

-- Step 5: Now that all invalid codes are removed, validate the constraint
-- This will ensure future inserts/updates are validated
ALTER TABLE public.sinapi_project_template_items
VALIDATE CONSTRAINT check_sinapi_code_exists;

-- Update the constraint comment to reflect that it's now validated
COMMENT ON CONSTRAINT check_sinapi_code_exists ON public.sinapi_project_template_items IS
  'Ensures template items reference valid SINAPI codes. Constraint is VALIDATED - all existing data is clean. Cannot use foreign key because sinapi_code is not unique (same code can have multiple items).';

-- Grant permissions on backup table for admin access
GRANT SELECT ON public.sinapi_project_template_items_invalid_backup TO authenticated;

COMMIT;