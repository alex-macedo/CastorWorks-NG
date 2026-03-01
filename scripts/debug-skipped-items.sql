-- Debug why so many items are being skipped
-- Check the first 10 skipped items to understand the pattern

SELECT item_number, sinapi_code, phase_name, reason, material_cost, labor_cost, state, year
FROM public.debug_budget_population(
  'b1a229a5-8ed8-41a1-82f2-134369e9a613'::UUID,
  'c3560338-fd67-4f27-a5a2-22b26a08ca0b'::UUID
)
WHERE action = 'SKIPPED'
ORDER BY phase_name, item_number
LIMIT 10;