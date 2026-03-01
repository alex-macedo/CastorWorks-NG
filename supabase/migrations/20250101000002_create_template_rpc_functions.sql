-- Migration: Create/update RPC functions for template operations
-- Purpose: Create functions to populate budgets from templates and duplicate templates to projects

BEGIN;

-- Function: Populate simple budget from template (materials + labor)
CREATE OR REPLACE FUNCTION public.populate_budget_from_simple_template(
  p_project_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  template_material RECORD;
  template_labor RECORD;
  project_tgfa NUMERIC;
BEGIN
  -- Get project TGFA for quantity calculations
  SELECT total_gross_floor_area INTO project_tgfa
  FROM public.projects
  WHERE id = p_project_id;
  
  IF project_tgfa IS NULL THEN
    project_tgfa := 0;
  END IF;

  -- Copy materials from template
  FOR template_material IN 
    SELECT * FROM public.simplebudget_materials_template
    ORDER BY group_name, description
  LOOP
    INSERT INTO public.project_materials (
      project_id, sinapi_code, group_name, description, quantity, unit,
      price_per_unit, freight_percentage, factor, tgfa_applicable, fee_desc, editable
    ) VALUES (
      p_project_id,
      template_material.sinapi_code,
      template_material.group_name,
      template_material.description,
      CASE 
        WHEN template_material.tgfa_applicable THEN project_tgfa
        ELSE template_material.factor
      END,
      template_material.unit,
      template_material.price_per_unit,
      template_material.freight_percentage,
      template_material.factor,
      template_material.tgfa_applicable,
      template_material.fee_desc,
      template_material.editable
    )
    ON CONFLICT DO NOTHING; -- Skip if already exists
  END LOOP;

  -- Copy labor from template
  FOR template_labor IN
    SELECT * FROM public.simplebudget_labor_template
    ORDER BY "group", description
  LOOP
    INSERT INTO public.project_labor (
      project_id, "group", description, total_value, percentage, editable
    ) VALUES (
      p_project_id,
      template_labor."group",
      template_labor.description,
      template_labor.total_value,
      template_labor.percentage,
      template_labor.editable
    )
    ON CONFLICT DO NOTHING; -- Skip if already exists
  END LOOP;
END;
$$;

-- Function: Duplicate materials template to project
CREATE OR REPLACE FUNCTION public.duplicate_materials_template(
  p_project_id UUID,
  p_total_gross_floor_area NUMERIC DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  template_material RECORD;
  items_inserted INTEGER := 0;
  project_tgfa NUMERIC;
BEGIN
  -- Get project TGFA if not provided
  IF p_total_gross_floor_area IS NULL THEN
    SELECT total_gross_floor_area INTO project_tgfa
    FROM public.projects
    WHERE id = p_project_id;
  ELSE
    project_tgfa := p_total_gross_floor_area;
  END IF;
  
  IF project_tgfa IS NULL THEN
    project_tgfa := 0;
  END IF;

  -- Copy materials from template
  FOR template_material IN 
    SELECT * FROM public.simplebudget_materials_template
    ORDER BY group_name, description
  LOOP
    INSERT INTO public.project_materials (
      project_id, sinapi_code, group_name, description, quantity, unit,
      price_per_unit, freight_percentage, factor, tgfa_applicable, fee_desc, editable
    ) VALUES (
      p_project_id,
      template_material.sinapi_code,
      template_material.group_name,
      template_material.description,
      CASE 
        WHEN template_material.tgfa_applicable THEN project_tgfa
        ELSE template_material.factor
      END,
      template_material.unit,
      template_material.price_per_unit,
      template_material.freight_percentage,
      template_material.factor,
      template_material.tgfa_applicable,
      template_material.fee_desc,
      template_material.editable
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Count actual inserted rows (more reliable than ROW_COUNT in loop)
  SELECT COUNT(*) INTO items_inserted
  FROM public.project_materials pm
  WHERE pm.project_id = p_project_id
    AND EXISTS (
      SELECT 1 FROM public.simplebudget_materials_template smt
      WHERE smt.description = pm.description
        AND smt.group_name = pm.group_name
    );

  RETURN items_inserted;
END;
$$;

-- Function: Duplicate labor template to project
CREATE OR REPLACE FUNCTION public.duplicate_labor_template(
  p_project_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  template_labor RECORD;
  items_inserted INTEGER := 0;
BEGIN
  -- Copy labor from template
  FOR template_labor IN
    SELECT * FROM public.simplebudget_labor_template
    ORDER BY "group", description
  LOOP
    INSERT INTO public.project_labor (
      project_id, "group", description, total_value, percentage, editable
    ) VALUES (
      p_project_id,
      template_labor."group",
      template_labor.description,
      template_labor.total_value,
      template_labor.percentage,
      template_labor.editable
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Count actual inserted rows (more reliable than ROW_COUNT in loop)
  SELECT COUNT(*) INTO items_inserted
  FROM public.project_labor pl
  WHERE pl.project_id = p_project_id
    AND EXISTS (
      SELECT 1 FROM public.simplebudget_labor_template slt
      WHERE slt.description = pl.description
        AND slt."group" = pl."group"
    );

  RETURN items_inserted;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.populate_budget_from_simple_template(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.duplicate_materials_template(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.duplicate_labor_template(UUID) TO authenticated;

COMMIT;
