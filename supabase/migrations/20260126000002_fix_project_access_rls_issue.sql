-- ============================================================================
-- Fix Project Access RLS Issue
-- Migration: 20260126000002
-- Description: 
-- Fixes the issue where users can't see projects even though they've been
-- added to project_team_members. The problem is that:
-- 1. The has_project_access wrapper function may be missing
-- 2. The user_has_project_access function checks project_team_members, but
--    needs to ensure it can access the table even with RLS enabled
-- 3. The function should use SECURITY DEFINER to bypass RLS when checking
--    project_team_members
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ENSURE has_project_access WRAPPER FUNCTION EXISTS
-- ============================================================================
-- The wrapper function is critical because the projects table RLS policy
-- calls has_project_access(auth.uid(), id), which must call
-- user_has_project_access(_project_id, _user_id) with swapped parameters

CREATE OR REPLACE FUNCTION public.has_project_access(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Call user_has_project_access with swapped parameters
  -- user_has_project_access expects (p_project_id, p_user_id)
  RETURN public.user_has_project_access(_project_id, _user_id);
END;
$$;

COMMENT ON FUNCTION public.has_project_access(uuid, uuid) IS
'Wrapper function for user_has_project_access. Projects table RLS policies call this function. Swaps parameter order to match user_has_project_access signature.';

-- ============================================================================
-- 2. VERIFY user_has_project_access CAN ACCESS project_team_members
-- ============================================================================
-- The function is already SECURITY DEFINER, which should bypass RLS.
-- However, let's ensure the function explicitly handles the case where
-- project_team_members.user_id might be NULL or the check might fail.

-- The current implementation in 20260125000003 already checks project_team_members
-- correctly. The issue might be that:
-- 1. The user_id in project_team_members doesn't match auth.uid()
-- 2. The record exists but user_id is NULL
-- 3. There's a data type mismatch

-- Note: Function comment cannot be updated without ownership, but the function
-- already has proper documentation in previous migrations.

-- ============================================================================
-- 3. VERIFY PROJECTS TABLE RLS POLICY
-- ============================================================================
-- Ensure the projects table SELECT policy uses has_project_access correctly

DO $$
BEGIN
  -- Check if the policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'projects' 
      AND policyname = 'Users can view accessible projects'
      AND cmd = 'SELECT'
  ) THEN
    -- Create the policy if it doesn't exist
    CREATE POLICY "Users can view accessible projects"
      ON public.projects FOR SELECT
      USING (has_project_access(auth.uid(), id));
    
    RAISE NOTICE 'Created missing "Users can view accessible projects" policy';
  ELSE
    RAISE NOTICE 'Policy "Users can view accessible projects" already exists';
  END IF;
END $$;

-- ============================================================================
-- 4. ADD HELPER FUNCTION TO DIAGNOSE ACCESS ISSUES
-- ============================================================================
-- This function helps diagnose why a user can't see a project

CREATE OR REPLACE FUNCTION public.diagnose_project_access(
  p_user_id UUID,
  p_project_id UUID
)
RETURNS TABLE (
  check_type TEXT,
  check_result BOOLEAN,
  details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_is_global_admin BOOLEAN;
  v_is_internal BOOLEAN;
  v_project_owner_id UUID;
  v_owner_is_architect BOOLEAN;
  v_has_team_membership BOOLEAN;
  v_has_client_access BOOLEAN;
  v_has_client_org_access BOOLEAN;
BEGIN
  -- Check global_admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'global_admin'::public.app_role
  ) INTO v_is_global_admin;
  
  RETURN QUERY SELECT 
    'global_admin'::TEXT,
    v_is_global_admin,
    CASE WHEN v_is_global_admin THEN 'User is global_admin - has access to all projects'
         ELSE 'User is not global_admin' END;
  
  -- Get project owner
  SELECT owner_id INTO v_project_owner_id
  FROM public.projects
  WHERE id = p_project_id;
  
  -- Check if owner is architect
  IF v_project_owner_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1
      FROM public.user_roles
      WHERE user_id = v_project_owner_id
        AND role = 'architect'::public.app_role
    ) INTO v_owner_is_architect;
    
    RETURN QUERY SELECT 
      'architect_isolation'::TEXT,
      v_owner_is_architect,
      CASE WHEN v_owner_is_architect THEN 'Project owner is architect - access restricted'
           ELSE 'Project owner is not architect' END;
    
    IF v_owner_is_architect THEN
      RETURN QUERY SELECT 
        'is_project_owner'::TEXT,
        v_project_owner_id = p_user_id,
        CASE WHEN v_project_owner_id = p_user_id THEN 'User is project owner'
             ELSE format('Project owner is %s, user is %s', v_project_owner_id, p_user_id) END;
      
      RETURN QUERY SELECT 
        'has_explicit_grant'::TEXT,
        EXISTS(
          SELECT 1 FROM public.project_access_grants
          WHERE project_id = p_project_id AND granted_to_user_id = p_user_id
        ),
        'Checking project_access_grants table';
      
      RETURN;
    END IF;
  END IF;
  
  -- Check internal roles
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id
    AND role IN ('admin'::public.app_role, 'project_manager'::public.app_role, 'admin_office'::public.app_role, 'site_supervisor'::public.app_role)
  ) INTO v_is_internal;
  
  RETURN QUERY SELECT 
    'internal_role'::TEXT,
    v_is_internal,
    CASE WHEN v_is_internal THEN 'User has internal role - has access to non-architect projects'
         ELSE 'User does not have internal role' END;
  
  -- Check project ownership
  RETURN QUERY SELECT 
    'is_project_owner'::TEXT,
    v_project_owner_id = p_user_id,
    CASE WHEN v_project_owner_id = p_user_id THEN 'User is project owner'
         WHEN v_project_owner_id IS NULL THEN 'Project has no owner_id set'
         ELSE format('Project owner is %s, user is %s', v_project_owner_id, p_user_id) END;
  
  -- Check client_project_access
  SELECT EXISTS (
    SELECT 1 FROM public.client_project_access
    WHERE project_id = p_project_id AND user_id = p_user_id
  ) INTO v_has_client_access;
  
  RETURN QUERY SELECT 
    'client_project_access'::TEXT,
    v_has_client_access,
    CASE WHEN v_has_client_access THEN 'User found in client_project_access table'
         ELSE 'User NOT found in client_project_access table' END;
  
  -- Check project_team_members
  SELECT EXISTS (
    SELECT 1 FROM public.project_team_members
    WHERE project_id = p_project_id AND user_id = p_user_id
  ) INTO v_has_team_membership;
  
  RETURN QUERY SELECT 
    'project_team_members'::TEXT,
    v_has_team_membership,
    CASE 
      WHEN v_has_team_membership THEN 'User found in project_team_members table'
      ELSE format('User NOT found in project_team_members. Checking for records with project_id=%s...', p_project_id)
    END;
  
  -- Also check if there are any records with NULL user_id or different user_id
  RETURN QUERY SELECT 
    'project_team_members_details'::TEXT,
    EXISTS(SELECT 1 FROM public.project_team_members WHERE project_id = p_project_id),
    format('Found %s total records in project_team_members for this project. Checking user_id values...',
      (SELECT COUNT(*) FROM public.project_team_members WHERE project_id = p_project_id));
  
  -- Check client organization access
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.client_project_access cpa ON cpa.client_id = p.client_id
    WHERE p.id = p_project_id AND cpa.user_id = p_user_id
  ) INTO v_has_client_org_access;
  
  RETURN QUERY SELECT 
    'client_organization_access'::TEXT,
    v_has_client_org_access,
    CASE WHEN v_has_client_org_access THEN 'User has access via client organization'
         ELSE 'User does NOT have access via client organization' END;
  
  -- Final result
  RETURN QUERY SELECT 
    'final_result'::TEXT,
    public.user_has_project_access(p_project_id, p_user_id),
    'Result from user_has_project_access function';
END;
$$;

COMMENT ON FUNCTION public.diagnose_project_access(UUID, UUID) IS
'Diagnostic function to help identify why a user cannot access a project. Returns detailed check results for each access method.';

COMMIT;
