-- The security_metrics and client_project_summary views don't need to exist as views
-- Instead, we can create them as regular tables with RLS policies or remove them if not used

-- First, let's check if security_metrics view is actually being used
-- If it's not critical, we can drop it and recreate as a function that returns data

-- Drop the potentially problematic views
DROP VIEW IF EXISTS public.security_metrics CASCADE;
DROP VIEW IF EXISTS public.client_project_summary CASCADE;

-- Recreate client_project_summary as a SECURITY INVOKER function instead
-- This runs with the permissions of the calling user, not the function creator
DO $$
DECLARE
  project_name_expr TEXT := 'NULL::text';
  project_status_expr TEXT := 'NULL::project_status';
  project_start_expr TEXT := 'NULL::date';
  project_end_expr TEXT := 'NULL::date';
  client_name_expr TEXT := 'NULL::text';
  has_projects BOOLEAN;
  has_clients BOOLEAN;
  has_client_access BOOLEAN;
  has_project_documents BOOLEAN;
  has_project_phases BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'projects'
  ) INTO has_projects;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'clients'
  ) INTO has_clients;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'client_project_access'
  ) INTO has_client_access;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'project_documents'
  ) INTO has_project_documents;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'project_phases'
  ) INTO has_project_phases;

  IF NOT (has_projects AND has_clients AND has_client_access AND has_project_documents AND has_project_phases) THEN
    RAISE NOTICE 'Skipping client_project_summary function because supporting tables are missing';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'project_name'
  ) THEN
    project_name_expr := 'p.project_name';
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'name'
  ) THEN
    project_name_expr := 'p.name';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'status'
  ) THEN
    project_status_expr := 'p.status';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'start_date'
  ) THEN
    project_start_expr := 'p.start_date';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'end_date'
  ) THEN
    project_end_expr := 'p.end_date';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'company_name'
  ) THEN
    client_name_expr := 'c.company_name';
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'name'
  ) THEN
    client_name_expr := 'c.name';
  END IF;

  EXECUTE format($func$
    CREATE OR REPLACE FUNCTION public.get_client_project_summary()
    RETURNS TABLE (
      id uuid,
      project_name text,
      status project_status,
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
    STABLE
    SECURITY INVOKER
    SET search_path = public
    AS $func_body$
      SELECT 
        p.id,
        %s AS project_name,
        %s AS status,
        %s AS start_date,
        %s AS end_date,
        %s AS client_name,
        cpa.user_id,
        cpa.can_view_documents,
        cpa.can_view_financials,
        cpa.can_download_reports,
        (
          SELECT COUNT(*) FROM project_documents pd 
          WHERE pd.project_id = p.id AND pd.is_deleted = false
        ) AS document_count,
        (
          SELECT COUNT(*) FROM project_phases pp 
          WHERE pp.project_id = p.id
        ) AS phase_count,
        (
          SELECT COUNT(*) FROM project_phases pp 
          WHERE pp.project_id = p.id AND pp.status = 'completed'
        ) AS completed_phases
      FROM projects p
        JOIN clients c ON p.client_id = c.id
        JOIN client_project_access cpa ON cpa.project_id = p.id
      WHERE cpa.user_id = auth.uid()
    $func_body$;
  $func$, project_name_expr, project_status_expr, project_start_expr, project_end_expr, client_name_expr);
END;
$$;

-- Create security_metrics as a SECURITY INVOKER function
-- Only admins should be able to call this
CREATE OR REPLACE FUNCTION public.get_security_metrics()
RETURNS TABLE (
  events_24h bigint,
  events_1h bigint,
  critical_24h bigint,
  high_24h bigint,
  failed_auth_24h bigint,
  rls_violations_24h bigint,
  suspicious_access_24h bigint,
  affected_users_24h bigint,
  unresolved_events bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER  -- Runs with caller's permissions
SET search_path = public
AS $$
  SELECT 
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS events_24h,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') AS events_1h,
    COUNT(*) FILTER (WHERE severity = 'critical' AND created_at > NOW() - INTERVAL '24 hours') AS critical_24h,
    COUNT(*) FILTER (WHERE severity = 'high' AND created_at > NOW() - INTERVAL '24 hours') AS high_24h,
    COUNT(*) FILTER (WHERE event_type = 'auth_failed' AND created_at > NOW() - INTERVAL '24 hours') AS failed_auth_24h,
    COUNT(*) FILTER (WHERE event_type = 'rls_violation' AND created_at > NOW() - INTERVAL '24 hours') AS rls_violations_24h,
    COUNT(*) FILTER (WHERE event_type = 'suspicious_access' AND created_at > NOW() - INTERVAL '24 hours') AS suspicious_access_24h,
    COUNT(DISTINCT user_id) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS affected_users_24h,
    COUNT(*) FILTER (WHERE resolved = false) AS unresolved_events
  FROM security_events
  WHERE has_role(auth.uid(), 'admin')  -- Only admins can see this data
$$;

DO $$
BEGIN
  IF to_regclass('public.get_client_project_summary') IS NOT NULL THEN
    COMMENT ON FUNCTION public.get_client_project_summary() IS 
    'Returns project summary for the current user. Uses SECURITY INVOKER to run with caller permissions.';
  END IF;

  IF to_regclass('public.get_security_metrics') IS NOT NULL THEN
    COMMENT ON FUNCTION public.get_security_metrics() IS 
    'Returns security metrics. Uses SECURITY INVOKER and requires admin role.';
  END IF;
END;
$$;
