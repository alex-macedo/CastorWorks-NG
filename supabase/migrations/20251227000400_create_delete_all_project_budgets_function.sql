CREATE OR REPLACE FUNCTION public.delete_all_project_budgets(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.project_budgets WHERE project_id = p_project_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_all_project_budgets(uuid) TO authenticated;
