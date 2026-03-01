-- ============================================================================
-- Fix user_has_project_access: Remove reference to non-existent project_access_grants table
-- Migration: 20260126000003
-- Description: 
-- The user_has_project_access function references a table 'project_access_grants' 
-- that doesn't exist, causing RLS to fail. This migration fixes the function
-- to use existing tables (client_project_access, project_team_members) instead.
-- ============================================================================

BEGIN;

-- ============================================================================
-- FIX user_has_project_access FUNCTION
-- ============================================================================
-- Replace the function to remove the reference to project_access_grants
-- and use client_project_access and project_team_members instead
-- We need to drop and recreate because of ownership issues

DROP FUNCTION IF EXISTS public.user_has_project_access(UUID, UUID) CASCADE;

CREATE FUNCTION public.user_has_project_access(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_global_admin BOOLEAN;
  v_is_internal BOOLEAN;
  v_project_owner_id UUID;
  v_owner_is_architect BOOLEAN;
BEGIN
  IF p_project_id IS NULL OR p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- GLOBAL ADMIN: Check first - bypasses architect isolation and has access to ALL projects
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'global_admin'::public.app_role
  ) INTO v_is_global_admin;
  IF v_is_global_admin THEN
    RETURN TRUE;
  END IF;

  -- Get project owner
  SELECT owner_id INTO v_project_owner_id
  FROM public.projects
  WHERE id = p_project_id;

  -- Check if owner is architect (architect isolation)
  IF v_project_owner_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1
      FROM public.user_roles
      WHERE user_id = v_project_owner_id
        AND role = 'architect'::public.app_role
    ) INTO v_owner_is_architect;

    IF v_owner_is_architect THEN
      -- For architect projects, check ownership, client_project_access, or project_team_members
      -- FIXED: Removed reference to non-existent project_access_grants table
      RETURN (
        v_project_owner_id = p_user_id
        OR
        EXISTS(
          SELECT 1 FROM public.client_project_access
          WHERE project_id = p_project_id AND user_id = p_user_id
        )
        OR
        EXISTS(
          SELECT 1 FROM public.project_team_members
          WHERE project_id = p_project_id AND user_id = p_user_id
        )
      );
    END IF;
  END IF;

  -- For non-architect projects: admin/PM/internal staff
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id
    AND role IN ('admin'::public.app_role, 'project_manager'::public.app_role, 'admin_office'::public.app_role, 'site_supervisor'::public.app_role)
  ) INTO v_is_internal;

  IF v_is_internal THEN
    RETURN TRUE;
  END IF;

  -- Others: ownership, explicit client access, team membership, or client organization access
  RETURN (
    v_project_owner_id = p_user_id
    OR
    EXISTS(
      SELECT 1 FROM public.client_project_access
      WHERE project_id = p_project_id AND user_id = p_user_id
    )
    OR
    EXISTS(
      SELECT 1 FROM public.project_team_members
      WHERE project_id = p_project_id AND user_id = p_user_id
    )
    OR
    EXISTS(
      SELECT 1 FROM public.projects p
      JOIN public.client_project_access cpa ON cpa.client_id = p.client_id
      WHERE p.id = p_project_id AND cpa.user_id = p_user_id
    )
  );
END;
$$;

COMMENT ON FUNCTION public.user_has_project_access(UUID, UUID) IS
'Checks project access. global_admin has access to all projects. Architect-owned projects require ownership, client_project_access, or project_team_members. Admins do NOT have automatic access to architect projects. FIXED: Removed reference to non-existent project_access_grants table.';

COMMIT;
