-- Create function to get the correct SINAPI item for a template entry
-- Migration: 20251225165000_create_get_sinapi_item_for_template.sql
-- Purpose: Handle cases where multiple SINAPI items share the same code

BEGIN;

-- Function to get the best matching SINAPI item for a template entry
-- Strategy: Prefer items with labor costs (more complete cost breakdown)
-- If multiple items have labor, use the one with highest total cost (conservative)
CREATE OR REPLACE FUNCTION public.get_sinapi_item_for_template(
  p_sinapi_code text,
  p_description text DEFAULT NULL
)
RETURNS SETOF public.sinapi_items
LANGUAGE sql
STABLE
AS $$
  WITH matching_items AS (
    SELECT
      s.*,
      CASE
        WHEN s.sinapi_labor_cost > 0 THEN 2  -- Prefer items with labor
        ELSE 1
      END as priority,
      (s.sinapi_material_cost + s.sinapi_labor_cost) as total_cost
    FROM public.sinapi_items s
    WHERE s.sinapi_code = p_sinapi_code
      AND (p_description IS NULL OR s.sinapi_description = p_description)
  ),
  ranked_items AS (
    SELECT
      *,
      ROW_NUMBER() OVER (
        ORDER BY
          priority DESC,           -- Items with labor first
          total_cost DESC,         -- Higher cost first (conservative)
          sinapi_item ASC          -- Tie-breaker: lower item number
      ) as rank
    FROM matching_items
  )
  SELECT
    id, sinapi_code, sinapi_item, sinapi_description, sinapi_unit,
    sinapi_quantity, sinapi_unit_price, sinapi_material_cost, sinapi_labor_cost,
    sinapi_total_cost, sinapi_type, base_year, base_state, search_vector,
    created_at, updated_at
  FROM ranked_items
  WHERE rank = 1;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION public.get_sinapi_item_for_template IS
'Returns the best matching SINAPI item for a template entry.
When multiple items share the same code:
1. Prefers items with labor costs (more complete cost breakdown)
2. Among those, selects the one with highest total cost (conservative estimate)
3. Falls back to lower item number as tie-breaker';

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_sinapi_item_for_template TO authenticated;

COMMIT;
