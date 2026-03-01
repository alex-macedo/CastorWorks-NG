-- ============================================================================
-- SECURITY FIX: Harden architect_client_portal_tokens RLS Policy
-- ============================================================================
-- Issue: Current SELECT policy allows token enumeration by any authenticated user
-- Solution: Create SECURITY DEFINER validation function and restrict SELECT to 
--           token creators/project managers only. Public access uses token lookup.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CREATE SECURITY DEFINER VALIDATION FUNCTION
-- ============================================================================
-- This function validates portal tokens securely and can be called from 
-- application layer or policies without exposing token enumeration.
CREATE OR REPLACE FUNCTION validate_architect_portal_token(p_token TEXT)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  is_valid BOOLEAN
) SECURITY DEFINER
SET search_path = public
LANGUAGE SQL AS $$
  SELECT 
    id,
    project_id,
    token,
    expires_at,
    created_at,
    (expires_at IS NULL OR expires_at > NOW()) AS is_valid
  FROM architect_client_portal_tokens
  WHERE token = p_token
  AND (expires_at IS NULL OR expires_at > NOW());
$$;

-- ============================================================================
-- 2. CREATE HELPER FUNCTION FOR TOKEN OWNERSHIP CHECK
-- ============================================================================
-- Check if user created the token or has project management access
CREATE OR REPLACE FUNCTION can_manage_architect_portal_token(p_project_id UUID)
RETURNS BOOLEAN SECURITY DEFINER
SET search_path = public
LANGUAGE SQL AS $$
  SELECT (
    -- User has project access
    has_project_access(auth.uid(), p_project_id)
    -- AND is a project manager or higher
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = p_project_id
      AND (
        p.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM project_team_members ptm
          WHERE ptm.project_id = p.id
          AND ptm.user_id = auth.uid()
          AND ptm.role IN ('project_manager', 'admin')
        )
      )
    )
  );
$$;

-- ============================================================================
-- 3. HARDEN SELECT POLICY - PREVENT TOKEN ENUMERATION
-- ============================================================================
-- Only project managers and creators can enumerate tokens for a project
DROP POLICY IF EXISTS "Users can view portal tokens for accessible projects" ON architect_client_portal_tokens;
CREATE POLICY "Users can view portal tokens for accessible projects"
  ON architect_client_portal_tokens FOR SELECT
  USING (
    -- Only project owners or managers can enumerate tokens
    has_project_access(auth.uid(), project_id)
    AND can_manage_architect_portal_token(project_id)
  );

-- ============================================================================
-- 4. GRANT FUNCTION EXECUTION TO AUTHENTICATED USERS
-- ============================================================================
-- Allow authenticated users to validate tokens without exposing token list
GRANT EXECUTE ON FUNCTION validate_architect_portal_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_architect_portal_token(UUID) TO authenticated;

-- ============================================================================
-- 5. UPDATE INSERT POLICY - REQUIRE EXPLICIT TOKEN MANAGEMENT ACCESS
-- ============================================================================
DROP POLICY IF EXISTS "Users can create portal tokens" ON architect_client_portal_tokens;
CREATE POLICY "Users can create portal tokens"
  ON architect_client_portal_tokens FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND has_project_access(auth.uid(), project_id)
    AND can_manage_architect_portal_token(project_id)
  );

-- ============================================================================
-- 6. UPDATE DELETE POLICY - REQUIRE EXPLICIT TOKEN MANAGEMENT ACCESS
-- ============================================================================
DROP POLICY IF EXISTS "Users can delete portal tokens" ON architect_client_portal_tokens;
CREATE POLICY "Users can delete portal tokens"
  ON architect_client_portal_tokens FOR DELETE
  USING (
    has_project_access(auth.uid(), project_id)
    AND can_manage_architect_portal_token(project_id)
  );

-- ============================================================================
-- 7. ADD UPDATE POLICY - MAINTAIN TOKEN CONSISTENCY
-- ============================================================================
DROP POLICY IF EXISTS "Users can update portal tokens" ON architect_client_portal_tokens;
CREATE POLICY "Users can update portal tokens"
  ON architect_client_portal_tokens FOR UPDATE
  USING (
    has_project_access(auth.uid(), project_id)
    AND can_manage_architect_portal_token(project_id)
  )
  WITH CHECK (
    has_project_access(auth.uid(), project_id)
    AND can_manage_architect_portal_token(project_id)
  );

-- ============================================================================
-- 8. SECURITY NOTES
-- ============================================================================
-- 
-- WHY SECURITY DEFINER?
-- - Functions marked SECURITY DEFINER execute with the creator's privileges
-- - This allows the function to query tokens without exposing enumeration
-- - Only the function output is returned to authenticated users
--
-- PUBLIC ACCESS PATTERN:
-- - Instead of SELECT * WHERE token = '...', use validate_architect_portal_token()
-- - This returns only the specific token (if valid) without enumerating
-- - Application layer should pass portal_token from JWT claims to this function
--
-- EXAMPLE USAGE FROM EDGE FUNCTION:
-- SELECT * FROM validate_architect_portal_token(
--   current_setting('request.jwt.claims', true)::json->>'portal_token'
-- );
--
-- AUTHORIZATION LEVELS:
-- - Project owner: Full token management (create, read, update, delete)
-- - Project manager: Full token management (create, read, update, delete)
-- - Project member: No token enumeration/management
-- - Admin: Full system access (via has_role)
--

COMMIT;
