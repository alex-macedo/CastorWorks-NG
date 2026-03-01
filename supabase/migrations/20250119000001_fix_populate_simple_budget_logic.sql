-- Migration: Fix populate_budget_from_simple_template to use correct filters and calculations
-- Purpose: Update function to match specification:
-- - Materials: Filter by default = TRUE, calculate quantity as TGFA * factor when tgfa_applicable
-- - Labor: Filter by budget_has_column = FALSE, set quantity = 1

-- Drop existing function first (return type is changing from void to INTEGER)
DROP FUNCTION IF EXISTS public.populate_budget_from_simple_template(uuid, uuid);

CREATE OR REPLACE FUNCTION public.populate_budget_from_simple_template(
  p_budget_id uuid,
  p_project_id uuid
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget_exists BOOLEAN;
  v_project_exists BOOLEAN;
  v_project_tgfa NUMERIC;
  v_materials_count INTEGER := 0;
  v_labor_count INTEGER := 0;
  v_materials_available INTEGER := 0;
  v_labor_available INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Starting populate_budget_from_simple_template ===';
  RAISE NOTICE 'Budget ID: %, Project ID: %', p_budget_id, p_project_id;
  
  -- Step 1: Verify that the budget exists
  SELECT EXISTS (
    SELECT 1 
    FROM project_budgets 
    WHERE id = p_budget_id
  ) INTO v_budget_exists;
  
  IF NOT v_budget_exists THEN
    RAISE EXCEPTION 'Budget % not found', p_budget_id;
  END IF;

  -- Step 1: Verify that the project exists
  SELECT EXISTS (
    SELECT 1 
    FROM projects 
    WHERE id = p_project_id
  ) INTO v_project_exists;
  
  IF NOT v_project_exists THEN
    RAISE EXCEPTION 'Project % not found', p_project_id;
  END IF;

  -- Step 2: Get the project TGFA (Total Gross Floor Area)
  SELECT total_gross_floor_area 
  INTO v_project_tgfa
  FROM projects 
  WHERE id = p_project_id;
  
  RAISE NOTICE 'Project TGFA: %', v_project_tgfa;
  
  -- Check how many materials are available in template
  SELECT COUNT(*) INTO v_materials_available
  FROM simplebudget_materials_template
  WHERE "default" = TRUE;
  
  RAISE NOTICE 'Materials available in template (default=TRUE): %', v_materials_available;

  -- Step 3: Copy all materials from simplebudget_materials_template where default = TRUE
  INSERT INTO budget_line_items (
    budget_id,
    project_id,
    item_type,
    phase,
    "group",
    category,
    description,
    quantity,
    unit,
    unit_cost_material,
    unit_cost_labor,
    total_material,
    total_labor,
    subtotal,
    editable
  )
  SELECT 
    p_budget_id,
    p_project_id,
    'material'::text,
    NULL,
    smt.group_name,
    NULL,
    smt.description,
    -- If tgfa_applicable = true: quantity = TGFA * factor
    -- Else: quantity = factor
    CASE 
      WHEN smt.tgfa_applicable = true THEN v_project_tgfa * smt.factor
      ELSE smt.factor
    END,
    smt.unit,
    -- unit_cost_material = price_per_unit
    smt.price_per_unit,
    0,
    -- total_material = quantity * unit_cost_material
    CASE 
      WHEN smt.tgfa_applicable = true THEN (v_project_tgfa * smt.factor) * smt.price_per_unit
      ELSE smt.factor * smt.price_per_unit
    END,
    0,
    -- subtotal = total_material + total_labor
    CASE 
      WHEN smt.tgfa_applicable = true THEN (v_project_tgfa * smt.factor) * smt.price_per_unit
      ELSE smt.factor * smt.price_per_unit
    END,
    smt.editable
  FROM simplebudget_materials_template smt
  -- Filter: only include materials where default = TRUE
  WHERE smt."default" = TRUE;

  GET DIAGNOSTICS v_materials_count = ROW_COUNT;
  
  RAISE NOTICE 'Materials inserted: %', v_materials_count;
  
  -- Check how many labor items are available in template
  SELECT COUNT(*) INTO v_labor_available
  FROM simplebudget_labor_template
  WHERE budget_has_column = FALSE;
  
  RAISE NOTICE 'Labor items available in template (budget_has_column=FALSE): %', v_labor_available;

  -- Step 4: Copy all labor from simplebudget_labor_template only when budget_has_column = FALSE
  INSERT INTO budget_line_items (
    budget_id,
    project_id,
    item_type,
    phase,
    "group",
    category,
    description,
    quantity,
    unit,
    unit_cost_material,
    unit_cost_labor,
    total_material,
    total_labor,
    subtotal,
    editable
  )
  SELECT 
    p_budget_id,
    p_project_id,
    'labor'::text,
    NULL,
    slt."group",
    NULL,
    slt.description,
    -- quantity = 1
    1,
    'un',
    0,
    -- unit_cost_labor = total_value
    slt.total_value,
    0,
    -- total_labor = quantity * unit_cost_labor = 1 * total_value
    slt.total_value,
    -- subtotal = total_material + total_labor
    slt.total_value,
    slt.editable
  FROM simplebudget_labor_template slt
  -- Filter: only include labor when budget_has_column = FALSE
  WHERE slt.budget_has_column = FALSE;

  GET DIAGNOSTICS v_labor_count = ROW_COUNT;
  
  RAISE NOTICE 'Labor items inserted: %', v_labor_count;
  RAISE NOTICE 'Total items inserted: %', v_materials_count + v_labor_count;
  RAISE NOTICE '=== populate_budget_from_simple_template completed ===';

  -- Return total count of items inserted
  RETURN v_materials_count + v_labor_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.populate_budget_from_simple_template(uuid, uuid) TO authenticated;
