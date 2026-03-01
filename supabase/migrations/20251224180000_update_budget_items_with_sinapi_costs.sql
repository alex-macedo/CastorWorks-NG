-- Update existing budget line items with SINAPI costs from catalog
-- Migration: 20251224180000_update_budget_items_with_sinapi_costs.sql
-- Purpose: Backfill unit_cost_material and unit_cost_labor for items that have zero costs

BEGIN;

-- Create function to update budget line items with SINAPI costs
CREATE OR REPLACE FUNCTION public.update_budget_items_with_sinapi_costs(p_budget_id UUID)
RETURNS TABLE (
  items_updated INTEGER,
  items_not_found INTEGER,
  items_already_has_costs INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  line_item RECORD;
  sinapi_data RECORD;
  updated_count INTEGER := 0;
  not_found_count INTEGER := 0;
  already_has_costs_count INTEGER := 0;
BEGIN
  -- Loop through all line items for this budget
  FOR line_item IN
    SELECT id, sinapi_code, unit_cost_material, unit_cost_labor
    FROM public.budget_line_items
    WHERE budget_id = p_budget_id
      AND sinapi_code IS NOT NULL
  LOOP
    -- Skip items that already have at least one non-zero cost
    IF (line_item.unit_cost_material > 0 OR line_item.unit_cost_labor > 0) THEN
      already_has_costs_count := already_has_costs_count + 1;
      CONTINUE;
    END IF;
    
    -- Lookup SINAPI costs from catalog
    -- Try exact match first, prefer latest year and SP state
    SELECT unit_cost_material, unit_cost_labor INTO sinapi_data
    FROM public.sinapi_catalog
    WHERE sinapi_code = line_item.sinapi_code
      AND base_state = 'SP'
    ORDER BY base_year DESC NULLS LAST
    LIMIT 1;
    
    -- If not found with SP, try any state
    IF sinapi_data IS NULL THEN
      SELECT unit_cost_material, unit_cost_labor INTO sinapi_data
      FROM public.sinapi_catalog
      WHERE sinapi_code = line_item.sinapi_code
      ORDER BY base_year DESC NULLS LAST, base_state
      LIMIT 1;
    END IF;
    
    -- If still not found, try matching with trimmed/cleaned codes
    -- Handle potential leading zeros or whitespace issues
    IF sinapi_data IS NULL THEN
      SELECT unit_cost_material, unit_cost_labor INTO sinapi_data
      FROM public.sinapi_catalog
      WHERE TRIM(sinapi_code) = TRIM(line_item.sinapi_code)
        AND base_state = 'SP'
      ORDER BY base_year DESC NULLS LAST
      LIMIT 1;
    END IF;
    
    -- Last attempt: try any state with trimmed codes
    IF sinapi_data IS NULL THEN
      SELECT unit_cost_material, unit_cost_labor INTO sinapi_data
      FROM public.sinapi_catalog
      WHERE TRIM(sinapi_code) = TRIM(line_item.sinapi_code)
      ORDER BY base_year DESC NULLS LAST, base_state
      LIMIT 1;
    END IF;
    
    -- Update the line item if we found SINAPI costs
    IF sinapi_data IS NOT NULL THEN
      UPDATE public.budget_line_items
      SET
        unit_cost_material = COALESCE(sinapi_data.unit_cost_material, 0),
        unit_cost_labor = COALESCE(sinapi_data.unit_cost_labor, 0),
        updated_at = NOW()
      WHERE id = line_item.id;
      
      updated_count := updated_count + 1;
    ELSE
      -- Log items that couldn't be found
      RAISE WARNING 'SINAPI code % not found in catalog for budget line item %', 
        line_item.sinapi_code,
        line_item.id;
      not_found_count := not_found_count + 1;
    END IF;
  END LOOP;
  
  -- Return summary
  RETURN QUERY SELECT updated_count, not_found_count, already_has_costs_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_budget_items_with_sinapi_costs(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.update_budget_items_with_sinapi_costs IS 
  'Updates existing budget line items with unit costs from SINAPI catalog. Useful for backfilling costs for items that were created before SINAPI lookup was working correctly.';

COMMIT;

