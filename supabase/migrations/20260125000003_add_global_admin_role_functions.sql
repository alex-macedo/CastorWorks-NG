-- ============================================================================
-- Add Global Admin Role (Part 2/2): Column, trigger, and functions
-- Migration: 20260125000003
-- Depends on: 20260125000002 (global_admin must exist in app_role)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ADD is_support_user COLUMN TO user_profiles
-- ============================================================================
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_support_user BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.user_profiles.is_support_user IS 'When true, user can be assigned global_admin role (CastorWorks support staff).';

-- ============================================================================
-- 2. TRIGGER: Enforce global_admin only for support users
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_global_admin_support_user()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role = 'global_admin'::public.app_role THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = NEW.user_id
      AND is_support_user = TRUE
    ) THEN
      RAISE EXCEPTION 'global_admin role can only be assigned to support users. User must have is_support_user = TRUE in user_profiles.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_global_admin_support_user ON public.user_roles;
CREATE TRIGGER trg_check_global_admin_support_user
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_global_admin_support_user();

-- ============================================================================
-- 3. UPDATE user_has_project_access: Check global_admin FIRST
-- ============================================================================
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
      RETURN (
        v_project_owner_id = p_user_id
        OR
        EXISTS(
          SELECT 1 FROM public.project_access_grants
          WHERE project_id = p_project_id AND granted_to_user_id = p_user_id
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
'Checks project access. global_admin has access to all projects. Architect-owned projects otherwise require explicit grants. Admins do NOT have automatic access to architect projects.';

-- ============================================================================
-- 4. UPDATE has_project_admin_access: Include global_admin
-- ============================================================================
CREATE OR REPLACE FUNCTION public.has_project_admin_access(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Global admins and admins and project managers have admin access to all projects
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role IN ('global_admin'::public.app_role, 'admin'::public.app_role, 'project_manager'::public.app_role)
  )
  OR
  -- Architects with project access can admin projects they have access to
  (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role = 'architect'::public.app_role
  ) AND public.has_project_access(_user_id, _project_id))
  OR
  -- Project owners can admin their own projects
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id AND owner_id = _user_id
  )
$$;

COMMIT;
