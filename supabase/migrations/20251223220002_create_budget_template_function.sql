-- Create function to populate budget from SINAPI template
-- Migration: 20251223220002_create_budget_template_function.sql
-- Purpose: Automatically populate budget_line_items from sinapi_line_items_template

BEGIN;

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
  -- Loop through template items (skip phase headers)
  FOR template_item IN 
    SELECT * FROM public.sinapi_line_items_template
    WHERE sinapi_code IS NOT NULL
    ORDER BY phase_order, display_order
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
    
    -- Lookup SINAPI costs from catalog
    -- Try to find matching SINAPI code, prefer latest year and SP state
    SELECT unit_cost_material, unit_cost_labor INTO sinapi_data
    FROM public.sinapi_catalog
    WHERE sinapi_code = template_item.sinapi_code
      AND base_state = 'SP'
    ORDER BY base_year DESC NULLS LAST
    LIMIT 1;
    
    -- If not found with SP, try any state
    IF sinapi_data IS NULL THEN
      SELECT unit_cost_material, unit_cost_labor INTO sinapi_data
      FROM public.sinapi_catalog
      WHERE sinapi_code = template_item.sinapi_code
      ORDER BY base_year DESC NULLS LAST, base_state
      LIMIT 1;
    END IF;
    
    -- Skip items where SINAPI costs cannot be found (to avoid zero-cost items messing up totals)
    IF sinapi_data IS NULL THEN
      RAISE WARNING 'SINAPI code % not found in catalog for item: % - SKIPPING', 
        template_item.sinapi_code, 
        template_item.description;
      items_without_costs := items_without_costs + 1;
      CONTINUE; -- Skip this item and move to next
    END IF;
    
    -- Only insert if we have valid SINAPI costs
    -- Skip items where both material and labor costs are zero (invalid data)
    IF (sinapi_data.unit_cost_material IS NULL OR sinapi_data.unit_cost_material = 0) 
       AND (sinapi_data.unit_cost_labor IS NULL OR sinapi_data.unit_cost_labor = 0) THEN
      RAISE WARNING 'SINAPI code % has zero costs for both material and labor - SKIPPING: %', 
        template_item.sinapi_code, 
        template_item.description;
      items_without_costs := items_without_costs + 1;
      CONTINUE; -- Skip this item and move to next
    END IF;
    
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
        template_item.description,
        COALESCE(template_item.unit, 'UN'),
        COALESCE(sinapi_data.unit_cost_material, 0),
        COALESCE(sinapi_data.unit_cost_labor, 0),
        COALESCE(template_item.quantity, 0),
        template_item.display_order
      );

      items_created := items_created + 1;
    ELSE
      -- Item already exists, skip it
      RAISE NOTICE 'SINAPI code % already exists in budget % - SKIPPING', template_item.sinapi_code, p_budget_id;
    END IF;
  END LOOP;
  
  -- Log summary
  RAISE NOTICE 'Budget populated: % items created, % items without SINAPI costs', 
    items_created, 
    items_without_costs;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.populate_budget_from_template(UUID, UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.populate_budget_from_template IS 
  'Populates budget_line_items from sinapi_line_items_template. Creates/matches project phases and looks up SINAPI costs from catalog.';

COMMIT;

