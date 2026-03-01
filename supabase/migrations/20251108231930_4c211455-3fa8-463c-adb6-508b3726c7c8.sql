-- Extend app_role enum to include client role
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'client') THEN
    ALTER TYPE public.app_role ADD VALUE 'client';
  END IF;
END $$;

-- Create client_project_access table to map clients to projects they can access
CREATE TABLE IF NOT EXISTS public.client_project_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  access_level TEXT NOT NULL DEFAULT 'view',
  can_view_documents BOOLEAN DEFAULT true,
  can_view_financials BOOLEAN DEFAULT false,
  can_download_reports BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(client_id, project_id, user_id)
);

-- Enable RLS on client_project_access
ALTER TABLE public.client_project_access ENABLE ROW LEVEL SECURITY;

-- Ensure schema upgrades apply even if the table already existed without new columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'client_project_access' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE public.client_project_access ADD COLUMN project_id UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'client_project_access' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.client_project_access ADD COLUMN user_id UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'client_project_access' AND column_name = 'access_level'
  ) THEN
    ALTER TABLE public.client_project_access ADD COLUMN access_level TEXT NOT NULL DEFAULT 'view';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'client_project_access' AND column_name = 'can_view_documents'
  ) THEN
    ALTER TABLE public.client_project_access ADD COLUMN can_view_documents BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'client_project_access' AND column_name = 'can_view_financials'
  ) THEN
    ALTER TABLE public.client_project_access ADD COLUMN can_view_financials BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'client_project_access' AND column_name = 'can_download_reports'
  ) THEN
    ALTER TABLE public.client_project_access ADD COLUMN can_download_reports BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Clients can view their own project access" ON public.client_project_access;
DROP POLICY IF EXISTS "Admins and PMs can manage client access" ON public.client_project_access;

-- Policy: Clients can view their own project access
CREATE POLICY "Clients can view their own project access"
ON public.client_project_access
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() AND public.has_role(auth.uid(), 'client'::app_role)
);

-- Policy: Admins and project managers can manage client access
CREATE POLICY "Admins and PMs can manage client access"
ON public.client_project_access
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'project_manager'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'project_manager'::app_role)
);

-- Update project_documents RLS to allow client access
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relname = 'project_documents'
      AND n.nspname = 'public'
  ) THEN
    DROP POLICY IF EXISTS "Clients can view documents for their projects" ON public.project_documents;

    CREATE POLICY "Clients can view documents for their projects"
    ON public.project_documents
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.client_project_access cpa
        WHERE cpa.project_id = project_documents.project_id
        AND cpa.user_id = auth.uid()
        AND cpa.can_view_documents = true
        AND public.has_role(auth.uid(), 'client'::app_role)
      )
    );
  END IF;
END;
$$;

DROP VIEW IF EXISTS public.client_project_summary;

DO $$
DECLARE
  project_name_expr TEXT := 'NULL::text';
  project_status_expr TEXT := 'NULL::project_status';
  project_start_expr TEXT := 'NULL::date';
  project_end_expr TEXT := 'NULL::date';
  client_name_expr TEXT := 'NULL::text';
  has_project_documents BOOLEAN;
  has_project_phases BOOLEAN;
  has_projects BOOLEAN;
  has_clients BOOLEAN;
  has_client_access BOOLEAN;
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
          AND pd.is_deleted = false
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

-- Grant access to the view once it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'client_project_summary'
  ) THEN
    GRANT SELECT ON public.client_project_summary TO authenticated;
  END IF;
END;
$$;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_client_project_access_updated_at ON public.client_project_access;
CREATE TRIGGER update_client_project_access_updated_at
BEFORE UPDATE ON public.client_project_access
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
