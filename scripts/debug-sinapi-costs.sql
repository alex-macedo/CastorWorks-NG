-- Debug: Check what costs are actually stored in sinapi_items
SELECT
  sinapi_code,
  sinapi_material_cost,
  sinapi_labor_cost,
  base_state,
  base_year
FROM public.sinapi_items
WHERE sinapi_code IN (
  SELECT DISTINCT sinapi_code
  FROM public.sinapi_project_template_items
  WHERE sinapi_code IS NOT NULL
  LIMIT 10
)
ORDER BY sinapi_code;