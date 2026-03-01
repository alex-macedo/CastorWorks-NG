-- ============================================================================
-- Add Client Portal Access Policy for project_photos Table
-- Created: 2025-12-23
-- Description: Adds RLS policy allowing client portal users to view project photos
-- ============================================================================

-- Create a function to check client portal access to project photos
-- This mirrors the logic in validateClientPortalToken but for RLS policies
CREATE OR REPLACE FUNCTION public.has_client_portal_photo_access(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Admins can access all projects
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role = 'admin'
  )
  OR
  -- Team members with client portal roles can access their projects
  EXISTS (
    SELECT 1 FROM public.project_team_members ptm
    WHERE ptm.project_id = _project_id
    AND ptm.user_id = _user_id
    AND LOWER(ptm.role) IN ('client', 'owner', 'project_manager', 'manager', 'admin')
  )
$$;

-- Add client portal SELECT policy for project photos
-- This allows client portal users to view photos for projects they have access to
CREATE POLICY "Client portal users can view project photos"
  ON public.project_photos FOR SELECT
  USING (has_client_portal_photo_access(auth.uid(), project_id));

-- ============================================================================
-- Documentation
-- ============================================================================

COMMENT ON FUNCTION public.has_client_portal_photo_access(_user_id uuid, _project_id uuid)
IS 'Checks if user has client portal access to view project photos. Allows admins and team members with client portal roles (client, owner, project_manager, manager, admin).';

COMMENT ON POLICY "Client portal users can view project photos" ON public.project_photos
IS 'Allows client portal authenticated users to view photos for projects they have access to through the client portal.';