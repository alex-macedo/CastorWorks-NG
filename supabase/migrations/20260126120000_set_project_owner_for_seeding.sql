-- ============================================================================
-- Set Project Owner/Manager for Seeding
-- ============================================================================
-- Migration: 20260126120000
-- Description: RPC function to set project owner and manager for seeding purposes
-- Uses SECURITY DEFINER to bypass RLS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_project_owner_for_seeding(
  p_project_id UUID,
  p_owner_id UUID,
  p_manager_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update project owner and optionally manager (bypasses RLS because SECURITY DEFINER)
  UPDATE projects
  SET owner_id = p_owner_id,
      manager_id = COALESCE(p_manager_id, manager_id)
  WHERE id = p_project_id;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to set project owner/manager for %: %', p_project_id, SQLERRM;
    RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_project_owner_for_seeding(UUID, UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.set_project_owner_for_seeding(UUID, UUID, UUID) IS
  'Sets project owner and manager for seeding purposes. Uses SECURITY DEFINER to bypass RLS.';
