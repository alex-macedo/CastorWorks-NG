-- Migration: fix_client_access_infinite_recursion
-- Purpose: Fix infinite recursion in project_team_members RLS policies
-- and add RLS policies for client portal access
-- Issue: ERROR 42P17 - infinite recursion detected in policy for relation "project_team_members"

BEGIN;

-- Step 1: Drop ALL conflicting policies on project_team_members to clear recursion
DROP POLICY IF EXISTS "project_scoped_select_team_members" ON public.project_team_members;
DROP POLICY IF EXISTS "project_scoped_insert_team_members" ON public.project_team_members;
DROP POLICY IF EXISTS "project_scoped_update_team_members" ON public.project_team_members;
DROP POLICY IF EXISTS "project_scoped_delete_team_members" ON public.project_team_members;
DROP POLICY IF EXISTS "project_scoped_manage_team_members" ON public.project_team_members;
DROP POLICY IF EXISTS "Project members can view team members" ON public.project_team_members;
DROP POLICY IF EXISTS "Project owners can add themselves" ON public.project_team_members;
DROP POLICY IF EXISTS "Project managers can update team members" ON public.project_team_members;
DROP POLICY IF EXISTS "Project managers can delete team members" ON public.project_team_members;
DROP POLICY IF EXISTS "Authenticated users can view team members" ON public.project_team_members;
DROP POLICY IF EXISTS "Authenticated users can manage team members" ON public.project_team_members;
DROP POLICY IF EXISTS "Anyone can view team members" ON public.project_team_members;
DROP POLICY IF EXISTS "Anyone can insert team members" ON public.project_team_members;
DROP POLICY IF EXISTS "Anyone can update team members" ON public.project_team_members;
DROP POLICY IF EXISTS "Anyone can delete team members" ON public.project_team_members;

-- Step 2: Create non-recursive policies for project_team_members
-- These avoid calling has_project_access() which would cause infinite recursion
-- SELECT: allow if:
--   - user_id matches auth.uid() (can see own membership)
--   - user is project owner
--   - user is admin
CREATE POLICY "project_team_members_select"
  ON public.project_team_members FOR SELECT
  TO authenticated
  USING (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_team_members.project_id
      AND p.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- INSERT: allow only project owner or admin
CREATE POLICY "project_team_members_insert"
  ON public.project_team_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_team_members.project_id
      AND p.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- UPDATE: allow user to update own row, or project owner/admin to update any
CREATE POLICY "project_team_members_update"
  ON public.project_team_members FOR UPDATE
  TO authenticated
  USING (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_team_members.project_id
      AND p.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_team_members.project_id
      AND p.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- DELETE: allow only project owner or admin
CREATE POLICY "project_team_members_delete"
  ON public.project_team_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_team_members.project_id
      AND p.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- Step 3: Add RLS policy for client_portal_tokens to allow authenticated access
-- for portal users (admin, project_manager, client roles)
DROP POLICY IF EXISTS "authenticated_select_client_portal_tokens" ON public.client_portal_tokens;
DROP POLICY IF EXISTS "Client portal access" ON public.client_portal_tokens;

CREATE POLICY "Client portal access"
  ON public.client_portal_tokens FOR SELECT
  TO authenticated
  USING (
    -- Admin can see all tokens
    public.has_role(auth.uid(), 'admin')
    -- Project managers and project owners can see tokens for their projects
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = client_portal_tokens.project_id
      AND (
        p.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.project_team_members ptm
          WHERE ptm.project_id = p.id
          AND ptm.user_id = auth.uid()
          AND ptm.access_role IN ('admin'::app_role, 'project_manager'::app_role)
        )
      )
    )
    -- Clients can see their own project tokens
    OR client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.client_project_access cpa
      WHERE cpa.project_id = client_portal_tokens.project_id
      AND cpa.user_id = auth.uid()
    )
  );

COMMIT;

-- Notes:
-- 1. The infinite recursion was caused by policies on project_team_members
--    calling has_project_access() which itself queries project_team_members.
-- 2. New policies use direct table queries instead of helper functions to avoid recursion.
-- 3. Client portal tokens can be accessed by:
--    - Admins (all tokens)
--    - Project managers and owners (tokens for their projects)
--    - Clients with access to the project
