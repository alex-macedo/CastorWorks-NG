-- Migration: Fix column reference ambiguity in populate_budget_from_cost_control_template
-- Purpose: Resolve ambiguous column reference where version_id could refer to table column or variable

BEGIN;

-- Drop and recreate function with explicit column references
DROP FUNCTION IF EXISTS public.populate_budget_from_cost_control_template(UUID, UUID);

CREATE OR REPLACE FUNCTION public.populate_budget_from_cost_control_template(
  p_budget_id UUID,
  p_project_id UUID
)
RETURNS TABLE(
  version_id UUID,
  phases_created INTEGER,
  items_created INTEGER,
  items_skipped INTEGER,
  total_budget_distributed NUMERIC
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
  v_version_id UUID;
  v_phases_created INTEGER := 0;
  v_items_created INTEGER := 0;
  v_items_skipped INTEGER := 0;
  v_sort_order INTEGER;
  v_project_budget_total NUMERIC := 0;
  v_phase_budget NUMERIC := 0;
  v_cost_codes_in_phase INTEGER := 0;
  v_amount_per_cost_code NUMERIC := 0;
  v_total_budget_distributed NUMERIC := 0;
BEGIN
  -- Get the budget record to verify it exists and belongs to the project
  PERFORM 1
  FROM public.project_budgets
  WHERE id = p_budget_id
    AND project_id = p_project_id
    AND budget_model = 'cost_control';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Budget % not found or is not a Cost Control budget', p_budget_id;
  END IF;

  -- Create a budget version for this cost control budget
  INSERT INTO public.project_budget_versions (
    project_id,
    name,
    status,
    effective_date,
    created_by
  ) VALUES (
    p_project_id,
    'Cost Control Budget Baseline',
    'baseline',
    CURRENT_DATE,
    auth.uid()
  ) RETURNING id INTO v_version_id;

  -- Get project's total budget
  SELECT COALESCE(budget_total, 0) INTO v_project_budget_total
  FROM public.projects
  WHERE id = p_project_id;

  IF v_project_budget_total = 0 THEN
    RAISE WARNING '[populate_cost_control] Project % has budget_total = 0, budget line items will have zero amounts', p_project_id;
  END IF;

  -- Iterate through all WBS phases in the project
  FOR wbs_phase IN
    SELECT
      w.id,
      w.name,
      w.sort_order,
      w.wbs_code,
      w.code_path,
      COALESCE(w.budget_percentage, 0) as budget_percentage
    FROM public.project_wbs_items w
    WHERE w.project_id = p_project_id
      AND w.item_type = 'phase'::public.wbs_item_type
    ORDER BY w.sort_order, w.code_path
  LOOP
    -- Calculate phase budget based on percentage of project total
    v_phase_budget := ROUND((v_project_budget_total * wbs_phase.budget_percentage / 100.0)::numeric, 2);

    -- Get or create project_phases record linked to WBS phase
    SELECT id INTO phase_id_val
    FROM public.project_phases
    WHERE project_id = p_project_id
      AND wbs_item_id = wbs_phase.id
    LIMIT 1;

    IF phase_id_val IS NULL THEN
      INSERT INTO public.project_phases (
        project_id,
        phase_name,
        display_order,
        status,
        progress_percentage,
        budget_allocated,
        type,
        wbs_item_id
      ) VALUES (
        p_project_id,
        wbs_phase.name,
        wbs_phase.sort_order,
        'pending',
        0,
        v_phase_budget,
        'budget',
        wbs_phase.id
      ) RETURNING id INTO phase_id_val;

      v_phases_created := v_phases_created + 1;
    ELSE
      -- Update existing phase with calculated budget
      UPDATE public.project_phases
      SET budget_allocated = v_phase_budget
      WHERE id = phase_id_val;
    END IF;

    -- Count cost codes in this phase to distribute budget equally among them
    SELECT COUNT(DISTINCT standard_cost_code) INTO v_cost_codes_in_phase
    FROM (
      WITH RECURSIVE wbs_tree AS (
        SELECT id, standard_cost_code
        FROM public.project_wbs_items
        WHERE project_id = p_project_id
          AND parent_id = wbs_phase.id
          AND item_type != 'phase'::public.wbs_item_type
        UNION ALL
        SELECT c.id, c.standard_cost_code
        FROM public.project_wbs_items c
        JOIN wbs_tree p ON c.parent_id = p.id
        WHERE c.project_id = p_project_id
      )
      SELECT DISTINCT standard_cost_code
      FROM wbs_tree
      WHERE standard_cost_code IS NOT NULL
    ) cost_codes;

    -- Calculate amount per cost code (distribute phase budget equally)
    IF v_cost_codes_in_phase > 0 THEN
      v_amount_per_cost_code := ROUND((v_phase_budget / v_cost_codes_in_phase)::numeric, 2);
    ELSE
      v_amount_per_cost_code := 0;
    END IF;

    -- Get all WBS items under this phase and collect standard cost codes
    v_sort_order := 0;

    FOR wbs_item IN
      WITH RECURSIVE wbs_tree AS (
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
      v_sort_order := v_sort_order + 1;

      -- Look up cost_code_id from cost_codes table
      SELECT id, name INTO cost_code_rec
      FROM public.cost_codes
      WHERE code = wbs_item.standard_cost_code
        AND language = 'en-US'  -- Use English canonical keys
      LIMIT 1;

      -- Only create line item if we found the cost code
      IF cost_code_rec.id IS NOT NULL THEN
        -- Check if item already exists (phase + cost code combination)
        -- FIX: Use table alias to avoid column ambiguity
        SELECT pbl.id INTO existing_item_id
        FROM public.project_budget_lines pbl
        WHERE pbl.version_id = v_version_id
          AND pbl.phase_id = phase_id_val
          AND pbl.cost_code_id = cost_code_rec.id;

        IF existing_item_id IS NULL THEN
          -- Insert budget line item with calculated amount
          INSERT INTO public.project_budget_lines (
            project_id,
            version_id,
            phase_id,
            cost_code_id,
            description,
            amount
          ) VALUES (
            p_project_id,
            v_version_id,
            phase_id_val,
            cost_code_rec.id,
            cost_code_rec.name || ' - ' || wbs_phase.name,
            v_amount_per_cost_code
          );

          v_items_created := v_items_created + 1;
          v_total_budget_distributed := v_total_budget_distributed + v_amount_per_cost_code;
        ELSE
          v_items_skipped := v_items_skipped + 1;
        END IF;
      ELSE
        -- Cost code not found - log warning but continue
        RAISE WARNING '[populate_cost_control] Cost code % not found for WBS phase %',
          wbs_item.standard_cost_code, wbs_phase.name;
      END IF;
    END LOOP;

    RAISE NOTICE '[populate_cost_control] Phase "%": budget_percentage=%, phase_budget=%, cost_codes=%, amount_per_code=%',
      wbs_phase.name, wbs_phase.budget_percentage, v_phase_budget, v_cost_codes_in_phase, v_amount_per_cost_code;
  END LOOP;

  -- Log final results
  RAISE NOTICE '[populate_cost_control] COMPLETED: budget=%, project_total=%, distributed=%, phases=%, items=%, skipped=%',
    p_budget_id, v_project_budget_total, v_total_budget_distributed, v_phases_created, v_items_created, v_items_skipped;

  -- Return results
  RETURN QUERY SELECT v_version_id, v_phases_created, v_items_created, v_items_skipped, v_total_budget_distributed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.populate_budget_from_cost_control_template(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.populate_budget_from_cost_control_template(UUID, UUID) IS
'Populates project_budget_lines for Cost Control budgets from project WBS structure with budget distribution.
1. Creates a baseline budget version
2. Gets project budget_total from projects table
3. For each WBS phase: calculates phase budget = budget_total × budget_percentage / 100
4. Distributes phase budget equally among all cost codes in that phase
5. Sets amount to calculated amount per cost code for each phase/cost_code combination
6. Creates project_phases with budget_allocated set to calculated phase budget
Returns (version_id, phases_created, items_created, items_skipped, total_budget_distributed).';

COMMIT;