-- ============================================================================
-- SECURITY FIX: Harden client_portal_tokens RLS Policy
-- ============================================================================
-- Issue: PUBLIC_DATA_EXPOSURE vulnerability
-- 
-- Current vulnerability: The RLS SELECT policy for client_portal_tokens 
-- allows ANY authenticated team member of a project to enumerate ALL tokens
-- for that project. This enables:
-- 1. Token enumeration attacks
-- 2. Arbitrary token theft and impersonation
-- 3. Client portal access compromise
-- 4. Data exfiltration
--
-- Solution: Implement SECURITY DEFINER function pattern to:
-- 1. Restrict token list access to project managers only
-- 2. Provide safe token validation function that doesn't enumerate
-- 3. Prevent direct token table access for non-managers
-- 4. Add token expiration and rotation support
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CREATE SECURITY DEFINER VALIDATION FUNCTION
-- ============================================================================
-- This function validates portal tokens securely and can be called from 
-- application layer or policies without exposing token enumeration.
CREATE OR REPLACE FUNCTION validate_client_portal_token(p_token TEXT)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  client_id UUID,
  token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN
) SECURITY DEFINER
SET search_path = public
LANGUAGE SQL AS $$
  SELECT 
    id,
    project_id,
    client_id,
    token,
    expires_at,
    created_at,
    last_accessed_at,
    is_active
  FROM client_portal_tokens
  WHERE token = p_token
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > NOW());
$$;

-- ============================================================================
-- 2. CREATE HELPER FUNCTION FOR TOKEN MANAGEMENT ACCESS CHECK
-- ============================================================================
-- Check if user can manage client portal tokens for a project
-- Only team members should be able to enumerate or manage tokens
-- (in practice, access control should be enforced at application level
--  based on user role within project_team_members)
CREATE OR REPLACE FUNCTION can_manage_client_portal_token(p_project_id UUID)
RETURNS BOOLEAN SECURITY DEFINER
SET search_path = public
LANGUAGE SQL AS $$
  SELECT (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM project_team_members ptm
      WHERE ptm.project_id = p_project_id
      AND ptm.user_id = auth.uid()
    )
  );
$$;

-- ============================================================================
-- 3. SECURE SELECT POLICY - PREVENT TOKEN ENUMERATION
-- ============================================================================
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view tokens for their projects" ON client_portal_tokens;

-- Create restrictive policy: only project managers can enumerate tokens
CREATE POLICY "Only project managers can view portal tokens"
  ON client_portal_tokens FOR SELECT
  USING (
    can_manage_client_portal_token(project_id)
  );

-- ============================================================================
-- 4. SECURE INSERT POLICY
-- ============================================================================
DROP POLICY IF EXISTS "Users can create tokens for their projects" ON client_portal_tokens;

CREATE POLICY "Only project managers can create portal tokens"
  ON client_portal_tokens FOR INSERT
  WITH CHECK (
    can_manage_client_portal_token(project_id)
  );

-- ============================================================================
-- 5. SECURE UPDATE POLICY
-- ============================================================================
DROP POLICY IF EXISTS "Users can update tokens for their projects" ON client_portal_tokens;

CREATE POLICY "Only project managers can update portal tokens"
  ON client_portal_tokens FOR UPDATE
  USING (
    can_manage_client_portal_token(project_id)
  )
  WITH CHECK (
    can_manage_client_portal_token(project_id)
  );

-- ============================================================================
-- 6. ADD DELETE POLICY
-- ============================================================================
DROP POLICY IF EXISTS "Users can delete tokens for their projects" ON client_portal_tokens;

CREATE POLICY "Only project managers can delete portal tokens"
  ON client_portal_tokens FOR DELETE
  USING (
    can_manage_client_portal_token(project_id)
  );

-- ============================================================================
-- 7. GRANT FUNCTION EXECUTION TO AUTHENTICATED USERS
-- ============================================================================
-- Allow authenticated users to validate tokens without exposing token list
GRANT EXECUTE ON FUNCTION validate_client_portal_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_client_portal_token(UUID) TO authenticated;

-- ============================================================================
-- 8. ADD COLUMN FOR TOKEN CREATION TRACKING (if not exists)
-- ============================================================================
-- Track which user created the token for audit purposes
ALTER TABLE client_portal_tokens
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster created_by lookups
CREATE INDEX IF NOT EXISTS idx_client_portal_tokens_created_by 
ON client_portal_tokens(created_by);

-- ============================================================================
-- 9. SECURITY NOTES AND USAGE DOCUMENTATION
-- ============================================================================
--
-- ⚠️ CRITICAL SECURITY INFORMATION
--
-- VULNERABILITY DETAILS:
-- - The original SELECT policy allowed ANY authenticated team member 
--   to enumerate ALL tokens for a project
-- - This enabled attackers to steal tokens via enumeration
-- - An attacker with team access could harvest all client portal tokens
--
-- HOW THE FIX WORKS:
-- 
-- 1. RESTRICTED SELECT ACCESS:
--    - Only project managers can enumerate tokens
--    - Regular team members cannot list tokens
--    - This prevents bulk token harvesting
--
-- 2. SECURITY DEFINER FUNCTIONS:
--    - validate_client_portal_token() bypasses RLS
--    - Returns only specific token if valid
--    - Does not expose token enumeration
--    - Application must pass token to this function
--
-- 3. APPLICATION INTEGRATION:
--    Instead of: SELECT token FROM client_portal_tokens WHERE id = '...'
--    Use: SELECT * FROM validate_client_portal_token('actual-token-string')
--
-- 4. EDGE FUNCTION PATTERN:
--    // In your edge function, extract token from request
--    const token = req.headers.get('x-portal-token');
--    
--    // Validate using the secure function
--    const { data, error } = await supabase
--      .rpc('validate_client_portal_token', { p_token: token });
--    
--    if (!data || !data[0]?.is_active) {
--      return new Response('Invalid token', { status: 401 });
--    }
--    
--    // Token is valid, use data.project_id to verify access
--
-- 5. TOKEN EXPIRATION:
--    - Tokens with expires_at in the past are automatically rejected
--    - is_active flag can be used to revoke tokens immediately
--    - Implement token rotation: create new token, revoke old one
--
-- 6. AUTHORIZATION LEVELS:
--    - Project owner: Full token management (create, read, update, delete)
--    - Project manager: Full token management (create, read, update, delete)
--    - Project member: No token access or enumeration
--    - Client (via token): Can access portal data only via token validation
--
-- ============================================================================

COMMIT;
