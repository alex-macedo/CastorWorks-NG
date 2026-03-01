-- Fix user_has_project_access function to avoid invalid enum values and recursion
-- Migration: 20251230000004
-- Description: 
-- 1. Fixes app_role enum comparison by removing 'manager' which doesn't exist.
-- 2. Adds SET search_path to ensure security and table resolution.
-- 3. Optimizes admin path to return early and avoid any database recursion.

BEGIN;

CREATE OR REPLACE FUNCTION public.user_has_project_access(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_internal BOOLEAN;
BEGIN
  -- 1. FAST PATH: Check if user is an admin or internal staff
  -- This bypasses any further checks on the projects table itself, preventing recursion.
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id 
    AND role IN ('admin'::public.app_role, 'project_manager'::public.app_role, 'admin_office'::public.app_role, 'site_supervisor'::public.app_role)
  ) INTO v_is_internal;

  IF v_is_internal THEN
    RETURN TRUE;
  END IF;

  -- 2. Check for explicit or direct access
  -- We check:
  -- a) Project owner
  -- b) Explicit client access link
  -- c) Team membership record
  -- d) Access via client organization
  RETURN (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = p_project_id AND owner_id = p_user_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.client_project_access 
      WHERE project_id = p_project_id AND user_id = p_user_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.project_team_members 
      WHERE project_id = p_project_id AND user_id = p_user_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.client_project_access cpa ON cpa.client_id = p.client_id
      WHERE p.id = p_project_id AND cpa.user_id = p_user_id
    )
  );
END;
$$;

COMMIT;
