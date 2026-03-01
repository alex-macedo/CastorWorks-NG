-- =====================================================
-- FIX: Infinite Recursion in project_team_members RLS
-- =====================================================
-- The previous migration caused infinite recursion because
-- the policy on project_team_members was querying itself.
--
-- This fix uses direct checks without subqueries to avoid recursion.
-- =====================================================

-- Drop the recursive policies
DROP POLICY IF EXISTS "Team members can view project team" ON project_team_members;
DROP POLICY IF EXISTS "Project managers can manage team directory" ON project_team_members;

-- =====================================================
-- FIXED: Direct check policies without recursion
-- =====================================================

-- Allow users to view team members of projects they belong to
-- Uses direct check: user_id = auth.uid() OR project ownership
CREATE POLICY "Users can view their own team member record"
  ON project_team_members FOR SELECT
  TO authenticated
  USING (
    -- User can see their own record
    user_id = auth.uid()
    OR
    -- User can see team members if they own the project
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
    OR
    -- Global admins can see all
    public.has_role(auth.uid(), 'admin')
  );

-- Allow viewing of visible team members (for client portal)
CREATE POLICY "Authenticated users can view visible team members"
  ON project_team_members FOR SELECT
  TO authenticated
  USING (
    is_visible_to_client = true
  );

-- Allow project owners and admins to manage team directory
CREATE POLICY "Project owners can manage team directory"
  ON project_team_members FOR ALL
  TO authenticated
  USING (
    -- User owns the project
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
    OR
    -- Global admins
    public.has_role(auth.uid(), 'admin')
  );

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
