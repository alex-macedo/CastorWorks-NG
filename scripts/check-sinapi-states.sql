-- Check SINAPI data distribution by state
SELECT
  base_state,
  COUNT(*) as items_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
FROM public.sinapi_items
GROUP BY base_state
ORDER BY items_count DESC
LIMIT 10;