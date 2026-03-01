-- Migration: create get_client_project_summary RPC
-- Timestamp: 2025-11-21 21:37:22 (local time)
-- Purpose: Provide project summary with access flags derived from user_roles.

DO $$
BEGIN
  IF to_regclass('public.client_project_summary') IS NOT NULL THEN
    CREATE OR REPLACE FUNCTION public.get_client_project_summary()
    RETURNS SETOF public.client_project_summary
    LANGUAGE sql SECURITY DEFINER
    AS $function$
      SELECT
        p.id,
        p.project_name,
        p.status,
        p.start_date,
        p.end_date,
        p.client_name,
        p.user_id,
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
        -- Additional fields (adjust as needed)
        p.document_count,
        p.phase_count,
        p.completed_phases
      FROM public.projects p
      WHERE p.id = ANY (
        SELECT project_id FROM public.user_projects up WHERE up.user_id = auth.uid()
      );
    $function$;

    -- Grant execute to the authenticated role
    GRANT EXECUTE ON FUNCTION public.get_client_project_summary() TO authenticated;
  END IF;
END;
$$;
