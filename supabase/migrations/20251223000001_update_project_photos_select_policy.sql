-- ============================================================================
-- Update project_photos RLS Policy for Client Portal Access
-- Created: 2025-12-23
-- Description: Updates the SELECT policy to allow client portal users to view photos
-- ============================================================================

-- Update the SELECT policy to include client portal access
DROP POLICY IF EXISTS "Users can view photos for accessible projects" ON public.project_photos;
CREATE POLICY "Users can view photos for accessible projects"
  ON public.project_photos FOR SELECT
  USING (
    -- Regular authenticated users with project access
    has_project_access(auth.uid(), project_id)
    OR
    -- Client portal users (authenticated via Supabase but with team member roles)
    has_client_portal_photo_access(auth.uid(), project_id)
  );

-- ============================================================================
-- Documentation
-- ============================================================================

COMMENT ON POLICY "Users can view photos for accessible projects" ON public.project_photos
IS 'Allows authenticated users with project access OR client portal users to view project photos.';