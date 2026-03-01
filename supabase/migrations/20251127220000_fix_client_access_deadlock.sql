-- Migration: fix_client_access_deadlock
-- Purpose: Fix infinite recursion in project_team_members RLS policies
-- using deadlock-safe approach
-- Issue: ERROR 42P17 - infinite recursion detected in policy for relation "project_team_members"

-- IMPORTANT: Run each section separately if you encounter deadlocks

-- ============================================
-- SECTION 1: Drop old problematic policies
-- ============================================
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

-- ============================================
-- SECTION 2: Create new non-recursive SELECT policy
-- ============================================
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

-- ============================================
-- SECTION 3: Create new non-recursive INSERT policy
-- ============================================
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

-- ============================================
-- SECTION 4: Create new non-recursive UPDATE policy
-- ============================================
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

-- ============================================
-- SECTION 5: Create new non-recursive DELETE policy
-- ============================================
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

-- ============================================
-- SECTION 6: Drop old client portal token policies
-- ============================================
DROP POLICY IF EXISTS "authenticated_select_client_portal_tokens" ON public.client_portal_tokens;

DROP POLICY IF EXISTS "Client portal access" ON public.client_portal_tokens;

-- ============================================
-- SECTION 7: Create new client portal access policy
-- ============================================
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
        -- Check if user is project_manager or admin in team
        OR EXISTS (
          SELECT 1 FROM public.project_team_members ptm
          WHERE ptm.project_id = p.id
          AND ptm.user_id = auth.uid()
          AND ptm.role IN ('admin', 'project_manager', 'manager')
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
