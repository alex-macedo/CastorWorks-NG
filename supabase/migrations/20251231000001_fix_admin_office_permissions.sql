-- Fix admin_office permissions to only access via project_team_members table
-- Migration: 20251231000001_fix_admin_office_permissions.sql
-- Description:
-- 1. Remove admin_office from global access in user_has_project_access function
-- 2. Ensure admin_office role only gets access via project_team_members table
-- 3. Update has_project_access wrapper function accordingly

BEGIN;

-- Update user_has_project_access to remove admin_office from global access
CREATE OR REPLACE FUNCTION public.user_has_project_access(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_is_project_manager BOOLEAN;
  v_is_admin_office BOOLEAN;
BEGIN
  -- Check user roles once to avoid multiple queries
  SELECT
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'admin'),
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'project_manager'),
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'admin_office')
  INTO v_is_admin, v_is_project_manager, v_is_admin_office;

  -- FAST PATH: Admins can access all projects
  IF v_is_admin THEN
    RETURN TRUE;
  END IF;

  -- Project managers can access all projects
  IF v_is_project_manager THEN
    RETURN TRUE;
  END IF;

  -- Admin office users can ONLY access projects via team membership
  IF v_is_admin_office THEN
    RETURN EXISTS (
      SELECT 1 FROM public.project_team_members
      WHERE project_id = p_project_id AND user_id = p_user_id
    );
  END IF;

  -- For all other users, check standard access paths
  RETURN (
    -- Project owners
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = p_project_id AND owner_id = p_user_id
    )
    OR
    -- Explicit client access (by individual user link)
    EXISTS (
      SELECT 1 FROM public.client_project_access
      WHERE project_id = p_project_id AND user_id = p_user_id
    )
    OR
    -- Team member access
    EXISTS (
      SELECT 1 FROM public.project_team_members
      WHERE project_id = p_project_id AND user_id = p_user_id
    )
    OR
    -- Access via client organization (If project belongs to a client, all users linked to that client see it)
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.client_project_access cpa ON cpa.client_id = p.client_id
      WHERE p.id = p_project_id AND cpa.user_id = p_user_id
    )
  );
END;
$$;

-- Update has_project_access wrapper (no changes needed, just ensure it calls the updated function)
CREATE OR REPLACE FUNCTION public.has_project_access(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN public.user_has_project_access(_project_id, _user_id);
END;
$$;

-- Update has_project_admin_access to match: admin_office should NOT have admin access to all projects
CREATE OR REPLACE FUNCTION public.has_project_admin_access(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Only admins and project managers have admin access to all projects
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role IN ('admin', 'project_manager')
  )
  OR
  -- Project owners can admin their own projects
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id AND owner_id = _user_id
  )
$$;

-- Add comment explaining the permission model
COMMENT ON FUNCTION public.user_has_project_access(UUID, UUID) IS
'Permission model:
- admin: Full access to ALL projects
- project_manager: Full access to ALL projects
- admin_office: Access ONLY via project_team_members table
- other users: Standard access via ownership, client links, or team membership';

COMMIT;</content>
<parameter name="filePath">supabase/migrations/20251231000001_fix_admin_office_permissions.sql