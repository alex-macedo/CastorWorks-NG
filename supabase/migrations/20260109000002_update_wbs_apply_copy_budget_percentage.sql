-- Migration: Update apply_wbs_template_to_project_internal to copy budget_percentage
-- Purpose: Ensure budget_percentage is copied from templates to project WBS items
-- This is needed for the Cost Control budget distribution to work

BEGIN;

CREATE OR REPLACE FUNCTION public.apply_wbs_template_to_project_internal(_project_id uuid, _template_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
  v_project_start_date DATE;
BEGIN
  -- Avoid double-apply
  SELECT COUNT(*) INTO v_count
  FROM public.project_wbs_items
  WHERE project_id = _project_id;

  IF v_count > 0 THEN
    RAISE NOTICE 'WBS items already exist for project %, skipping template application', _project_id;
    RETURN;
  END IF;

  -- Get project start date for schedule calculation
  SELECT p.start_date INTO v_project_start_date
  FROM public.projects p
  WHERE p.id = _project_id;

  RAISE NOTICE 'Applying WBS template % to project %', _template_id, _project_id;

  -- Use a temporary table for stable mapping of template items to new project items
  CREATE TEMP TABLE IF NOT EXISTS wbs_mapping_temp (
    template_item_id UUID,
    template_parent_id UUID,
    new_project_item_id UUID,
    item_type public.wbs_item_type,
    name TEXT,
    description TEXT,
    sort_order INT,
    wbs_code TEXT,
    code_path TEXT,
    standard_cost_code TEXT,
    standard_duration_days INT,
    budget_percentage NUMERIC,  -- Added for budget distribution
    hierarchy_level INT
  ) ON COMMIT DROP;

  TRUNCATE wbs_mapping_temp;

  -- Populate the mapping table using a recursive CTE
  WITH RECURSIVE template_hierarchy AS (
    -- Base case: root items
    SELECT
      i.id AS template_item_id,
      i.parent_id AS template_parent_id,
      i.item_type,
      i.name,
      i.description,
      i.sort_order,
      i.wbs_code,
      i.code_path,
      i.standard_cost_code,
      i.standard_duration_days,
      COALESCE(i.budget_percentage, 0) as budget_percentage,  -- Copy budget_percentage
      0 AS level
    FROM public.project_wbs_template_items i
    WHERE i.template_id = _template_id
      AND i.parent_id IS NULL

    UNION ALL

    -- Recursive case: child items
    SELECT
      child.id,
      child.parent_id,
      child.item_type,
      child.name,
      child.description,
      child.sort_order,
      child.wbs_code,
      child.code_path,
      child.standard_cost_code,
      child.standard_duration_days,
      COALESCE(child.budget_percentage, 0),  -- Copy budget_percentage
      parent_rec.level + 1
    FROM public.project_wbs_template_items child
    INNER JOIN template_hierarchy parent_rec ON child.parent_id = parent_rec.template_item_id
    WHERE child.template_id = _template_id
  )
  INSERT INTO wbs_mapping_temp (
    template_item_id, template_parent_id, new_project_item_id,
    item_type, name, description, sort_order, wbs_code,
    code_path, standard_cost_code, standard_duration_days,
    budget_percentage, hierarchy_level
  )
  SELECT
    template_item_id, template_parent_id, gen_random_uuid(),
    item_type, name, description, sort_order, wbs_code,
    code_path, standard_cost_code, standard_duration_days,
    budget_percentage, level
  FROM template_hierarchy;

  -- Perform the actual insertion into project_wbs_items including budget_percentage
  INSERT INTO public.project_wbs_items (
    id, project_id, parent_id, source_template_item_id,
    item_type, name, description, sort_order, wbs_code,
    code_path, standard_cost_code, standard_duration_days,
    budget_percentage  -- Include budget_percentage in insert
  )
  SELECT
    m.new_project_item_id,
    _project_id,
    pm.new_project_item_id,
    m.template_item_id,
    m.item_type,
    m.name,
    m.description,
    m.sort_order,
    m.wbs_code,
    m.code_path,
    m.standard_cost_code,
    COALESCE(m.standard_duration_days, 1),
    m.budget_percentage  -- Copy budget_percentage to project items
  FROM wbs_mapping_temp m
  LEFT JOIN wbs_mapping_temp pm ON m.template_parent_id = pm.template_item_id
  ORDER BY m.hierarchy_level ASC, m.code_path ASC;

  -- Create project_phases for WBS phase items
  INSERT INTO public.project_phases (
    project_id, phase_name, sort_order, status,
    progress_percentage, budget_allocated, budget_spent, wbs_item_id, type
  )
  SELECT
    _project_id,
    w.name,
    w.sort_order,
    'pending'::phase_status,
    0, 0, 0, w.id, 'schedule'
  FROM public.project_wbs_items w
  WHERE w.project_id = _project_id
    AND w.item_type = 'phase'::public.wbs_item_type
  ON CONFLICT DO NOTHING;

  -- Initialize schedule dates if start date is set
  IF v_project_start_date IS NOT NULL THEN
    PERFORM public.initialize_wbs_schedule_dates(_project_id);
  END IF;

  RAISE NOTICE 'Applied WBS template % to project %', _template_id, _project_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in apply_wbs_template_to_project_internal: %', SQLERRM;
    RAISE;
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION public.apply_wbs_template_to_project_internal(UUID, UUID) IS
'Applies a WBS template to a project, copying the hierarchical structure including budget_percentage.
Budget percentages are used by populate_budget_from_cost_control_template for budget distribution.';

COMMIT;
