-- Migration: 20251224190100_fix_populate_budget_duplicates.sql
-- Purpose: Fix populate_budget_from_template function to avoid duplicating existing items

BEGIN;

-- Drop and recreate the function with duplicate checking
CREATE OR REPLACE FUNCTION public.populate_budget_from_template(
  p_budget_id UUID,
  p_project_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  template_item RECORD;
  phase_id_val UUID;
  sinapi_data RECORD;
  existing_item_id UUID;
  items_created INTEGER := 0;
  items_without_costs INTEGER := 0;
BEGIN
  -- Loop through template items with SINAPI details
  FOR template_item IN
    SELECT
      t.*,
      s.sinapi_description,
      s.sinapi_unit
    FROM public.sinapi_project_template_items t
    LEFT JOIN public.sinapi_items s ON s.sinapi_code = t.sinapi_code
    WHERE t.sinapi_code IS NOT NULL
    ORDER BY t.phase_order, t.display_order
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

    -- SINAPI costs are already available from the joined sinapi_items table
    -- Use the costs from the joined data (prefer SP state, latest year)
    SELECT sinapi_material_cost, sinapi_labor_cost INTO sinapi_data
    FROM public.sinapi_items
    WHERE sinapi_code = template_item.sinapi_code
      AND base_state = 'SP'
    ORDER BY base_year DESC NULLS LAST
    LIMIT 1;

    -- If not found with SP, try any state
    IF sinapi_data IS NULL THEN
      SELECT sinapi_material_cost, sinapi_labor_cost INTO sinapi_data
      FROM public.sinapi_items
      WHERE sinapi_code = template_item.sinapi_code
      ORDER BY base_year DESC NULLS LAST, base_state
      LIMIT 1;
    END IF;

    -- If no cost data found, use default costs (don't skip the item)
    IF sinapi_data IS NULL THEN
      sinapi_data.sinapi_material_cost := 100.00;  -- Default material cost
      sinapi_data.sinapi_labor_cost := 50.00;      -- Default labor cost
      RAISE NOTICE 'SINAPI code % not found in sinapi_items - using default costs: material=%, labor=%',
        template_item.sinapi_code, sinapi_data.sinapi_material_cost, sinapi_data.sinapi_labor_cost;
    END IF;

    -- Ensure costs are not null (use defaults if needed)
    sinapi_data.sinapi_material_cost := COALESCE(sinapi_data.sinapi_material_cost, 100.00);
    sinapi_data.sinapi_labor_cost := COALESCE(sinapi_data.sinapi_labor_cost, 50.00);

    -- Check if item already exists in this budget
    SELECT id INTO existing_item_id
    FROM public.budget_line_items
    WHERE budget_id = p_budget_id
      AND sinapi_code = template_item.sinapi_code;

    -- Only insert if item doesn't already exist in this budget
    IF existing_item_id IS NULL THEN
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
        COALESCE(template_item.sinapi_description, 'Unknown Item'),
        COALESCE(template_item.sinapi_unit, 'UN'),
        COALESCE(sinapi_data.sinapi_material_cost, 0),
        COALESCE(sinapi_data.sinapi_labor_cost, 0),
        COALESCE(template_item.quantity, 0),
        template_item.display_order
      );

      items_created := items_created + 1;
    ELSE
      -- Item already exists, skip it
      RAISE NOTICE 'SINAPI code % already exists in budget % - SKIPPING', template_item.sinapi_code, p_budget_id;
    END IF;
  END LOOP;

  -- Log results
  RAISE NOTICE 'Budget population completed for budget %. Items created: %, Items using default costs: %',
    p_budget_id, items_created, items_without_costs;
END;
$$;

COMMENT ON FUNCTION public.populate_budget_from_template(UUID, UUID) IS
'Populates budget_line_items from sinapi_line_items_template. Creates/matches project phases and looks up SINAPI costs from catalog. SKIPS items that already exist in the budget to avoid duplicates.';

COMMIT;