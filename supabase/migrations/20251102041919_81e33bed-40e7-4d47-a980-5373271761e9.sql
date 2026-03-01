-- Phase 3: Advanced Scheduling & Integrations - Database Schema

-- 1. Create resource_type enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'resource_type'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.resource_type AS ENUM (
      'labor',
      'equipment',
      'material',
      'subcontractor'
    );
  END IF;
END;
$$;

-- Ensure app_role contains project_manager before policies reference it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role'
      AND e.enumlabel = 'project_manager'
  ) THEN
    EXECUTE 'ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS ''project_manager''';
  END IF;
END;
$$;

-- 2. Create project_resources table
CREATE TABLE IF NOT EXISTS public.project_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL
    REFERENCES public.projects(id) ON DELETE CASCADE,
  resource_name TEXT NOT NULL,
  resource_type public.resource_type NOT NULL,
  availability_percentage NUMERIC DEFAULT 100,
  hourly_rate NUMERIC,
  daily_rate NUMERIC,
  unit_cost NUMERIC,
  max_units_per_day NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.project_resources
  ENABLE ROW LEVEL SECURITY;

-- 3. Create dependency_type enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'dependency_type'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.dependency_type AS ENUM ('FS', 'SS', 'FF', 'SF');
  END IF;
END;
$$;

-- 4. Add dependencies and resource fields to project_activities
ALTER TABLE public.project_activities
  ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS early_start DATE,
  ADD COLUMN IF NOT EXISTS early_finish DATE,
  ADD COLUMN IF NOT EXISTS late_start DATE,
  ADD COLUMN IF NOT EXISTS late_finish DATE,
  ADD COLUMN IF NOT EXISTS float_days INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT false;

-- 5. Create activity_resource_assignments table
CREATE TABLE IF NOT EXISTS public.activity_resource_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL
    REFERENCES public.project_activities(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL
    REFERENCES public.project_resources(id) ON DELETE CASCADE,
  units_required NUMERIC NOT NULL DEFAULT 1,
  allocation_percentage NUMERIC DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(activity_id, resource_id)
);

ALTER TABLE public.activity_resource_assignments
  ENABLE ROW LEVEL SECURITY;

-- 6. Create schedule_scenarios table
CREATE TABLE IF NOT EXISTS public.schedule_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL
    REFERENCES public.projects(id) ON DELETE CASCADE,
  scenario_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  is_baseline BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.schedule_scenarios
  ENABLE ROW LEVEL SECURITY;

-- 7. Create scenario_activities table
CREATE TABLE IF NOT EXISTS public.scenario_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL
    REFERENCES public.schedule_scenarios(id) ON DELETE CASCADE,
  activity_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.scenario_activities
  ENABLE ROW LEVEL SECURITY;

-- 8. Create integration_settings table
CREATE TABLE IF NOT EXISTS public.integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_type TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT false,
  configuration JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.integration_settings
  ENABLE ROW LEVEL SECURITY;

-- 9. Create email_notifications table
CREATE TABLE IF NOT EXISTS public.email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID
    REFERENCES public.projects(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  notification_type TEXT,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.email_notifications
  ENABLE ROW LEVEL SECURITY;

-- 10. Create calendar_events table
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID
    REFERENCES public.projects(id) ON DELETE CASCADE,
  activity_id UUID
    REFERENCES public.project_activities(id) ON DELETE CASCADE,
  external_event_id TEXT,
  calendar_provider TEXT,
  event_title TEXT NOT NULL,
  event_description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.calendar_events
  ENABLE ROW LEVEL SECURITY;

-- 11. Insert default integration settings (idempotent)
INSERT INTO public.integration_settings (integration_type, is_enabled,
                                         configuration)
VALUES
  ('email', false, '{"provider": "resend"}'::jsonb),
  ('whatsapp', false, '{"provider": "twilio"}'::jsonb),
  ('google_drive', false, '{}'::jsonb),
  ('google_calendar', false, '{}'::jsonb)
ON CONFLICT (integration_type) DO NOTHING;

-- 12. RLS Policies for project_resources
DROP POLICY IF EXISTS "project_scoped_select_project_resources"
  ON public.project_resources;

DROP POLICY IF EXISTS "pm_admin_manage_project_resources"
  ON public.project_resources;

CREATE POLICY "project_scoped_select_project_resources"
ON public.project_resources
FOR SELECT
TO authenticated
USING (has_project_access(auth.uid(), project_id));

-- simplified: any authenticated user can manage in this env
CREATE POLICY "pm_admin_manage_project_resources"
ON public.project_resources
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 13. RLS Policies for activity_resource_assignments
DROP POLICY IF EXISTS "authenticated_select_resource_assignments"
  ON public.activity_resource_assignments;

DROP POLICY IF EXISTS "pm_admin_manage_resource_assignments"
  ON public.activity_resource_assignments;

CREATE POLICY "authenticated_select_resource_assignments"
ON public.activity_resource_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.project_resources pr
    WHERE pr.id = resource_id
      AND has_project_access(auth.uid(), pr.project_id)
  )
);

CREATE POLICY "pm_admin_manage_resource_assignments"
ON public.activity_resource_assignments
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 14. RLS Policies for schedule_scenarios
DROP POLICY IF EXISTS "project_scoped_select_scenarios"
  ON public.schedule_scenarios;

DROP POLICY IF EXISTS "pm_admin_manage_scenarios"
  ON public.schedule_scenarios;

CREATE POLICY "project_scoped_select_scenarios"
ON public.schedule_scenarios
FOR SELECT
TO authenticated
USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "pm_admin_manage_scenarios"
ON public.schedule_scenarios
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 15. RLS Policies for scenario_activities
DROP POLICY IF EXISTS "authenticated_select_scenario_activities"
  ON public.scenario_activities;

DROP POLICY IF EXISTS "pm_admin_manage_scenario_activities"
  ON public.scenario_activities;

CREATE POLICY "authenticated_select_scenario_activities"
ON public.scenario_activities
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.schedule_scenarios ss
    WHERE ss.id = scenario_id
      AND has_project_access(auth.uid(), ss.project_id)
  )
);

CREATE POLICY "pm_admin_manage_scenario_activities"
ON public.scenario_activities
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'project_manager'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'project_manager'::app_role)
);

-- 16. RLS Policies for integration_settings
DROP POLICY IF EXISTS "authenticated_select_integration_settings"
  ON public.integration_settings;

DROP POLICY IF EXISTS "admin_manage_integration_settings"
  ON public.integration_settings;

CREATE POLICY "authenticated_select_integration_settings"
ON public.integration_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin_manage_integration_settings"
ON public.integration_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 17. RLS Policies for email_notifications
DROP POLICY IF EXISTS "project_scoped_select_email_notifications"
  ON public.email_notifications;

DROP POLICY IF EXISTS "authenticated_insert_email_notifications"
  ON public.email_notifications;

CREATE POLICY "project_scoped_select_email_notifications"
ON public.email_notifications
FOR SELECT
TO authenticated
USING (project_id IS NULL
       OR has_project_access(auth.uid(), project_id));

CREATE POLICY "authenticated_insert_email_notifications"
ON public.email_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (project_id IS NULL
       OR has_project_access(auth.uid(), project_id))
);

-- 18. RLS Policies for calendar_events
DROP POLICY IF EXISTS "project_scoped_select_calendar_events"
  ON public.calendar_events;

DROP POLICY IF EXISTS "project_scoped_manage_calendar_events"
  ON public.calendar_events;

CREATE POLICY "project_scoped_select_calendar_events"
ON public.calendar_events
FOR SELECT
TO authenticated
USING (project_id IS NULL
       OR has_project_access(auth.uid(), project_id));

CREATE POLICY "project_scoped_manage_calendar_events"
ON public.calendar_events
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (project_id IS NULL
       OR has_project_access(auth.uid(), project_id))
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (project_id IS NULL
       OR has_project_access(auth.uid(), project_id))
);

-- 19. Add triggers for updated_at (idempotent)
DROP TRIGGER IF EXISTS update_project_resources_updated_at
  ON public.project_resources;

CREATE TRIGGER update_project_resources_updated_at
BEFORE UPDATE ON public.project_resources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_activity_resource_assignments_updated_at
  ON public.activity_resource_assignments;

CREATE TRIGGER update_activity_resource_assignments_updated_at
BEFORE UPDATE ON public.activity_resource_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_schedule_scenarios_updated_at
  ON public.schedule_scenarios;

CREATE TRIGGER update_schedule_scenarios_updated_at
BEFORE UPDATE ON public.schedule_scenarios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_integration_settings_updated_at
  ON public.integration_settings;

CREATE TRIGGER update_integration_settings_updated_at
BEFORE UPDATE ON public.integration_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_calendar_events_updated_at
  ON public.calendar_events;

CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 20. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_resources_project_id
  ON public.project_resources(project_id);

CREATE INDEX IF NOT EXISTS idx_activity_resource_assignments_activity_id
  ON public.activity_resource_assignments(activity_id);

CREATE INDEX IF NOT EXISTS idx_activity_resource_assignments_resource_id
  ON public.activity_resource_assignments(resource_id);

CREATE INDEX IF NOT EXISTS idx_schedule_scenarios_project_id
  ON public.schedule_scenarios(project_id);

CREATE INDEX IF NOT EXISTS idx_scenario_activities_scenario_id
  ON public.scenario_activities(scenario_id);

CREATE INDEX IF NOT EXISTS idx_email_notifications_status
  ON public.email_notifications(status);

CREATE INDEX IF NOT EXISTS idx_calendar_events_project_id
  ON public.calendar_events(project_id);

CREATE INDEX IF NOT EXISTS idx_calendar_events_activity_id
  ON public.calendar_events(activity_id);
