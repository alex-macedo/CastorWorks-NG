-- Migration: 20251224190101_fix_populate_left_join_duplicates.sql
-- Purpose: Fix the LEFT JOIN that creates duplicate rows when multiple sinapi_items share the same code
-- Issue: UNIQUE(sinapi_code, sinapi_item) allows multiple rows per sinapi_code
--        LEFT JOIN without LIMIT returns all matching rows, causing duplicates in budget_line_items

BEGIN;

-- Drop existing function first (return type is changing from void to TABLE)
DROP FUNCTION IF EXISTS public.populate_budget_from_template(UUID, UUID);

-- Recreate the function with fixed LEFT JOIN logic and new return type
CREATE FUNCTION public.populate_budget_from_template(
  p_budget_id UUID,
  p_project_id UUID
)
RETURNS TABLE(items_created INTEGER, items_skipped INTEGER, items_with_default_costs INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  template_item RECORD;
  phase_id_val UUID;
  sinapi_data RECORD;
  existing_item_id UUID;
  v_items_created INTEGER := 0;
  v_items_skipped INTEGER := 0;
  v_items_with_default_costs INTEGER := 0;
  v_sinapi_description TEXT;
  v_sinapi_unit TEXT;
BEGIN
  -- Loop through template items - use DISTINCT ON to prevent duplicate sinapi_items from creating multiple iterations
  -- NULLS LAST ensures we select a matched row, not the NULL row from LEFT JOIN
  FOR template_item IN
    SELECT DISTINCT ON (t.id)
      t.*,
      s.sinapi_description,
      s.sinapi_unit
    FROM public.sinapi_project_template_items t
    LEFT JOIN public.sinapi_items s ON s.sinapi_code = t.sinapi_code
    WHERE t.sinapi_code IS NOT NULL
    ORDER BY t.id, s.base_state DESC NULLS LAST, s.base_year DESC NULLS LAST  -- Prefer SP state, latest year, matched rows over NULL
  LOOP
    -- Get or create phase (only look for budget-type phases)
    SELECT id INTO phase_id_val
    FROM public.project_phases
    WHERE project_id = p_project_id
      AND phase_name = template_item.phase_name
      AND type = 'budget' -- Only match budget phases
    LIMIT 1;

    -- Create phase if it doesn't exist (as budget type, no dates)
    IF phase_id_val IS NULL THEN
      INSERT INTO public.project_phases (
        project_id,
        phase_name,
        display_order,
        status,
        progress_percentage,
        type
      ) VALUES (
        p_project_id,
        template_item.phase_name,
        template_item.phase_order,
        'pending',
        0,
        'budget' -- Budget phases don't have dates
      ) RETURNING id INTO phase_id_val;
    END IF;

    -- Get SINAPI costs - prefer SP state, latest year
    SELECT sinapi_material_cost, sinapi_labor_cost INTO sinapi_data
    FROM public.sinapi_items
    WHERE sinapi_code = template_item.sinapi_code
      AND base_state = 'SP'
    ORDER BY base_year DESC NULLS LAST
    LIMIT 1;

    -- If not found with SP, try any state with latest year
    IF sinapi_data IS NULL THEN
      SELECT sinapi_material_cost, sinapi_labor_cost INTO sinapi_data
      FROM public.sinapi_items
      WHERE sinapi_code = template_item.sinapi_code
      ORDER BY base_year DESC NULLS LAST, base_state
      LIMIT 1;
    END IF;

    -- If no cost data found, use default costs and log it
    IF sinapi_data IS NULL THEN
      sinapi_data.sinapi_material_cost := 100.00;  -- Default material cost
      sinapi_data.sinapi_labor_cost := 50.00;      -- Default labor cost
      v_items_with_default_costs := v_items_with_default_costs + 1;
      RAISE NOTICE '[populate_budget] SINAPI code % not found - using defaults (material=%, labor=%)',
        template_item.sinapi_code, sinapi_data.sinapi_material_cost, sinapi_data.sinapi_labor_cost;
    END IF;

    -- Ensure costs are not null
    sinapi_data.sinapi_material_cost := COALESCE(sinapi_data.sinapi_material_cost, 100.00);
    sinapi_data.sinapi_labor_cost := COALESCE(sinapi_data.sinapi_labor_cost, 50.00);

    -- Check if item already exists in this budget
    SELECT id INTO existing_item_id
    FROM public.budget_line_items
    WHERE budget_id = p_budget_id
      AND sinapi_code = template_item.sinapi_code;

    -- Only insert if item doesn't already exist in this budget
    IF existing_item_id IS NULL THEN
      -- Get description and unit from template item (from LEFT JOIN)
      v_sinapi_description := COALESCE(template_item.sinapi_description, 'Unknown Item');
      v_sinapi_unit := COALESCE(template_item.sinapi_unit, 'UN');

      INSERT INTO public.budget_line_items (
        budget_id,
        phase_id,
        sinapi_code,
        item_number,
        description,
        unit,
        unit_cost_material,
        unit_cost_labor,
        quantity,
        sort_order
      ) VALUES (
        p_budget_id,
        phase_id_val,
        template_item.sinapi_code,
        template_item.item_number,
        v_sinapi_description,
        v_sinapi_unit,
        sinapi_data.sinapi_material_cost,
        sinapi_data.sinapi_labor_cost,
        COALESCE(template_item.quantity, 0),
        template_item.display_order
      );

      v_items_created := v_items_created + 1;
    ELSE
      v_items_skipped := v_items_skipped + 1;
      RAISE NOTICE '[populate_budget] SINAPI code % already exists in budget % - SKIPPING',
        template_item.sinapi_code, p_budget_id;
    END IF;
  END LOOP;

  -- Log final results
  RAISE NOTICE '[populate_budget] COMPLETED: budget=%, created=%, skipped=%, default_costs=%',
    p_budget_id, v_items_created, v_items_skipped, v_items_with_default_costs;

  -- Return results
  RETURN QUERY SELECT v_items_created, v_items_skipped, v_items_with_default_costs;
END;
$$;

COMMENT ON FUNCTION public.populate_budget_from_template(UUID, UUID) IS
'Populates budget_line_items from sinapi_project_template_items template. Joins with sinapi_items to lookup costs.
Uses DISTINCT ON to prevent duplicate sinapi_items rows from creating duplicate budget entries.
Creates/matches project phases as budget type. Skips items that already exist in budget to avoid duplicates.
Returns (items_created, items_skipped, items_with_default_costs).';

COMMIT;
