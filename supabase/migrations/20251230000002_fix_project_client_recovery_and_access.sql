-- Fix Project Client Recovery and Access Control
-- Migration: 20251230000002
-- Description: 
-- 1. Refactors user_has_project_access and has_project_access to be more inclusive
-- 2. Recovers lost client linkages using project_budgets and team members
-- 3. Fixes client portal RPCs to ensure they return data correctly

BEGIN;

-- 1. REFACTOR ACCESS CONTROL FUNCTIONS
-- Ensure they check for client_project_access and project_team_members correctly.
CREATE OR REPLACE FUNCTION public.user_has_project_access(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    -- Admin users and internal managers
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = p_user_id 
      AND role IN ('admin', 'project_manager', 'admin_office', 'manager')
    )
    OR
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- 2. RECOVER PROJECT CLIENT LINKAGES
-- We use several sources to try and match projects to clients

-- Source A: project_budgets.client_name
UPDATE public.projects p
SET client_id = c.id
FROM public.clients c
JOIN public.project_budgets pb ON TRIM(LOWER(pb.client_name)) = TRIM(LOWER(c.name))
WHERE p.id = pb.project_id
  AND p.client_id IS NULL;

-- Source B: project_team_members (role matched to client names)
UPDATE public.projects p
SET client_id = c.id
FROM public.clients c
JOIN public.project_team_members ptm ON TRIM(LOWER(ptm.user_name)) = TRIM(LOWER(c.name))
WHERE p.id = ptm.project_id
  AND p.client_id IS NULL
  AND ptm.role IN ('Client', 'Cliente', 'Client Representative', 'Owner');

UPDATE public.projects p
SET client_id = cpa.client_id
FROM public.client_project_access cpa
WHERE p.id = cpa.project_id
  AND p.client_id IS NULL;

-- Source D: Try matching based on client_project_access if only one client exists for the project members

-- 3. FIX CLIENT PORTAL RPCS
-- Ensure they use the new access check and handle NULL client_id gracefully
CREATE OR REPLACE FUNCTION get_portal_project_details(p_token TEXT DEFAULT NULL, p_project_id UUID DEFAULT NULL)
RETURNS TABLE (
  project_id UUID,
  project_name TEXT,
  client_name TEXT,
  project_status TEXT
) AS $$
DECLARE
  v_project_id UUID;
BEGIN
  IF p_project_id IS NOT NULL THEN
    v_project_id := p_project_id;
  ELSIF p_token IS NOT NULL THEN
    v_project_id := validate_portal_token(p_token);
  END IF;

  IF v_project_id IS NULL OR NOT public.has_project_access(auth.uid(), v_project_id) THEN 
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    COALESCE(c.name, 'N/A') as client_name,
    p.status::text
  FROM projects p
  LEFT JOIN clients c ON p.client_id = c.id
  WHERE p.id = v_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_client_project_summary to also use the new access check
CREATE OR REPLACE FUNCTION public.get_client_project_summary()
RETURNS TABLE (
  id uuid,
  project_name text,
  status text,
  start_date date,
  end_date date,
  client_name text,
  user_id uuid,
  can_view_documents boolean,
  can_view_financials boolean,
  can_download_reports boolean,
  document_count bigint,
  phase_count bigint,
  completed_phases bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.name AS project_name,
    p.status::text,
    p.start_date,
    p.end_date,
    COALESCE(c.name, 'N/A') as client_name,
    auth.uid() AS user_id,
    -- Access flags based on roles
    TRUE AS can_view_documents, -- Revised: if they have access via RPC they can view docs
    (EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'project_manager')
    )) AS can_view_financials,
    (EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'project_manager')
    )) AS can_download_reports,
    -- Additional fields
    COALESCE(
      (SELECT COUNT(*) FROM public.project_documents pd
       WHERE pd.project_id = p.id AND pd.is_deleted = false),
      0
    )::bigint AS document_count,
    COALESCE(
      (SELECT COUNT(*) FROM public.project_phases pp
       WHERE pp.project_id = p.id),
      0
    )::bigint AS phase_count,
    COALESCE(
      (SELECT COUNT(*) FROM public.project_phases pp
       WHERE pp.project_id = p.id AND pp.status = 'completed'),
      0
    )::bigint AS completed_phases
  FROM public.projects p
  LEFT JOIN public.clients c ON p.client_id = c.id
  WHERE public.has_project_access(auth.uid(), p.id);
$$;

COMMIT;
