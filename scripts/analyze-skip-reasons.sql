-- Comprehensive analysis of why items are being skipped

-- 1. Template items summary
SELECT 'Template Items' as category, COUNT(*) as count
FROM public.sinapi_project_template_items
WHERE sinapi_code IS NOT NULL

UNION ALL

-- 2. Items with SINAPI matches
SELECT 'With SINAPI Match' as category, COUNT(*) as count
FROM public.sinapi_project_template_items t
WHERE t.sinapi_code IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.sinapi_items si WHERE si.sinapi_code = t.sinapi_code)

UNION ALL

-- 3. Items without SINAPI matches
SELECT 'Without SINAPI Match' as category, COUNT(*) as count
FROM public.sinapi_project_template_items t
WHERE t.sinapi_code IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.sinapi_items si WHERE si.sinapi_code = t.sinapi_code)

UNION ALL

-- 4. Items with valid costs (not both NULL)
SELECT 'With Valid Costs' as category, COUNT(*) as count
FROM public.sinapi_project_template_items t
JOIN public.sinapi_items si ON si.sinapi_code = t.sinapi_code
WHERE NOT (si.sinapi_material_cost IS NULL AND si.sinapi_labor_cost IS NULL)

UNION ALL

-- 5. Items with NULL costs for both
SELECT 'With NULL Costs' as category, COUNT(*) as count
FROM public.sinapi_project_template_items t
JOIN public.sinapi_items si ON si.sinapi_code = t.sinapi_code
WHERE si.sinapi_material_cost IS NULL AND si.sinapi_labor_cost IS NULL;