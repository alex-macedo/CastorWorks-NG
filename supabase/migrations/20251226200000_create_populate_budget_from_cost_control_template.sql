-- Migration: 20251226200000_create_populate_budget_from_cost_control_template.sql
-- Purpose: Create RPC function to populate Cost Control budgets from project WBS structure
-- This function generates budget_line_items for Cost Control budgets by:
-- 1. Iterating through WBS phases in the project
-- 2. Creating project_phases records for each WBS phase (if not already exists)
-- 3. Creating budget_line_items for each cost code associated with the WBS phase

-- Fix constraint to allow multiple phase types per WBS item
ALTER TABLE public.project_phases
DROP CONSTRAINT IF EXISTS ux_project_phases_project_wbs_item;

ALTER TABLE public.project_phases
ADD CONSTRAINT ux_project_phases_project_wbs_type
UNIQUE (project_id, wbs_item_id, type)
WHERE wbs_item_id IS NOT NULL;

BEGIN;

CREATE OR REPLACE FUNCTION public.populate_budget_from_cost_control_template(
  p_budget_id UUID,
  p_project_id UUID
)
RETURNS TABLE(
  phases_created INTEGER,
  items_created INTEGER,
  items_skipped INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  wbs_phase RECORD;
  wbs_item RECORD;
  phase_id_val UUID;
  cost_code_rec RECORD;
  existing_item_id UUID;
  v_phases_created INTEGER := 0;
  v_items_created INTEGER := 0;
  v_items_skipped INTEGER := 0;
  v_sort_order INTEGER;
BEGIN
  -- Get the budget record to verify it exists and belongs to the project
  PERFORM 1
  FROM public.project_budgets
  WHERE id = p_budget_id
    AND project_id = p_project_id
    AND budget_model = 'cost_control';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Budget % not found or is not a detailed (Cost Control) budget', p_budget_id;
  END IF;

  -- Iterate through all WBS phases in the project
  FOR wbs_phase IN
    SELECT
      id,
      name,
      sort_order,
      wbs_code,
      code_path
    FROM public.project_wbs_items
    WHERE project_id = p_project_id
      AND item_type = 'phase'::public.wbs_item_type
    ORDER BY sort_order, code_path
  LOOP
    -- Get or create project_phases record linked to WBS phase
    -- First try to find existing budget phase
    SELECT id INTO phase_id_val
    FROM public.project_phases
    WHERE project_id = p_project_id
      AND wbs_item_id = wbs_phase.id
      AND type = 'budget';

    -- If no budget phase exists, try to find any existing phase for this WBS item
    IF phase_id_val IS NULL THEN
      SELECT id INTO phase_id_val
      FROM public.project_phases
      WHERE project_id = p_project_id
        AND wbs_item_id = wbs_phase.id
      LIMIT 1;
    END IF;

    -- If still no phase exists, create a new budget phase
    IF phase_id_val IS NULL THEN
      INSERT INTO public.project_phases (
        project_id,
        phase_name,
        sort_order,
        status,
        progress_percentage,
        type,
        wbs_item_id
      ) VALUES (
        p_project_id,
        wbs_phase.name,
        wbs_phase.sort_order,
        'pending',
        0,
        'budget',
        wbs_phase.id
      ) RETURNING id INTO phase_id_val;

      v_phases_created := v_phases_created + 1;
    END IF;

    -- Get all WBS items under this phase (deliverables, work packages)
    -- and collect standard cost codes
    v_sort_order := 0;

    FOR wbs_item IN
      WITH RECURSIVE wbs_tree AS (
        -- Start with items directly under this phase
        SELECT
          id,
          name,
          standard_cost_code,
          1 as depth
        FROM public.project_wbs_items
        WHERE project_id = p_project_id
          AND parent_id = wbs_phase.id
          AND item_type != 'phase'::public.wbs_item_type

        UNION ALL

        -- Include descendants (nested work packages, deliverables)
        SELECT
          c.id,
          c.name,
          c.standard_cost_code,
          p.depth + 1
        FROM public.project_wbs_items c
        JOIN wbs_tree p ON c.parent_id = p.id
        WHERE c.project_id = p_project_id
      )
      SELECT DISTINCT
        standard_cost_code
      FROM wbs_tree
      WHERE standard_cost_code IS NOT NULL
      ORDER BY standard_cost_code
    LOOP
      -- For each cost code, create a budget_line_item
      v_sort_order := v_sort_order + 1;

      -- Look up cost_code_id from cost_codes table using the standard cost code
      SELECT id INTO cost_code_rec
      FROM public.cost_codes
      WHERE code = wbs_item.standard_cost_code
        OR (
          -- Fallback: match by code pattern (e.g., 'MO', 'MAT', 'EQP', 'TER', 'IND')
          code ILIKE wbs_item.standard_cost_code
          OR name ILIKE '%' || wbs_item.standard_cost_code || '%'
        )
      LIMIT 1;

      -- Only create line item if we found the cost code
      IF cost_code_rec.id IS NOT NULL THEN
        -- Check if item already exists (phase + cost code combination)
        SELECT id INTO existing_item_id
        FROM public.budget_line_items
        WHERE budget_id = p_budget_id
          AND phase_id = phase_id_val
          AND cost_code_id = cost_code_rec.id;

        IF existing_item_id IS NULL THEN
          INSERT INTO public.budget_line_items (
            budget_id,
            phase_id,
            cost_code_id,
            description,
            unit_cost_material,
            unit_cost_labor,
            quantity,
            sort_order
          ) VALUES (
            p_budget_id,
            phase_id_val,
            cost_code_rec.id,
            cost_code_rec.name || ' - ' || wbs_phase.name,
            0.00,
            0.00,
            0,
            v_sort_order
          );

          v_items_created := v_items_created + 1;
        ELSE
          v_items_skipped := v_items_skipped + 1;
        END IF;
      ELSE
        -- Cost code not found - log warning but continue
        RAISE WARNING 'Cost code % not found in cost_codes table for WBS phase %',
          wbs_item.standard_cost_code, wbs_phase.name;
      END IF;
    END LOOP;
  END LOOP;

  -- Log final results
  RAISE NOTICE '[populate_cost_control] COMPLETED: budget=%, phases_created=%, items_created=%, items_skipped=%',
    p_budget_id, v_phases_created, v_items_created, v_items_skipped;

  -- Return results
  RETURN QUERY SELECT v_phases_created, v_items_created, v_items_skipped;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.populate_budget_from_cost_control_template(UUID, UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.populate_budget_from_cost_control_template(UUID, UUID) IS
'Populates budget_line_items for Cost Control budgets from project WBS structure.
Creates project_phases linked to WBS phases, then creates budget line items for each
cost code found in the WBS items under that phase. Cost codes are looked up from the
cost_codes table using the standard_cost_code field.
Returns (phases_created, items_created, items_skipped).';

COMMIT;
