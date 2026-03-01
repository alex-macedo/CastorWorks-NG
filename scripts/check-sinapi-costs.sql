-- Check what the actual cost values are for skipped items
-- This will help us understand if costs are 0 vs NULL

SELECT
  COUNT(*) as total_template_items,
  COUNT(CASE WHEN si.sinapi_material_cost IS NULL AND si.sinapi_labor_cost IS NULL THEN 1 END) as both_null,
  COUNT(CASE WHEN si.sinapi_material_cost = 0 AND si.sinapi_labor_cost = 0 THEN 1 END) as both_zero,
  COUNT(CASE WHEN (si.sinapi_material_cost > 0 OR si.sinapi_labor_cost > 0) THEN 1 END) as has_positive,
  COUNT(CASE WHEN si.sinapi_material_cost IS NULL OR si.sinapi_labor_cost IS NULL THEN 1 END) as has_null,
  COUNT(CASE WHEN si.sinapi_code IS NULL THEN 1 END) as no_sinapi_match
FROM public.sinapi_project_template_items t
LEFT JOIN public.sinapi_items si ON si.sinapi_code = t.sinapi_code
WHERE t.sinapi_code IS NOT NULL;