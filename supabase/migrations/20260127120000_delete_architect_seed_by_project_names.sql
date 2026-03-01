-- ============================================================================
-- Delete Architect Seed Data By Project Names
-- ============================================================================
-- Migration: 20260127120000
-- Description: SECURITY DEFINER RPC to delete all architect demo data
-- matching a list of project name patterns (uses ILIKE). This bypasses RLS
-- so the cleanup can remove all demo records created by the seeder.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_architect_seed_by_project_names(p_names TEXT[])
RETURNS TABLE(deleted_projects INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  proj RECORD;
  ids UUID[] := ARRAY[]::UUID[];
BEGIN
  -- Collect matching project ids using ILIKE for flexible matching
  FOR proj IN
    SELECT id FROM projects WHERE (
      SELECT bool_or(name ILIKE ANY (p_names))
    )
  LOOP
    ids := array_append(ids, proj.id);
  END LOOP;

  IF array_length(ids, 1) IS NULL THEN
    -- Nothing to do
    RETURN QUERY SELECT 0;
    RETURN;
  END IF;

  -- Unset default flags to avoid trigger constraints
  UPDATE project_task_statuses SET is_default = false WHERE project_id = ANY(ids);

  -- Delete dependent records in safe order
  DELETE FROM project_phases WHERE project_id = ANY(ids);
  DELETE FROM project_task_statuses WHERE project_id = ANY(ids);

  DELETE FROM architect_meetings WHERE project_id = ANY(ids);
  DELETE FROM architect_briefings WHERE project_id = ANY(ids);
  DELETE FROM architect_site_diary WHERE project_id = ANY(ids);
  DELETE FROM architect_moodboard_sections WHERE project_id = ANY(ids);
  DELETE FROM architect_moodboard_images WHERE project_id = ANY(ids);
  DELETE FROM architect_moodboard_colors WHERE project_id = ANY(ids);
  DELETE FROM architect_opportunities WHERE project_id = ANY(ids);

  -- Delete comments for tasks belonging to these projects
  DELETE FROM architect_task_comments WHERE task_id IN (
    SELECT id FROM architect_tasks WHERE project_id = ANY(ids)
  );

  DELETE FROM architect_tasks WHERE project_id = ANY(ids);

  -- Finally delete projects
  DELETE FROM projects WHERE id = ANY(ids);

  -- Cleanup registry entries for these projects and architect_projects
  DELETE FROM seed_data_registry WHERE entity_id = ANY(ids) OR entity_type = 'architect_projects';

  RETURN QUERY SELECT cardinality(ids)::integer;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_architect_seed_by_project_names(TEXT[]) TO authenticated;

COMMENT ON FUNCTION public.delete_architect_seed_by_project_names(TEXT[]) IS
  'Deletes architect demo data for projects whose name matches any of the given patterns (ILIKE). Uses SECURITY DEFINER to bypass RLS.';
