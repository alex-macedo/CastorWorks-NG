-- Drop and recreate client_project_summary view without SECURITY DEFINER
-- This fixes the security vulnerability where views bypass RLS policies

DROP VIEW IF EXISTS public.client_project_summary;

DO $$
DECLARE
  project_name_expr TEXT := 'NULL::text';
  project_status_expr TEXT := 'NULL::text';
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
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'projects'
  ) INTO has_projects;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'clients'
  ) INTO has_clients;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'client_project_access'
  ) INTO has_client_access;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'project_documents'
  ) INTO has_project_documents;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'project_phases'
  ) INTO has_project_phases;

  IF NOT (has_projects AND has_clients AND has_client_access AND has_project_documents AND has_project_phases) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'name'
  ) THEN
    project_name_expr := 'p.name';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'status'
  ) THEN
    project_status_expr := 'p.status';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'start_date'
  ) THEN
    project_start_expr := 'p.start_date';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'end_date'
  ) THEN
    project_end_expr := 'p.end_date';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'name'
  ) THEN
    client_name_expr := 'c.name';
  END IF;

  EXECUTE format($view$
    CREATE VIEW public.client_project_summary AS
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
        SELECT COUNT(*)
        FROM public.project_documents pd
        WHERE pd.project_id = p.id
          AND pd.is_deleted = FALSE
      ) AS document_count,
      (
        SELECT COUNT(*)
        FROM public.project_phases pp
        WHERE pp.project_id = p.id
      ) AS phase_count,
      (
        SELECT COUNT(*)
        FROM public.project_phases pp
        WHERE pp.project_id = p.id
          AND pp.status = 'completed'
      ) AS completed_phases
    FROM public.projects p
    LEFT JOIN public.clients c ON p.client_id = c.id
    JOIN public.client_project_access cpa ON cpa.project_id = p.id;
  $view$, project_name_expr, project_status_expr, project_start_expr, project_end_expr, client_name_expr);
END;
$$;

-- Grant appropriate permissions
DO $$
BEGIN
  IF to_regclass('public.client_project_summary') IS NOT NULL THEN
    GRANT SELECT ON public.client_project_summary TO authenticated;
    GRANT SELECT ON public.client_project_summary TO service_role;
  END IF;
END;
$$;
