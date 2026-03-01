-- Migration: Update RLS on client_portal_tokens to allow client access
-- Description: Allows users in client_project_access to view tokens for their projects

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view tokens for their projects" ON client_portal_tokens;

-- Create the updated policy
CREATE POLICY "Users can view tokens for their projects"
  ON client_portal_tokens FOR SELECT
  USING (
    project_id IN (
      -- Projects where user is a team member
      SELECT project_id FROM project_team_members 
      WHERE user_id = auth.uid()
      
      UNION
      
      -- Projects where user is a client
      SELECT project_id FROM client_project_access 
      WHERE user_id = auth.uid()
    )
  );

-- Also ensure client_project_access has RLS enabled and policies (it should, but good to verify)
ALTER TABLE client_project_access ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own access records
DROP POLICY IF EXISTS "Users can view their own client access" ON client_project_access;
CREATE POLICY "Users can view their own client access"
  ON client_project_access FOR SELECT
  USING (user_id = auth.uid());

-- Policy for admins/team members to view client access records
DROP POLICY IF EXISTS "Team members can view client access" ON client_project_access;
CREATE POLICY "Team members can view client access"
  ON client_project_access FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_team_members 
      WHERE user_id = auth.uid()
    )
  );
