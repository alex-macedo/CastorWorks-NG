-- Migration: Fix Project-Client Relationship
-- Description: 
-- 1. Add CPF column to clients table
-- 2. Backfill clients.cpf from projects.client_cpf
-- 3. Backfill projects.client_id using client_name if missing
-- 4. Update RPCs to join with clients table for the name
-- 5. Remove client_name and client_cpf from projects table
-- Created: 2025-12-30

-- 1. ADD CPF TO CLIENTS
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cpf TEXT;

-- 2. BACKFILL CLIENTS.CPF FROM PROJECTS
-- This updates the client record with the CPF found in the projects table
UPDATE public.clients c
SET cpf = p.client_cpf
FROM public.projects p
WHERE p.client_id = c.id
  AND p.client_cpf IS NOT NULL
  AND (c.cpf IS NULL OR c.cpf = '');

-- 3. BACKFILL PROJECTS.CLIENT_ID IF MISSING (SAFETY)
-- Try to match projects to clients by name if client_id is null
UPDATE public.projects p
SET client_id = c.id
FROM public.clients c
WHERE p.client_id IS NULL
  AND p.client_name IS NOT NULL
  AND c.name = p.client_name;

-- 4. UPDATE RPCS TO JOIN WITH CLIENTS TABLE

-- 4.1. Update get_client_project_summary
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
    c.name AS client_name,
    auth.uid() AS user_id,
    -- Access flags based on roles
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'project_manager')
    ) AS can_view_documents,
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    ) AS can_view_financials,
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    ) AS can_download_reports,
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
  WHERE
    -- Admin users can see ALL projects
    public.has_role(auth.uid(), 'admin'::app_role)
    OR
    -- OR user has explicit access via client_project_access
    p.id IN (
      SELECT project_id FROM public.client_project_access cpa
      WHERE cpa.user_id = auth.uid()
    )
    OR
    -- OR user is a team member of the project
    p.id IN (
      SELECT project_id FROM public.project_team_members ptm
      WHERE ptm.user_id = auth.uid()
    );
$$;

-- 4.2. Update get_portal_project_details
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

  IF v_project_id IS NULL OR NOT public.user_has_project_access(v_project_id, auth.uid()) THEN 
    IF v_project_id IS NULL THEN RETURN; END IF;
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    c.name as client_name,
    p.status::text
  FROM projects p
  LEFT JOIN clients c ON p.client_id = c.id
  WHERE p.id = v_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. REMOVE REDUNDANT COLUMNS FROM PROJECTS
ALTER TABLE public.projects DROP COLUMN IF EXISTS client_name;
ALTER TABLE public.projects DROP COLUMN IF EXISTS client_cpf;

-- Add comments for documentation
COMMENT ON COLUMN public.clients.cpf IS 'Brazilian CPF identification for the client';
