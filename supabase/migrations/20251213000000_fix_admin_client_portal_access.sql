-- Migration: Fix admin access to client portal
-- Timestamp: 2025-12-13 00:00:00
-- Purpose: Allow admin users to access all projects in the client portal

-- Drop and recreate the function with proper admin access
DROP FUNCTION IF EXISTS public.get_client_project_summary();

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
    p.client_name,
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

-- Grant execute to the authenticated role
GRANT EXECUTE ON FUNCTION public.get_client_project_summary() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_client_project_summary() IS
  'Returns project summary for the current user. Admin users see all projects, other users see projects they have access to via user_projects or project_team_members.';
