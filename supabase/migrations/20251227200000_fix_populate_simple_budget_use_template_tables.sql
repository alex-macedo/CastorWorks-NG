-- Migration: fix_populate_simple_budget_use_template_tables
-- Description: Fixes populate_budget_from_simple_template to use template tables instead of template projects
-- The system uses simplebudget_materials_template and simplebudget_labor_template tables,
-- not template projects. This migration updates the function to use the correct source.

DROP FUNCTION IF EXISTS public.populate_budget_from_simple_template(uuid, uuid);

CREATE OR REPLACE FUNCTION public.populate_budget_from_simple_template(
  p_budget_id uuid,
  p_project_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_materials_count INTEGER := 0;
  v_labor_count INTEGER := 0;
  v_project_tgfa NUMERIC;
  v_template_materials_count INTEGER := 0;
  v_template_labor_count INTEGER := 0;
BEGIN
  -- Verify budget exists
  IF NOT EXISTS (SELECT 1 FROM public.project_budgets WHERE id = p_budget_id) THEN
    RAISE EXCEPTION 'Budget % does not exist', p_budget_id;
  END IF;

  -- Verify project exists
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id) THEN
    RAISE EXCEPTION 'Project % does not exist', p_project_id;
  END IF;

  -- Get project TGFA for quantity calculations (if needed)
  SELECT total_gross_floor_area INTO v_project_tgfa
  FROM public.projects
  WHERE id = p_project_id;
  
  IF v_project_tgfa IS NULL THEN
    v_project_tgfa := 0;
  END IF;

  -- Count available template materials
  SELECT COUNT(*) INTO v_template_materials_count
  FROM public.simplebudget_materials_template
  WHERE COALESCE(price_per_unit, 0) > 0 OR tgfa_applicable = true;

  -- Count available template labor
  SELECT COUNT(*) INTO v_template_labor_count
  FROM public.simplebudget_labor_template
  WHERE COALESCE(total_value, 0) > 0;

  RAISE NOTICE 'populate_budget_from_simple_template: Found % materials and % labor items in templates', 
    v_template_materials_count, v_template_labor_count;

  -- Copy material items from the materials template table
  INSERT INTO public.budget_line_items (
    budget_id,
    description,
    quantity,
    unit_cost_material,
    unit_cost_labor,
    sinapi_code,
    unit,
    group_name,
    sort_order
  )
  SELECT
    p_budget_id,
    smt.description,
    CASE 
      WHEN smt.tgfa_applicable THEN COALESCE(v_project_tgfa, smt.factor, 1)
      ELSE COALESCE(smt.factor, 1)
    END,
    COALESCE(smt.price_per_unit, 0),
    0,
    COALESCE(smt.sinapi_code, ''),
    COALESCE(smt.unit, ''),
    COALESCE(smt.group_name, 'Materials'),
    COALESCE(smt.sort_order, ROW_NUMBER() OVER (ORDER BY smt.group_name, smt.description))
  FROM public.simplebudget_materials_template smt
  WHERE COALESCE(smt.price_per_unit, 0) > 0 OR smt.tgfa_applicable = true
  ORDER BY COALESCE(smt.sort_order, 999999), smt.group_name, smt.description;

  GET DIAGNOSTICS v_materials_count = ROW_COUNT;

  -- Copy labor items from the labor template table
  INSERT INTO public.budget_line_items (
    budget_id,
    description,
    quantity,
    unit_cost_material,
    unit_cost_labor,
    sinapi_code,
    unit,
    group_name,
    percentage,
    editable,
    sort_order
  )
  SELECT
    p_budget_id,
    slt.description,
    1,
    0,
    COALESCE(slt.total_value, 0),
    '',
    '',
    COALESCE(slt."group", 'Labor'),
    COALESCE(slt.percentage, 0),
    COALESCE(slt.editable, true),
    COALESCE(slt.sort_order, ROW_NUMBER() OVER (ORDER BY slt."group", slt.description))
  FROM public.simplebudget_labor_template slt
  WHERE COALESCE(slt.total_value, 0) > 0
  ORDER BY COALESCE(slt.sort_order, 999999), slt."group", slt.description;

  GET DIAGNOSTICS v_labor_count = ROW_COUNT;

  -- Log the results (for debugging)
  RAISE NOTICE 'populate_budget_from_simple_template: Inserted % materials and % labor items into budget % (project: %, tgfa: %)', 
    v_materials_count, v_labor_count, p_budget_id, p_project_id, v_project_tgfa;

  -- Warn if no items were inserted
  IF v_materials_count = 0 AND v_labor_count = 0 THEN
    RAISE WARNING 'populate_budget_from_simple_template: No items inserted! Template tables may be empty or filtered out.';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.populate_budget_from_simple_template(uuid, uuid) TO authenticated;
