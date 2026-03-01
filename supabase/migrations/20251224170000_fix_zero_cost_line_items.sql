-- Fix zero-cost line items from SINAPI template
-- Migration: 20251224170000_fix_zero_cost_line_items.sql
-- Purpose: Identify and optionally clean up line items with zero costs that shouldn't be included in budget totals

BEGIN;

-- Create a function to identify zero-cost items
CREATE OR REPLACE FUNCTION public.identify_zero_cost_items(p_budget_id UUID)
RETURNS TABLE (
  id UUID,
  sinapi_code TEXT,
  description TEXT,
  unit_cost_material NUMERIC,
  unit_cost_labor NUMERIC,
  quantity NUMERIC,
  total_material NUMERIC,
  total_labor NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bli.id,
    bli.sinapi_code,
    bli.description,
    bli.unit_cost_material,
    bli.unit_cost_labor,
    bli.quantity,
    bli.total_material,
    bli.total_labor
  FROM public.budget_line_items bli
  WHERE bli.budget_id = p_budget_id
    AND (
      -- Items where both material and labor costs are zero
      (bli.unit_cost_material = 0 AND bli.unit_cost_labor = 0)
      OR
      -- Items where total cost is zero (quantity * cost = 0)
      (bli.total_material = 0 AND bli.total_labor = 0)
      OR
      -- Items where unit costs are NULL
      (bli.unit_cost_material IS NULL AND bli.unit_cost_labor IS NULL)
    )
  ORDER BY bli.sinapi_code, bli.description;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.identify_zero_cost_items(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.identify_zero_cost_items IS 
  'Identifies line items with zero costs that may be causing issues with budget totals. Returns items where both material and labor costs are zero or NULL.';

-- Optional: Create a function to delete zero-cost items (commented out by default for safety)
-- Uncomment and use with caution - this will permanently delete items
/*
CREATE OR REPLACE FUNCTION public.cleanup_zero_cost_items(p_budget_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.budget_line_items
  WHERE budget_id = p_budget_id
    AND (
      (unit_cost_material = 0 AND unit_cost_labor = 0)
      OR
      (total_material = 0 AND total_labor = 0)
      OR
      (unit_cost_material IS NULL AND unit_cost_labor IS NULL)
    );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_zero_cost_items(UUID) TO authenticated;
*/

COMMIT;

