-- Create tables for supervisor mobile features

-- Site activity logs for daily progress tracking
CREATE TABLE IF NOT EXISTS public.site_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  supervisor_id UUID REFERENCES auth.users(id) NOT NULL,
  activity_date DATE NOT NULL,
  weather_conditions TEXT,
  crew_count INTEGER DEFAULT 0,
  notes TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Issue/incident reports
CREATE TABLE IF NOT EXISTS public.site_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  reported_by UUID REFERENCES auth.users(id) NOT NULL,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('safety', 'quality', 'material', 'equipment', 'other')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Time tracking for crews
CREATE TABLE IF NOT EXISTS public.crew_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  supervisor_id UUID REFERENCES auth.users(id) NOT NULL,
  log_date DATE NOT NULL,
  crew_member_name TEXT NOT NULL,
  hours_worked DECIMAL(5,2) NOT NULL CHECK (hours_worked > 0 AND hours_worked <= 24),
  activity_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Quality inspection checklists
CREATE TABLE IF NOT EXISTS public.quality_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  inspector_id UUID REFERENCES auth.users(id) NOT NULL,
  phase_id UUID REFERENCES public.project_phases(id) ON DELETE SET NULL,
  inspection_date DATE NOT NULL,
  checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  overall_status TEXT CHECK (overall_status IN ('passed', 'failed', 'conditional')),
  signature_data TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.site_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_inspections ENABLE ROW LEVEL SECURITY;

 -- RLS policies for site_activity_logs, site_issues, crew_time_logs, and quality_inspections
 DO $$
 BEGIN
   IF EXISTS (
     SELECT 1 FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'site_activity_logs'
   ) THEN
     DROP POLICY IF EXISTS "Users can view activity logs for accessible projects" ON public.site_activity_logs;
     DROP POLICY IF EXISTS "Supervisors and admins can insert activity logs" ON public.site_activity_logs;
     DROP POLICY IF EXISTS "Supervisors can update their own activity logs" ON public.site_activity_logs;
     DROP POLICY IF EXISTS "Admins can delete activity logs" ON public.site_activity_logs;

     EXECUTE '
       CREATE POLICY "Users can view activity logs for accessible projects"
       ON public.site_activity_logs FOR SELECT
       USING (has_project_access(auth.uid(), project_id))
     ';

     EXECUTE '
       CREATE POLICY "Supervisors and admins can insert activity logs"
       ON public.site_activity_logs FOR INSERT
       WITH CHECK (
         (has_role(auth.uid(), ''site_supervisor'') OR has_role(auth.uid(), ''admin'') OR has_role(auth.uid(), ''project_manager''))
         AND has_project_access(auth.uid(), project_id)
       )
     ';

     EXECUTE '
       CREATE POLICY "Supervisors can update their own activity logs"
       ON public.site_activity_logs FOR UPDATE
       USING (supervisor_id = auth.uid() OR has_role(auth.uid(), ''admin''))
     ';

     EXECUTE '
       CREATE POLICY "Admins can delete activity logs"
       ON public.site_activity_logs FOR DELETE
       USING (has_role(auth.uid(), ''admin''))
     ';
   END IF;

   IF EXISTS (
     SELECT 1 FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'site_issues'
   ) THEN
     DROP POLICY IF EXISTS "Users can view issues for accessible projects" ON public.site_issues;
     DROP POLICY IF EXISTS "Supervisors and team members can report issues" ON public.site_issues;
     DROP POLICY IF EXISTS "Reporters and assigned users can update issues" ON public.site_issues;
     DROP POLICY IF EXISTS "Admins can delete issues" ON public.site_issues;

     EXECUTE '
       CREATE POLICY "Users can view issues for accessible projects"
       ON public.site_issues FOR SELECT
       USING (has_project_access(auth.uid(), project_id))
     ';

     EXECUTE '
       CREATE POLICY "Supervisors and team members can report issues"
       ON public.site_issues FOR INSERT
       WITH CHECK (
         (has_role(auth.uid(), ''site_supervisor'') OR has_role(auth.uid(), ''admin'') OR has_role(auth.uid(), ''project_manager''))
         AND has_project_access(auth.uid(), project_id)
       )
     ';

     EXECUTE '
       CREATE POLICY "Reporters and assigned users can update issues"
       ON public.site_issues FOR UPDATE
       USING (
         reported_by = auth.uid()
         OR assigned_to = auth.uid()
         OR has_role(auth.uid(), ''admin'')
         OR has_role(auth.uid(), ''project_manager'')
       )
     ';

     EXECUTE '
       CREATE POLICY "Admins can delete issues"
       ON public.site_issues FOR DELETE
       USING (has_role(auth.uid(), ''admin''))
     ';
   END IF;

   IF EXISTS (
     SELECT 1 FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'crew_time_logs'
   ) THEN
     DROP POLICY IF EXISTS "Users can view time logs for accessible projects" ON public.crew_time_logs;
     DROP POLICY IF EXISTS "Supervisors can insert time logs" ON public.crew_time_logs;
     DROP POLICY IF EXISTS "Supervisors can update their own time logs" ON public.crew_time_logs;
     DROP POLICY IF EXISTS "Admins can delete time logs" ON public.crew_time_logs;

     EXECUTE '
       CREATE POLICY "Users can view time logs for accessible projects"
       ON public.crew_time_logs FOR SELECT
       USING (has_project_access(auth.uid(), project_id))
     ';

     EXECUTE '
       CREATE POLICY "Supervisors can insert time logs"
       ON public.crew_time_logs FOR INSERT
       WITH CHECK (
         (has_role(auth.uid(), ''site_supervisor'') OR has_role(auth.uid(), ''admin'') OR has_role(auth.uid(), ''project_manager''))
         AND has_project_access(auth.uid(), project_id)
       )
     ';

     EXECUTE '
       CREATE POLICY "Supervisors can update their own time logs"
       ON public.crew_time_logs FOR UPDATE
       USING (supervisor_id = auth.uid() OR has_role(auth.uid(), ''admin''))
     ';

     EXECUTE '
       CREATE POLICY "Admins can delete time logs"
       ON public.crew_time_logs FOR DELETE
       USING (has_role(auth.uid(), ''admin''))
     ';
   END IF;

   IF EXISTS (
     SELECT 1 FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'quality_inspections'
   ) THEN
     DROP POLICY IF EXISTS "Users can view inspections for accessible projects" ON public.quality_inspections;
     DROP POLICY IF EXISTS "Supervisors and inspectors can create inspections" ON public.quality_inspections;
     DROP POLICY IF EXISTS "Inspectors can update their own inspections" ON public.quality_inspections;
     DROP POLICY IF EXISTS "Admins can delete inspections" ON public.quality_inspections;

     EXECUTE '
       CREATE POLICY "Users can view inspections for accessible projects"
       ON public.quality_inspections FOR SELECT
       USING (has_project_access(auth.uid(), project_id))
     ';

     EXECUTE '
       CREATE POLICY "Supervisors and inspectors can create inspections"
       ON public.quality_inspections FOR INSERT
       WITH CHECK (
         (has_role(auth.uid(), ''site_supervisor'') OR has_role(auth.uid(), ''admin'') OR has_role(auth.uid(), ''project_manager''))
         AND has_project_access(auth.uid(), project_id)
       )
     ';

     EXECUTE '
       CREATE POLICY "Inspectors can update their own inspections"
       ON public.quality_inspections FOR UPDATE
       USING (inspector_id = auth.uid() OR has_role(auth.uid(), ''admin''))
     ';

     EXECUTE '
       CREATE POLICY "Admins can delete inspections"
       ON public.quality_inspections FOR DELETE
       USING (has_role(auth.uid(), ''admin''))
     ';
   END IF;
 END;
 $$;

-- Create updated_at triggers
DROP TRIGGER IF EXISTS update_site_activity_logs_updated_at ON public.site_activity_logs;
CREATE TRIGGER update_site_activity_logs_updated_at
  BEFORE UPDATE ON public.site_activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_site_issues_updated_at ON public.site_issues;
CREATE TRIGGER update_site_issues_updated_at
  BEFORE UPDATE ON public.site_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_crew_time_logs_updated_at ON public.crew_time_logs;
CREATE TRIGGER update_crew_time_logs_updated_at
  BEFORE UPDATE ON public.crew_time_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_quality_inspections_updated_at ON public.quality_inspections;
CREATE TRIGGER update_quality_inspections_updated_at
  BEFORE UPDATE ON public.quality_inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_site_activity_logs_project ON public.site_activity_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_site_activity_logs_date ON public.site_activity_logs(activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_site_issues_project ON public.site_issues(project_id);
CREATE INDEX IF NOT EXISTS idx_site_issues_status ON public.site_issues(status);
CREATE INDEX IF NOT EXISTS idx_crew_time_logs_project ON public.crew_time_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_crew_time_logs_date ON public.crew_time_logs(log_date DESC);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_project ON public.quality_inspections(project_id);
