-- Check what costs are actually in the SINAPI catalog for template items
SELECT
  t.item_number,
  t.sinapi_code,
  t.phase_name,
  si.sinapi_material_cost,
  si.sinapi_labor_cost,
  si.base_state,
  si.base_year
FROM public.sinapi_project_template_items t
JOIN public.sinapi_items si ON si.sinapi_code = t.sinapi_code
WHERE t.sinapi_code IS NOT NULL
ORDER BY t.phase_order, t.display_order
LIMIT 20;