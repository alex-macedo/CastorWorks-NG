-- Add debug function for budget population analysis
-- Migration: 20251224190010_add_budget_debug_function.sql
-- Purpose: Add debug function to analyze why budget items are being skipped

BEGIN;

-- Debug function to analyze budget creation issues
CREATE OR REPLACE FUNCTION public.debug_budget_population(
  p_budget_id UUID,
  p_project_id UUID
)
RETURNS TABLE (
  item_number TEXT,
  sinapi_code TEXT,
  phase_name TEXT,
  action TEXT,
  reason TEXT,
  sinapi_found BOOLEAN,
  has_costs BOOLEAN,
  material_cost NUMERIC,
  labor_cost NUMERIC,
  state TEXT,
  year INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  template_item RECORD;
  phase_id_val UUID;
  sinapi_item_data RECORD;
BEGIN
  -- Loop through template items (same logic as populate_budget_from_template)
  FOR template_item IN
    SELECT * FROM public.sinapi_project_template_items
    WHERE sinapi_code IS NOT NULL
    ORDER BY phase_order, display_order
  LOOP
    -- Lookup SINAPI item from catalog (same logic as populate_budget_from_template)
    SELECT
      sinapi_description,
      sinapi_unit,
      sinapi_material_cost,
      sinapi_labor_cost,
      base_state,
      base_year
    INTO sinapi_item_data
    FROM public.sinapi_items
    WHERE sinapi_code = template_item.sinapi_code
      AND base_state = 'SP'
    ORDER BY base_year DESC NULLS LAST
    LIMIT 1;

    -- If not found with SP, try any state
    IF sinapi_item_data IS NULL THEN
      SELECT
        sinapi_description,
        sinapi_unit,
        sinapi_material_cost,
        sinapi_labor_cost,
        base_state,
        base_year
      INTO sinapi_item_data
      FROM public.sinapi_items
      WHERE sinapi_code = template_item.sinapi_code
      ORDER BY base_year DESC NULLS LAST, base_state
      LIMIT 1;
    END IF;

    -- Determine action and reason
    IF sinapi_item_data IS NULL THEN
      -- SINAPI code not found
      RETURN QUERY SELECT
        template_item.item_number,
        template_item.sinapi_code,
        template_item.phase_name,
        'SKIPPED'::TEXT,
        'SINAPI code not found in catalog'::TEXT,
        false::BOOLEAN,
        false::BOOLEAN,
        NULL::NUMERIC,
        NULL::NUMERIC,
        NULL::TEXT,
        NULL::INTEGER;
    ELSIF (sinapi_item_data.sinapi_material_cost IS NULL OR sinapi_item_data.sinapi_material_cost = 0)
          AND (sinapi_item_data.sinapi_labor_cost IS NULL OR sinapi_item_data.sinapi_labor_cost = 0) THEN
      -- Both costs are zero
      RETURN QUERY SELECT
        template_item.item_number,
        template_item.sinapi_code,
        template_item.phase_name,
        'SKIPPED'::TEXT,
        'Zero costs for both material and labor'::TEXT,
        true::BOOLEAN,
        false::BOOLEAN,
        sinapi_item_data.sinapi_material_cost,
        sinapi_item_data.sinapi_labor_cost,
        sinapi_item_data.base_state,
        sinapi_item_data.base_year;
    ELSE
      -- Would be included
      RETURN QUERY SELECT
        template_item.item_number,
        template_item.sinapi_code,
        template_item.phase_name,
        'INCLUDED'::TEXT,
        'Valid costs found'::TEXT,
        true::BOOLEAN,
        true::BOOLEAN,
        sinapi_item_data.sinapi_material_cost,
        sinapi_item_data.sinapi_labor_cost,
        sinapi_item_data.base_state,
        sinapi_item_data.base_year;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.debug_budget_population(UUID, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.debug_budget_population IS
  'Debug function that analyzes what would happen during budget creation. Returns detailed info about each template item and why it would be included or skipped.';

COMMIT;