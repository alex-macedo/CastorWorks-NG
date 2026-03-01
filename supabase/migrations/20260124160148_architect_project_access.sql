-- ============================================================================
-- Architect Project Creation and Access Control
-- Migration: 20260124160148
-- Description: 
-- 1. Creates project_access_grants table for architect-to-admin/PM access grants
-- 2. Updates user_has_project_access to isolate architect-owned projects
-- 3. Updates projects INSERT policy to allow architects to create projects
-- 4. Adds RLS policies for project_access_grants table
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CREATE project_access_grants TABLE
-- ============================================================================
-- Stores explicit access grants from architects to other users (admins/PMs)
-- Similar pattern to client_project_access but for architect → admin/PM grants

CREATE TABLE IF NOT EXISTS public.project_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  granted_by_user_id UUID NOT NULL REFERENCES auth.users(id), -- Architect who granted access
  granted_to_user_id UUID NOT NULL REFERENCES auth.users(id), -- User receiving access (admin/PM)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, granted_to_user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_access_grants_project_id 
  ON public.project_access_grants(project_id);
CREATE INDEX IF NOT EXISTS idx_project_access_grants_granted_to_user_id 
  ON public.project_access_grants(granted_to_user_id);
CREATE INDEX IF NOT EXISTS idx_project_access_grants_granted_by_user_id 
  ON public.project_access_grants(granted_by_user_id);

-- Add updated_at trigger (if function exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_updated_at_column' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    CREATE TRIGGER update_project_access_grants_updated_at
      BEFORE UPDATE ON public.project_access_grants
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- 2. UPDATE user_has_project_access FUNCTION
-- ============================================================================
-- Implements architect isolation: architect-owned projects are invisible to
-- admins/PMs unless explicitly granted access via project_access_grants

CREATE OR REPLACE FUNCTION public.user_has_project_access(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_internal BOOLEAN;
  v_is_architect_owned BOOLEAN;
  v_project_owner_id UUID;
BEGIN
  IF p_project_id IS NULL OR p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get project owner first
  SELECT owner_id INTO v_project_owner_id
  FROM public.projects
  WHERE id = p_project_id;

  -- If project has no owner, use existing logic
  IF v_project_owner_id IS NULL THEN
    -- Fast path: Check if user is admin/PM/internal staff
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = p_user_id 
      AND role IN ('admin'::public.app_role, 'project_manager'::public.app_role, 'admin_office'::public.app_role, 'site_supervisor'::public.app_role)
    ) INTO v_is_internal;

    IF v_is_internal THEN
      RETURN TRUE;
    END IF;

    -- Others: explicit client access, team membership, or client organization access
    RETURN (
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
  END IF;

  -- Check if project owner is an architect
  SELECT EXISTS(
    SELECT 1 
    FROM public.user_roles
    WHERE user_id = v_project_owner_id
      AND role = 'architect'::public.app_role
  ) INTO v_is_architect_owned;

  -- If project is owned by an architect:
  IF v_is_architect_owned THEN
    -- Only owner or users with explicit grant can access (even admins/PMs need explicit grant)
    RETURN (
      v_project_owner_id = p_user_id
      OR
      EXISTS(
        SELECT 1 FROM public.project_access_grants 
        WHERE project_id = p_project_id AND granted_to_user_id = p_user_id
      )
    );
  END IF;

  -- For non-architect projects: existing logic
  -- Fast path: Check if user is admin/PM/internal staff
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id 
    AND role IN ('admin'::public.app_role, 'project_manager'::public.app_role, 'admin_office'::public.app_role, 'site_supervisor'::public.app_role)
  ) INTO v_is_internal;

  IF v_is_internal THEN
    -- Admins/PMs can access non-architect projects
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

-- ============================================================================
-- 3. UPDATE PROJECTS INSERT POLICY
-- ============================================================================
-- Allow architects to create projects (in addition to admins and PMs)

DROP POLICY IF EXISTS "Admins and PMs can create projects" ON public.projects;
DROP POLICY IF EXISTS "Admins, PMs, and Architects can create projects" ON public.projects;

CREATE POLICY "Admins, PMs, and Architects can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.has_role(auth.uid(), 'project_manager'::app_role)
    OR public.has_role(auth.uid(), 'architect'::app_role)
  );

-- ============================================================================
-- 4. UPDATE has_project_access WRAPPER FUNCTION
-- ============================================================================
-- Ensure the wrapper function calls the updated user_has_project_access

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

-- ============================================================================
-- 5. ENABLE RLS ON project_access_grants
-- ============================================================================

ALTER TABLE public.project_access_grants ENABLE ROW LEVEL SECURITY;

-- Project owners can view grants for their projects
DROP POLICY IF EXISTS "Project owners can view access grants" ON public.project_access_grants;
CREATE POLICY "Project owners can view access grants"
  ON public.project_access_grants FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM public.projects 
      WHERE id = project_id AND owner_id = auth.uid()
    )
  );

-- Users who have been granted access can view their own grants
DROP POLICY IF EXISTS "Granted users can view their access grants" ON public.project_access_grants;
CREATE POLICY "Granted users can view their access grants"
  ON public.project_access_grants FOR SELECT
  USING (granted_to_user_id = auth.uid());

-- Project owners can create grants
DROP POLICY IF EXISTS "Project owners can grant access" ON public.project_access_grants;
CREATE POLICY "Project owners can grant access"
  ON public.project_access_grants FOR INSERT
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.projects 
      WHERE id = project_id AND owner_id = auth.uid()
    )
  );

-- Project owners can revoke grants
DROP POLICY IF EXISTS "Project owners can revoke access" ON public.project_access_grants;
CREATE POLICY "Project owners can revoke access"
  ON public.project_access_grants FOR DELETE
  USING (
    EXISTS(
      SELECT 1 FROM public.projects 
      WHERE id = project_id AND owner_id = auth.uid()
    )
  );

-- Add comment explaining the table purpose
COMMENT ON TABLE public.project_access_grants IS
  'Stores explicit access grants from architects to admins/PMs. Architect-owned projects are isolated and only visible to the owner and users with explicit grants.';

COMMIT;
