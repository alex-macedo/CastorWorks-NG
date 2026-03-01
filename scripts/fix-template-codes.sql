-- Script to fix template items with invalid SINAPI codes
-- Run diagnostics first: scripts/diagnose-template-codes.sql
-- 
-- Options:
-- 1. Delete invalid template items (if they're not needed)
-- 2. Update codes manually (if you know the correct codes)
-- 3. Comment out invalid items (preserve for reference)

-- OPTION 1: Delete invalid template items
-- WARNING: This permanently removes items with invalid codes
-- Uncomment to use:

/*
BEGIN;

DELETE FROM public.sinapi_project_template_items
WHERE NOT EXISTS (
  SELECT 1 FROM public.sinapi_items si 
  WHERE si.sinapi_code = sinapi_project_template_items.sinapi_code LIMIT 1
);

-- Verify deletion
SELECT COUNT(*) as remaining_items FROM public.sinapi_project_template_items;

COMMIT;
*/

-- OPTION 2: Create a backup table before deletion
-- Uncomment to use:

/*
BEGIN;

-- Create backup
CREATE TABLE IF NOT EXISTS public.sinapi_project_template_items_invalid_backup AS
SELECT * FROM public.sinapi_project_template_items
WHERE NOT EXISTS (
  SELECT 1 FROM public.sinapi_items si 
  WHERE si.sinapi_code = sinapi_project_template_items.sinapi_code LIMIT 1
);

-- Delete invalid items
DELETE FROM public.sinapi_project_template_items
WHERE NOT EXISTS (
  SELECT 1 FROM public.sinapi_items si 
  WHERE si.sinapi_code = sinapi_project_template_items.sinapi_code LIMIT 1
);

COMMIT;
*/

-- OPTION 3: Mark invalid items (add a flag column)
-- Uncomment to use:

/*
BEGIN;

-- Add flag column if it doesn't exist
ALTER TABLE public.sinapi_project_template_items
ADD COLUMN IF NOT EXISTS is_valid BOOLEAN DEFAULT true;

-- Update flag based on code existence
UPDATE public.sinapi_project_template_items
SET is_valid = EXISTS (
  SELECT 1 FROM public.sinapi_items si 
  WHERE si.sinapi_code = sinapi_project_template_items.sinapi_code LIMIT 1
);

-- Filter out invalid items in queries (instead of deleting)
-- Use: WHERE is_valid = true

COMMIT;
*/

-- OPTION 4: Manual code updates (example)
-- Update specific codes if you know the correct values
-- Uncomment and modify as needed:

/*
BEGIN;

-- Example: Update code 'OLD_CODE' to 'NEW_CODE'
-- UPDATE public.sinapi_project_template_items
-- SET sinapi_code = 'NEW_CODE'
-- WHERE sinapi_code = 'OLD_CODE'
--   AND EXISTS (SELECT 1 FROM public.sinapi_items WHERE sinapi_code = 'NEW_CODE');

COMMIT;
*/

-- OPTION 5: Validate constraint on existing data
-- After fixing invalid codes, validate the constraint:
-- ALTER TABLE public.sinapi_project_template_items VALIDATE CONSTRAINT check_sinapi_code_exists;

