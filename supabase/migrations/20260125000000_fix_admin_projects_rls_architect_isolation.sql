-- ============================================================================
-- Fix Admin Projects RLS to Respect Architect Isolation
-- Migration: 20260125000000
-- Description:
-- The "Admins can manage all records" policy on projects table allows admins
-- to SELECT all projects, bypassing the architect isolation protection.
-- This migration removes SELECT from that policy and ensures all SELECT
-- operations go through has_project_access which respects architect isolation.
-- ============================================================================

BEGIN;

-- ============================================================================
-- DROP THE PROBLEMATIC POLICY
-- ============================================================================
-- Drop the "Admins can manage all records" policy that bypasses architect isolation
DROP POLICY IF EXISTS "Admins can manage all records" ON public.projects;

-- ============================================================================
-- CREATE SEPARATE POLICIES FOR NON-SELECT OPERATIONS
-- ============================================================================
-- Admins can INSERT projects (but SELECT is controlled by has_project_access)
DROP POLICY IF EXISTS "Admins can insert records" ON public.projects;
CREATE POLICY "Admins can insert records"
  ON public.projects FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can UPDATE projects (but SELECT is controlled by has_project_access)
-- Note: UPDATE still uses has_project_admin_access which respects architect isolation
-- This policy is redundant but kept for consistency
DROP POLICY IF EXISTS "Admins can update all projects" ON public.projects;
CREATE POLICY "Admins can update all projects"
  ON public.projects FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can DELETE projects (but SELECT is controlled by has_project_access)
-- Note: DELETE still uses has_project_admin_access which respects architect isolation
-- This policy is redundant but kept for consistency
DROP POLICY IF EXISTS "Admins can delete all projects" ON public.projects;
CREATE POLICY "Admins can delete all projects"
  ON public.projects FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- VERIFY SELECT POLICIES USE has_project_access
-- ============================================================================
-- Ensure all SELECT policies use has_project_access (which respects architect isolation)
-- The existing "Users can view accessible projects" policy already uses has_project_access
-- The existing "project_scoped_select_projects" policy also uses has_project_access

-- Add comment explaining the policy structure
COMMENT ON POLICY "Users can view accessible projects" ON public.projects IS
'Controls SELECT access to projects. Uses has_project_access which respects architect isolation:
- Admins CANNOT see architect-owned projects unless explicitly granted access
- Only project owners and users with explicit project_access_grants can see architect-owned projects
- Admins CAN see non-architect projects';

COMMIT;
