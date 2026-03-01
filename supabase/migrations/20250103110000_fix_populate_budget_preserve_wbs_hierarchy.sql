-- Migration: 20250103110000_fix_populate_budget_preserve_wbs_hierarchy.sql
-- Purpose: Update populate_budget_from_cost_control_template to preserve WBS hierarchy with parent_id groups

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
  parent_item RECORD;
  phase_id_val UUID;
  cost_code_rec RECORD;
  group_item_id UUID;
  existing_item_id UUID;
  v_phases_created INTEGER := 0;
  v_items_created INTEGER := 0;
  v_items_skipped INTEGER := 0;
  v_sort_order INTEGER;
  v_group_sort_order INTEGER;
BEGIN
  -- Get the budget record to verify it exists and belongs to the project
  PERFORM 1
  FROM public.project_budgets
  WHERE id = p_budget_id
    AND project_id = p_project_id
    AND budget_type = 'detailed';

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
    SELECT id INTO phase_id_val
    FROM public.project_phases
    WHERE project_id = p_project_id
      AND wbs_item_id = wbs_phase.id
      AND type = 'budget';

    IF phase_id_val IS NULL THEN
      INSERT INTO public.project_phases (
        project_id,
        phase_name,
        display_order,
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

    -- Get direct children of this phase (deliverables, work packages)
    -- These will be created as group items to preserve hierarchy
    v_group_sort_order := 0;

    FOR parent_item IN
      SELECT
        id,
        name,
        sort_order,
        wbs_code,
        code_path,
        item_type
      FROM public.project_wbs_items
      WHERE project_id = p_project_id
        AND parent_id = wbs_phase.id
        AND item_type IN ('deliverable'::public.wbs_item_type, 'workpackage'::public.wbs_item_type)
      ORDER BY sort_order, code_path
    LOOP
      v_group_sort_order := v_group_sort_order + 1;

      -- Check if group item already exists for this WBS item
      SELECT id INTO group_item_id
      FROM public.budget_line_items
      WHERE budget_id = p_budget_id
        AND phase_id = phase_id_val
        AND item_type = 'group'
        AND description ILIKE parent_item.name || '%';

      -- Create group item if it doesn't exist
      IF group_item_id IS NULL THEN
        INSERT INTO public.budget_line_items (
          budget_id,
          phase_id,
          sinapi_code,
          description,
          unit,
          item_type,
          sort_order
        ) VALUES (
          p_budget_id,
          phase_id_val,
          parent_item.wbs_code,
          parent_item.name,
          '',
          'group',
          v_group_sort_order
        ) RETURNING id INTO group_item_id;

        v_items_created := v_items_created + 1;
      END IF;

      -- Now get all leaf items under this work package (with standard cost codes)
      v_sort_order := 0;

      FOR wbs_item IN
        WITH RECURSIVE wbs_tree AS (
          -- Start with items directly under this work package
          SELECT
            id,
            name,
            standard_cost_code,
            1 as depth
          FROM public.project_wbs_items
          WHERE project_id = p_project_id
            AND parent_id = parent_item.id
            AND item_type NOT IN ('phase'::public.wbs_item_type, 'deliverable'::public.wbs_item_type)

          UNION ALL

          -- Include descendants (nested items under the work package)
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
        -- For each cost code under this work package, create a budget line item with parent_id
        v_sort_order := v_sort_order + 1;

        -- Look up cost_code_id from cost_codes table
        SELECT id INTO cost_code_rec
        FROM public.cost_codes
        WHERE code = wbs_item.standard_cost_code
          OR (
            code ILIKE wbs_item.standard_cost_code
            OR name ILIKE '%' || wbs_item.standard_cost_code || '%'
          )
        LIMIT 1;

        -- Only create line item if we found the cost code
        IF cost_code_rec.id IS NOT NULL THEN
          -- Check if item already exists
          SELECT id INTO existing_item_id
          FROM public.budget_line_items
          WHERE budget_id = p_budget_id
            AND phase_id = phase_id_val
            AND parent_id = group_item_id
            AND sinapi_code = wbs_item.standard_cost_code;

          IF existing_item_id IS NULL THEN
            INSERT INTO public.budget_line_items (
              budget_id,
              phase_id,
              parent_id,
              sinapi_code,
              description,
              unit,
              item_type,
              sort_order
            ) VALUES (
              p_budget_id,
              phase_id_val,
              group_item_id,
              wbs_item.standard_cost_code,
              cost_code_rec.name,
              'un',
              'leaf',
              v_sort_order
            );

            v_items_created := v_items_created + 1;
          ELSE
            v_items_skipped := v_items_skipped + 1;
          END IF;
        ELSE
          RAISE WARNING 'Cost code % not found in cost_codes table', wbs_item.standard_cost_code;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  -- Log final results
  RAISE NOTICE '[populate_cost_control] COMPLETED: budget=%, phases_created=%, items_created=%, items_skipped=%',
    p_budget_id, v_phases_created, v_items_created, v_items_skipped;

  RETURN QUERY SELECT v_phases_created, v_items_created, v_items_skipped;
END;
$$;

GRANT EXECUTE ON FUNCTION public.populate_budget_from_cost_control_template(UUID, UUID) TO authenticated;

COMMIT;

