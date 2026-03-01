-- Update populate_budget_from_template to relax cost validation
-- Migration: 20251224190011_relax_cost_validation.sql
-- Purpose: Allow items with zero costs to be included in budgets
-- Change: Skip items only when BOTH material AND labor costs are NULL (not zero)

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
  sinapi_item_data RECORD;
  items_created INTEGER := 0;
  items_without_costs INTEGER := 0;
BEGIN
  -- Loop through template items
  FOR template_item IN
    SELECT * FROM public.sinapi_project_template_items
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

    -- Lookup SINAPI item from catalog
    -- Try to find matching SINAPI code, prefer latest year and SP state
    SELECT
      sinapi_description,
      sinapi_unit,
      sinapi_material_cost,
      sinapi_labor_cost
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
        sinapi_labor_cost
      INTO sinapi_item_data
      FROM public.sinapi_items
      WHERE sinapi_code = template_item.sinapi_code
      ORDER BY base_year DESC NULLS LAST, base_state
      LIMIT 1;
    END IF;

    -- Skip items where SINAPI costs cannot be found (to avoid zero-cost items messing up totals)
    IF sinapi_item_data IS NULL THEN
      RAISE WARNING 'SINAPI code % not found in catalog for item: % - SKIPPING',
        template_item.sinapi_code,
        template_item.item_number;
      items_without_costs := items_without_costs + 1;
      CONTINUE; -- Skip this item and move to next
    END IF;

    -- RELAXED VALIDATION: Skip items only when BOTH material AND labor costs are NULL
    -- Allow items with zero costs to be included (they will show as zero in budget)
    IF sinapi_item_data.sinapi_material_cost IS NULL
       AND sinapi_item_data.sinapi_labor_cost IS NULL THEN
      RAISE WARNING 'SINAPI code % has NULL costs for both material and labor - SKIPPING: %',
        template_item.sinapi_code,
        template_item.item_number;
      items_without_costs := items_without_costs + 1;
      CONTINUE; -- Skip this item and move to next
    END IF;

    -- Insert budget line item (allow zero costs, but not NULL costs)
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
      sinapi_item_data.sinapi_description,
      sinapi_item_data.sinapi_unit,
      COALESCE(sinapi_item_data.sinapi_material_cost, 0),
      COALESCE(sinapi_item_data.sinapi_labor_cost, 0),
      COALESCE(template_item.quantity, 0),
      template_item.display_order
    );

    items_created := items_created + 1;
  END LOOP;

  -- Log summary
  RAISE NOTICE 'Budget populated: % items created, % items without SINAPI costs',
    items_created,
    items_without_costs;
END;
$$;

-- Update the comment to reflect the relaxed validation
COMMENT ON FUNCTION public.populate_budget_from_template IS
  'Populates budget_line_items from sinapi_project_template_items. Creates/matches project phases and looks up SINAPI costs from sinapi_items catalog. RELAXED VALIDATION: Includes items with zero costs but skips only items with NULL costs.';

-- Update debug function to match new logic
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
  -- Loop through template items (same logic as updated populate_budget_from_template)
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

    -- Determine action and reason (updated logic)
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
    ELSIF sinapi_item_data.sinapi_material_cost IS NULL
          AND sinapi_item_data.sinapi_labor_cost IS NULL THEN
      -- Both costs are NULL (not just zero)
      RETURN QUERY SELECT
        template_item.item_number,
        template_item.sinapi_code,
        template_item.phase_name,
        'SKIPPED'::TEXT,
        'NULL costs for both material and labor'::TEXT,
        true::BOOLEAN,
        false::BOOLEAN,
        sinapi_item_data.sinapi_material_cost,
        sinapi_item_data.sinapi_labor_cost,
        sinapi_item_data.base_state,
        sinapi_item_data.base_year;
    ELSE
      -- Would be included (even with zero costs)
      RETURN QUERY SELECT
        template_item.item_number,
        template_item.sinapi_code,
        template_item.phase_name,
        'INCLUDED'::TEXT,
        'Valid costs found (may be zero)'::TEXT,
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

COMMIT;