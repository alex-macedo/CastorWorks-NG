-- Migration: duplicate_labor_template
-- Description: Creates an RPC function to duplicate a labor template.

CREATE OR REPLACE FUNCTION public.duplicate_labor_template(
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
  VALUES (p_new_template_name, 'Labor Template', 'simple')
  RETURNING id INTO new_template_id;

  -- Copy labor items from the source template
  INSERT INTO public.project_labor (
    project_id, 
    "group",  -- CRITICAL: Preserve group from source
    description, 
    total_value, 
    percentage, 
    editable
  )
  SELECT
    new_template_id,
    pl."group",  -- CRITICAL: Preserve group from source
    pl.description,
    pl.total_value,
    pl.percentage,
    pl.editable
  FROM public.project_labor pl
  WHERE pl.project_id = p_source_template_id;

  RETURN new_template_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.duplicate_labor_template(uuid, text) TO authenticated;
