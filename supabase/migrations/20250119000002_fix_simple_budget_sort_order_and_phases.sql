-- Migration: Fix simple budget population to include sort_order and phase support
-- Purpose: Ensure budget line items maintain template ordering and can be associated with phases

BEGIN;

-- Ensure sort_order column exists in template tables (should already exist from earlier migration)
ALTER TABLE public.simplebudget_materials_template 
  ADD COLUMN IF NOT EXISTS sort_order INTEGER;

ALTER TABLE public.simplebudget_labor_template 
  ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- Create indexes for sort_order if they don't exist
CREATE INDEX IF NOT EXISTS idx_simplebudget_materials_template_sort_order 
  ON public.simplebudget_materials_template(sort_order);
CREATE INDEX IF NOT EXISTS idx_simplebudget_labor_template_sort_order 
  ON public.simplebudget_labor_template(sort_order);

-- Update the populate function to include sort_order and handle phases
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
  v_default_phase_id UUID;
  v_sort_counter INTEGER := 0;
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

  -- Verify that the project exists
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
  
  -- Step 3: Try to get the first phase for this project (if any phases exist)
  SELECT id INTO v_default_phase_id
  FROM project_phases
  WHERE project_id = p_project_id
  ORDER BY sort_order ASC, created_at ASC
  LIMIT 1;
  
  RAISE NOTICE 'Default phase ID: %', v_default_phase_id;
  
  -- Check how many materials are available in template
  SELECT COUNT(*) INTO v_materials_available
  FROM simplebudget_materials_template
  WHERE "default" = TRUE;
  
  RAISE NOTICE 'Materials available in template (default=TRUE): %', v_materials_available;

  -- Step 4: Copy all materials from simplebudget_materials_template where default = TRUE
  -- Use sort_order from template to maintain ordering
  INSERT INTO budget_line_items (
    budget_id,
    phase_id,
    sinapi_code,
    description,
    quantity,
    unit,
    unit_cost_material,
    unit_cost_labor,
    sort_order
  )
  SELECT 
    p_budget_id,
    v_default_phase_id,
    COALESCE(smt.sinapi_code, ''),
    smt.description,
    -- If tgfa_applicable = true: quantity = TGFA * factor
    -- Else: quantity = factor
    CASE 
      WHEN smt.tgfa_applicable = true THEN GREATEST(v_project_tgfa * smt.factor, 0)
      ELSE GREATEST(smt.factor, 0)
    END,
    smt.unit,
    -- unit_cost_material = price_per_unit
    COALESCE(smt.price_per_unit, 0),
    0,
    -- Use template sort_order, or assign sequential order if null
    COALESCE(smt.sort_order, ROW_NUMBER() OVER (ORDER BY smt.group_name, smt.description))
  FROM simplebudget_materials_template smt
  -- Filter: only include materials where default = TRUE
  WHERE smt."default" = TRUE
  ORDER BY COALESCE(smt.sort_order, 999999), smt.group_name, smt.description;

  GET DIAGNOSTICS v_materials_count = ROW_COUNT;
  
  RAISE NOTICE 'Materials inserted: %', v_materials_count;
  
  -- Get the maximum sort_order from materials to continue sequence for labor
  SELECT COALESCE(MAX(sort_order), 0) INTO v_sort_counter
  FROM budget_line_items
  WHERE budget_id = p_budget_id;
  
  -- Check how many labor items are available in template
  SELECT COUNT(*) INTO v_labor_available
  FROM simplebudget_labor_template
  WHERE budget_has_column = FALSE;
  
  RAISE NOTICE 'Labor items available in template (budget_has_column=FALSE): %', v_labor_available;

  -- Step 5: Copy all labor from simplebudget_labor_template only when budget_has_column = FALSE
  -- Continue sort_order sequence after materials
  INSERT INTO budget_line_items (
    budget_id,
    phase_id,
    sinapi_code,
    description,
    quantity,
    unit,
    unit_cost_material,
    unit_cost_labor,
    sort_order
  )
  SELECT 
    p_budget_id,
    v_default_phase_id,
    '',
    slt.description,
    1,
    'un',
    0,
    -- unit_cost_labor = total_value
    COALESCE(slt.total_value, 0),
    -- Continue sort_order from materials, or use template sort_order offset by max materials sort_order
    v_sort_counter + COALESCE(slt.sort_order, ROW_NUMBER() OVER (ORDER BY slt."group", slt.description))
  FROM simplebudget_labor_template slt
  -- Filter: only include labor when budget_has_column = FALSE
  WHERE slt.budget_has_column = FALSE
  ORDER BY COALESCE(slt.sort_order, 999999), slt."group", slt.description;

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

COMMIT;
