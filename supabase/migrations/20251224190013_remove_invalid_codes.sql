-- Remove template items with invalid SINAPI codes
-- Since 549 out of 573 codes don't exist in catalog

BEGIN;

-- Create backup before deletion
CREATE TABLE IF NOT EXISTS public.sinapi_project_template_items_invalid_v2 AS
SELECT 
  *,
  NOW() as backed_up_at,
  '20251224190013_remove_invalid_codes' as backup_reason
FROM public.sinapi_project_template_items
WHERE NOT EXISTS (
  SELECT 1 FROM public.sinapi_items si 
  WHERE si.sinapi_code = sinapi_project_template_items.sinapi_code LIMIT 1
);

-- Log what we're removing
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
  
  RAISE NOTICE 'Removing % invalid template items with non-existent SINAPI codes', invalid_count;
END $$;

-- Remove invalid template items
DELETE FROM public.sinapi_project_template_items
WHERE NOT EXISTS (
  SELECT 1 FROM public.sinapi_items si 
  WHERE si.sinapi_code = sinapi_project_template_items.sinapi_code LIMIT 1
);

-- Verify remaining items
DO $$
DECLARE
  remaining_count INTEGER;
  backup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count FROM public.sinapi_project_template_items;
  SELECT COUNT(*) INTO backup_count FROM public.sinapi_project_template_items_invalid_v2;
  
  RAISE NOTICE 'Cleanup complete: % items remaining, % items backed up', remaining_count, backup_count;
END $$;

COMMIT;