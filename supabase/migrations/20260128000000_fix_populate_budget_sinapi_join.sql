-- Migration: 20260128000000_fix_populate_budget_sinapi_join.sql
-- Purpose: Fix populate_budget_from_template to work with missing sinapi_item in template
-- Issue: Template data only has sinapi_code, not sinapi_item. Modified to match codes with exactly 1 item.

BEGIN;

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
  existing_item_id UUID;
  v_items_created INTEGER := 0;
  v_items_skipped INTEGER := 0;
  v_items_with_default_costs INTEGER := 0;
BEGIN
  -- Loop through template items - join with sinapi_items using sinapi_code only
  -- Since template data is missing sinapi_item, we'll match on sinapi_code where there's exactly 1 item
  FOR template_item IN
    SELECT
      t.id,
      t.item_number,
      t.sinapi_code,
      t.quantity,
      t.phase_name,
      t.phase_order,
      t.display_order,
      s.sinapi_description,
      s.sinapi_unit,
      s.sinapi_material_cost,
      s.sinapi_labor_cost,
      s.sinapi_item  -- Include sinapi_item from catalog
    FROM public.sinapi_project_template_items t
    LEFT JOIN public.sinapi_items s ON (
      s.sinapi_code = t.sinapi_code
    )
    -- Only include rows where sinapi_code exists in catalog and has exactly 1 item
    INNER JOIN (
      SELECT sinapi_code
      FROM public.sinapi_items
      GROUP BY sinapi_code
      HAVING COUNT(*) = 1
    ) unique_codes ON unique_codes.sinapi_code = t.sinapi_code
    WHERE t.sinapi_code IS NOT NULL
    ORDER BY t.phase_order, t.display_order, t.item_number
  LOOP
    -- Get or create phase (only look for budget-type phases)
    SELECT id INTO phase_id_val
    FROM public.project_phases
    WHERE project_id = p_project_id
      AND phase_name = template_item.phase_name
      AND type = 'budget' -- Only match budget phases
    LIMIT 1;

    -- Create phase if it doesn't exist (as budget type, no dates)
    -- Use sort_order instead of display_order (display_order doesn't exist in project_phases)
    IF phase_id_val IS NULL THEN
      INSERT INTO public.project_phases (
        project_id,
        phase_name,
        sort_order,
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

    -- Check if item already exists in this budget
    SELECT id INTO existing_item_id
    FROM public.budget_line_items
    WHERE budget_id = p_budget_id
      AND sinapi_code = template_item.sinapi_code
      AND sinapi_item = template_item.sinapi_item;  -- Now using sinapi_item from catalog

    -- Only insert if item doesn't already exist in this budget
    IF existing_item_id IS NULL THEN
      -- Use description and unit from sinapi_items join
      IF template_item.sinapi_description IS NOT NULL THEN
        -- Insert with full SINAPI data from sinapi_items
        INSERT INTO public.budget_line_items (
          budget_id,
          phase_id,
          sinapi_code,
          sinapi_item,
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
          template_item.sinapi_item,  -- Now from catalog
          template_item.item_number,
          template_item.sinapi_description,
          template_item.sinapi_unit,
          COALESCE(template_item.sinapi_material_cost, 100.00),
          COALESCE(template_item.sinapi_labor_cost, 50.00),
          COALESCE(template_item.quantity, 0),
          template_item.display_order
        );

        v_items_created := v_items_created + 1;
      ELSE
        -- No SINAPI match found - use defaults
        INSERT INTO public.budget_line_items (
          budget_id,
          phase_id,
          sinapi_code,
          sinapi_item,
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
          NULL,  -- No catalog match, so no sinapi_item
          template_item.item_number,
          'Unknown Item',
          'UN',
          100.00,
          50.00,
          COALESCE(template_item.quantity, 0),
          template_item.display_order
        );

        v_items_with_default_costs := v_items_with_default_costs + 1;
        RAISE NOTICE '[populate_budget] SINAPI code % not found in catalog or has multiple items - using defaults',
          template_item.sinapi_code;
      END IF;
    ELSE
      v_items_skipped := v_items_skipped + 1;
      RAISE NOTICE '[populate_budget] SINAPI code % item % already exists in budget % - SKIPPING',
        template_item.sinapi_code, template_item.sinapi_item, p_budget_id;
    END IF;
  END LOOP;

  -- Log final results
  RAISE NOTICE '[populate_budget] COMPLETED: budget=%, created=%, skipped=%, default_costs=%',
    p_budget_id, v_items_created, v_items_skipped, v_items_with_default_costs;

  -- Return results
  RETURN QUERY SELECT v_items_created, v_items_skipped, v_items_with_default_costs;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.populate_budget_from_template(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.populate_budget_from_template(UUID, UUID) IS
'Populates budget_line_items from sinapi_project_template_items template.
Joins with sinapi_items using sinapi_code only (where code has exactly 1 item).
Creates/matches project phases as budget type. Uses sort_order column (not display_order).
Skips items that already exist in budget to avoid duplicates.
Returns (items_created, items_skipped, items_with_default_costs).';

COMMIT;