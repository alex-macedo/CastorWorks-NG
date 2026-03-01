-- Create function to update budget items with current SINAPI costs
-- Migration: 20251224190017_add_update_sinapi_costs_function.sql

BEGIN;

-- Function to update budget line items with current SINAPI costs
CREATE OR REPLACE FUNCTION public.update_budget_items_with_sinapi_costs(
  p_budget_id UUID
)
RETURNS TABLE (
  items_updated INTEGER,
  items_not_found INTEGER,
  items_already_has_costs INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  update_count INTEGER := 0;
  not_found_count INTEGER := 0;
  already_has_count INTEGER := 0;
  item_record RECORD;
BEGIN
  -- Loop through all budget line items for this budget
  FOR item_record IN
    SELECT
      bli.id,
      bli.sinapi_code,
      bli.unit_cost_material,
      bli.unit_cost_labor,
      si.sinapi_material_cost,
      si.sinapi_labor_cost
    FROM public.budget_line_items bli
    LEFT JOIN public.sinapi_items si ON si.sinapi_code = bli.sinapi_code
      AND si.base_state = 'SP'  -- Prefer SP state
    WHERE bli.budget_id = p_budget_id
      AND bli.sinapi_code IS NOT NULL
  LOOP
    -- If no SINAPI data found, count as not found
    IF item_record.sinapi_material_cost IS NULL AND item_record.sinapi_labor_cost IS NULL THEN
      not_found_count := not_found_count + 1;
      CONTINUE;
    END IF;

    -- If item already has the same costs, count as already has costs
    IF (item_record.unit_cost_material = COALESCE(item_record.sinapi_material_cost, 0))
       AND (item_record.unit_cost_labor = COALESCE(item_record.sinapi_labor_cost, 0)) THEN
      already_has_count := already_has_count + 1;
      CONTINUE;
    END IF;

    -- Update the item with new costs
    UPDATE public.budget_line_items
    SET
      unit_cost_material = COALESCE(item_record.sinapi_material_cost, 0),
      unit_cost_labor = COALESCE(item_record.sinapi_labor_cost, 0),
      updated_at = NOW()
    WHERE id = item_record.id;

    update_count := update_count + 1;
  END LOOP;

  -- Return summary
  RETURN QUERY SELECT update_count, not_found_count, already_has_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_budget_items_with_sinapi_costs(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.update_budget_items_with_sinapi_costs IS
  'Updates budget_line_items with current SINAPI costs by joining with sinapi_items table. Returns counts of updated, not found, and already up-to-date items.';

COMMIT;