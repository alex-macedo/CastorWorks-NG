-- Comprehensive debug: Check SINAPI costs and budget creation
-- 1. Check if template items have costs in catalog
SELECT 'Template with costs' as check_type, COUNT(*) as count
FROM public.sinapi_project_template_items t
JOIN public.sinapi_items si ON si.sinapi_code = t.sinapi_code
WHERE si.sinapi_material_cost > 0 OR si.sinapi_labor_cost > 0

UNION ALL

SELECT 'Template with zero costs', COUNT(*)
FROM public.sinapi_project_template_items t
JOIN public.sinapi_items si ON si.sinapi_code = t.sinapi_code
WHERE (si.sinapi_material_cost IS NULL OR si.sinapi_material_cost = 0)
  AND (si.sinapi_labor_cost IS NULL OR si.sinapi_labor_cost = 0)

UNION ALL

-- 2. Check current budget items
SELECT 'Budget items created', COUNT(*)
FROM public.budget_line_items
WHERE budget_id = 'b1a229a5-8ed8-41a1-82f2-134369e9a613'

UNION ALL

SELECT 'Budget items with costs', COUNT(*)
FROM public.budget_line_items
WHERE budget_id = 'b1a229a5-8ed8-41a1-82f2-134369e9a613'
  AND (unit_cost_material > 0 OR unit_cost_labor > 0);

-- 3. Sample of actual costs in catalog vs budget
SELECT
  'CATALOG' as source,
  si.sinapi_code,
  si.sinapi_material_cost,
  si.sinapi_labor_cost,
  si.base_state,
  si.base_year
FROM public.sinapi_items si
WHERE si.sinapi_code IN (
  SELECT DISTINCT sinapi_code
  FROM public.sinapi_project_template_items
  WHERE sinapi_code IS NOT NULL
)
AND (si.sinapi_material_cost > 0 OR si.sinapi_labor_cost > 0)
LIMIT 5

UNION ALL

SELECT
  'BUDGET' as source,
  bli.sinapi_code,
  bli.unit_cost_material,
  bli.unit_cost_labor,
  NULL as base_state,
  NULL as base_year
FROM public.budget_line_items bli
WHERE bli.budget_id = 'b1a229a5-8ed8-41a1-82f2-134369e9a613'
LIMIT 5;