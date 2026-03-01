CREATE OR REPLACE FUNCTION public.delete_all_project_budgets(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cost control budgets
  DELETE FROM public.project_budget_lines WHERE project_id = p_project_id;
  DELETE FROM public.project_budget_versions WHERE project_id = p_project_id;

  -- Legacy/simple project-level budget items
  DELETE FROM public.project_budget_items WHERE project_id = p_project_id;

  -- Standard budgets (cascades to line items, phase totals, BDI components, history)
  DELETE FROM public.project_budgets WHERE project_id = p_project_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_all_project_budgets(uuid) TO authenticated;
