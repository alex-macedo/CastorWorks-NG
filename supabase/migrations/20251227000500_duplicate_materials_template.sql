-- Migration: duplicate_materials_template
-- Description: Creates an RPC function to duplicate a materials template.

CREATE OR REPLACE FUNCTION public.duplicate_materials_template(
  p_source_template_id uuid,
  p_new_template_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_template_id uuid;
BEGIN
  -- Create a new project for the template
  INSERT INTO public.projects (name, description, budget_model)
  VALUES (p_new_template_name, 'Materials Template', 'simple')
  RETURNING id INTO new_template_id;

  -- Copy material items from the source template
  INSERT INTO public.project_materials (
    project_id, 
    sinapi_code, 
    group_name, 
    description, 
    quantity, 
    unit,
    price_per_unit, 
    freight_percentage, 
    factor, 
    tgfa_applicable, 
    fee_desc, 
    editable
  )
  SELECT
    new_template_id,
    pm.sinapi_code,
    pm.group_name,  -- CRITICAL: Preserve group_name from source
    pm.description,
    pm.quantity,
    pm.unit,
    pm.price_per_unit,
    pm.freight_percentage,
    pm.factor,
    pm.tgfa_applicable,
    pm.fee_desc,
    pm.editable
  FROM public.project_materials pm
  WHERE pm.project_id = p_source_template_id;

  RETURN new_template_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.duplicate_materials_template(uuid, text) TO authenticated;
