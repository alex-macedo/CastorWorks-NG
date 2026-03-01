-- Fix update function to properly join and update costs from sinapi_items
-- Migration: 20251224190018_fix_update_sinapi_costs_function.sql

BEGIN;

-- Improved function to update budget items with SINAPI costs
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
  sinapi_data RECORD;
BEGIN
  -- Loop through all budget line items for this budget
  FOR item_record IN
    SELECT
      bli.id,
      bli.sinapi_code,
      bli.unit_cost_material as current_material,
      bli.unit_cost_labor as current_labor
    FROM public.budget_line_items bli
    WHERE bli.budget_id = p_budget_id
      AND bli.sinapi_code IS NOT NULL
  LOOP
    -- Lookup SINAPI data - same logic as populate_budget_from_template
    -- Try SP first, then any state
    SELECT
      sinapi_material_cost,
      sinapi_labor_cost
    INTO sinapi_data
    FROM public.sinapi_items
    WHERE sinapi_code = item_record.sinapi_code
      AND base_state = 'SP'
    ORDER BY base_year DESC NULLS LAST
    LIMIT 1;

    -- If not found with SP, try any state
    IF sinapi_data IS NULL THEN
      SELECT
        sinapi_material_cost,
        sinapi_labor_cost
      INTO sinapi_data
      FROM public.sinapi_items
      WHERE sinapi_code = item_record.sinapi_code
      ORDER BY base_year DESC NULLS LAST, base_state
      LIMIT 1;
    END IF;

    -- If still no SINAPI data found, count as not found
    IF sinapi_data IS NULL THEN
      not_found_count := not_found_count + 1;
      CONTINUE;
    END IF;

    -- If item already has the same costs, count as already has costs
    IF (item_record.current_material = COALESCE(sinapi_data.sinapi_material_cost, 0))
       AND (item_record.current_labor = COALESCE(sinapi_data.sinapi_labor_cost, 0)) THEN
      already_has_count := already_has_count + 1;
      CONTINUE;
    END IF;

    -- Update the item with new costs from SINAPI
    UPDATE public.budget_line_items
    SET
      unit_cost_material = COALESCE(sinapi_data.sinapi_material_cost, 0),
      unit_cost_labor = COALESCE(sinapi_data.sinapi_labor_cost, 0),
      updated_at = NOW()
    WHERE id = item_record.id;

    update_count := update_count + 1;
  END LOOP;

  -- Return summary
  RETURN QUERY SELECT update_count, not_found_count, already_has_count;
END;
$$;

COMMIT;