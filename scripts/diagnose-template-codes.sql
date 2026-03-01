-- Diagnostic script to identify template items with invalid SINAPI codes
-- Run this to see which template items reference codes that don't exist in sinapi_items

-- Find template items with invalid codes
SELECT 
  t.id,
  t.item_number,
  t.sinapi_code,
  t.phase_name,
  t.phase_order,
  t.display_order,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.sinapi_items si 
      WHERE si.sinapi_code = t.sinapi_code LIMIT 1
    ) THEN 'VALID'
    ELSE 'INVALID - NOT FOUND'
  END as status
FROM public.sinapi_project_template_items t
ORDER BY 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.sinapi_items si 
      WHERE si.sinapi_code = t.sinapi_code LIMIT 1
    ) THEN 1
    ELSE 0
  END,
  t.phase_order,
  t.display_order;

-- Summary: Count valid vs invalid
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.sinapi_items si 
      WHERE si.sinapi_code = t.sinapi_code LIMIT 1
    ) THEN 'VALID'
    ELSE 'INVALID'
  END as status,
  COUNT(*) as count
FROM public.sinapi_project_template_items t
GROUP BY 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.sinapi_items si 
      WHERE si.sinapi_code = t.sinapi_code LIMIT 1
    ) THEN 'VALID'
    ELSE 'INVALID'
  END;

-- List all invalid codes (for investigation)
SELECT DISTINCT
  t.sinapi_code,
  COUNT(*) as template_items_count,
  STRING_AGG(DISTINCT t.phase_name, ', ' ORDER BY t.phase_name) as phases
FROM public.sinapi_project_template_items t
WHERE NOT EXISTS (
  SELECT 1 FROM public.sinapi_items si 
  WHERE si.sinapi_code = t.sinapi_code LIMIT 1
)
GROUP BY t.sinapi_code
ORDER BY t.sinapi_code;

-- Check if codes exist with different formatting (leading zeros, whitespace, etc.)
-- This helps identify potential data quality issues
SELECT 
  t.sinapi_code as template_code,
  si.sinapi_code as catalog_code,
  si.sinapi_item,
  si.sinapi_description
FROM public.sinapi_project_template_items t
LEFT JOIN public.sinapi_items si ON (
  TRIM(si.sinapi_code) = TRIM(t.sinapi_code) OR
  LTRIM(si.sinapi_code, '0') = LTRIM(t.sinapi_code, '0')
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.sinapi_items si2 
  WHERE si2.sinapi_code = t.sinapi_code LIMIT 1
)
LIMIT 20;

