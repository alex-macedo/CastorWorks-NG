-- ============================================================================
-- Add Missing RLS Policies for project_photos Table
-- Created: 2025-11-22
-- Description: Adds comprehensive RLS policies for project_photos table
-- ============================================================================

-- ============================================================================
-- PROJECT PHOTOS RLS POLICIES
-- ============================================================================

-- SELECT: Users can view photos for projects they have access to
DROP POLICY IF EXISTS "Users can view photos for accessible projects" ON public.project_photos;
CREATE POLICY "Users can view photos for accessible projects"
ON public.project_photos FOR SELECT
USING (has_project_access(auth.uid(), project_id));

-- INSERT: Project admins can upload photos
DROP POLICY IF EXISTS "Project admins can insert photos" ON public.project_photos;
CREATE POLICY "Project admins can insert photos"
ON public.project_photos FOR INSERT
WITH CHECK (has_project_admin_access(auth.uid(), project_id));

-- UPDATE: Project admins can update photo metadata
DROP POLICY IF EXISTS "Project admins can update photos" ON public.project_photos;
CREATE POLICY "Project admins can update photos"
ON public.project_photos FOR UPDATE
USING (has_project_admin_access(auth.uid(), project_id))
WITH CHECK (has_project_admin_access(auth.uid(), project_id));

-- DELETE: Project admins can delete photos
DROP POLICY IF EXISTS "Project admins can delete photos" ON public.project_photos;
CREATE POLICY "Project admins can delete photos"
ON public.project_photos FOR DELETE
USING (has_project_admin_access(auth.uid(), project_id));

-- ============================================================================
-- Documentation
-- ============================================================================

COMMENT ON TABLE public.project_photos IS 
  'Project photo gallery. RLS ensures users can only access photos for projects they have access to.';
