-- Migration: populate_budget_from_simple_template
-- Description: Creates an RPC function to populate a simple budget from the default material and labor templates.

CREATE OR REPLACE FUNCTION public.populate_budget_from_simple_template(
  p_budget_id uuid,
  p_project_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_materials_template_id uuid;
  v_labor_template_id uuid;
BEGIN
  -- Find the default materials template project
  SELECT id INTO v_materials_template_id
  FROM public.projects
  WHERE name ILIKE '%materials%template%'
    AND budget_model = 'simple'
    AND description ILIKE '%template%'
  LIMIT 1;

  -- Find the default labor template project
  SELECT id INTO v_labor_template_id
  FROM public.projects
  WHERE name ILIKE '%labor%template%'
    AND budget_model = 'simple'
    AND description ILIKE '%template%'
  LIMIT 1;

  -- Copy material items from the materials template project
  IF v_materials_template_id IS NOT NULL THEN
    INSERT INTO public.budget_line_items (
      budget_id,
      description,
      quantity,
      unit_cost_material,
      unit_cost_labor,
      sinapi_code,
      unit
    )
    SELECT
      p_budget_id,
      pt.description,
      COALESCE(pt.quantity, 1),
      COALESCE(pt.price_per_unit, 0),
      0,
      '',
      COALESCE(pt.unit, '')
    FROM public.project_materials pt
    WHERE pt.project_id = v_materials_template_id
      AND COALESCE(pt.quantity, 0) > 0;
  END IF;

  -- Copy labor items from the labor template project
  IF v_labor_template_id IS NOT NULL THEN
    INSERT INTO public.budget_line_items (
      budget_id,
      description,
      quantity,
      unit_cost_material,
      unit_cost_labor,
      sinapi_code,
      unit
    )
    SELECT
      p_budget_id,
      pl.description,
      1,
      0,
      COALESCE(pl.total_value, 0),
      '',
      ''
    FROM public.project_labor pl
    WHERE pl.project_id = v_labor_template_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.populate_budget_from_simple_template(uuid, uuid) TO authenticated;
