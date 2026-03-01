BEGIN;

-- 1) Analytics events for CastorMind-AI operations
CREATE TABLE IF NOT EXISTS public.castormind_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  request_id text,
  trace_id text,
  session_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role text,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  intent text,
  tool_name text,
  status text,
  duration_ms integer,
  queue_job_id uuid,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_castormind_events_event_at
  ON public.castormind_analytics_events (event_at DESC);
CREATE INDEX IF NOT EXISTS idx_castormind_events_intent
  ON public.castormind_analytics_events (intent);
CREATE INDEX IF NOT EXISTS idx_castormind_events_tool_name
  ON public.castormind_analytics_events (tool_name);
CREATE INDEX IF NOT EXISTS idx_castormind_events_status
  ON public.castormind_analytics_events (status);
CREATE INDEX IF NOT EXISTS idx_castormind_events_request_id
  ON public.castormind_analytics_events (request_id);
CREATE INDEX IF NOT EXISTS idx_castormind_events_user_id
  ON public.castormind_analytics_events (user_id);

ALTER TABLE public.castormind_analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "castormind_analytics_select" ON public.castormind_analytics_events;
CREATE POLICY "castormind_analytics_select"
ON public.castormind_analytics_events
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager') OR has_role(auth.uid(), 'global_admin'));

-- No direct client insert/update/delete; service role writes these records.

-- 2) Prompt templates
CREATE TABLE IF NOT EXISTS public.castormind_prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  title text NOT NULL,
  locale text NOT NULL DEFAULT 'en-US',
  intent text NOT NULL,
  prompt_text text NOT NULL,
  variable_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  role_visibility text[] NOT NULL DEFAULT ARRAY['admin','project_manager','architect','site_supervisor','admin_office','viewer','accountant'],
  safety_hints text[] NOT NULL DEFAULT ARRAY[]::text[],
  is_active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_castormind_templates_locale
  ON public.castormind_prompt_templates (locale);
CREATE INDEX IF NOT EXISTS idx_castormind_templates_intent
  ON public.castormind_prompt_templates (intent);
CREATE INDEX IF NOT EXISTS idx_castormind_templates_active
  ON public.castormind_prompt_templates (is_active);

ALTER TABLE public.castormind_prompt_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "castormind_templates_select" ON public.castormind_prompt_templates;
CREATE POLICY "castormind_templates_select"
ON public.castormind_prompt_templates
FOR SELECT
TO authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "castormind_templates_manage" ON public.castormind_prompt_templates;
CREATE POLICY "castormind_templates_manage"
ON public.castormind_prompt_templates
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'global_admin'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'global_admin'));

-- 3) Role-based tool permissions
CREATE TABLE IF NOT EXISTS public.castormind_tool_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  intent text NOT NULL,
  is_allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, intent)
);

ALTER TABLE public.castormind_tool_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "castormind_tool_permissions_select" ON public.castormind_tool_permissions;
CREATE POLICY "castormind_tool_permissions_select"
ON public.castormind_tool_permissions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager') OR has_role(auth.uid(), 'global_admin'));

DROP POLICY IF EXISTS "castormind_tool_permissions_manage" ON public.castormind_tool_permissions;
CREATE POLICY "castormind_tool_permissions_manage"
ON public.castormind_tool_permissions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'global_admin'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'global_admin'));

-- Seed baseline permissions (deny by default; explicit allows)
INSERT INTO public.castormind_tool_permissions (role, intent, is_allowed)
VALUES
  ('admin','delayed_projects',true),
  ('admin','due_payments',true),
  ('admin','update_tasks_until_today',true),
  ('admin','quotes_without_vendor_proposal',true),
  ('global_admin','delayed_projects',true),
  ('global_admin','due_payments',true),
  ('global_admin','update_tasks_until_today',true),
  ('global_admin','quotes_without_vendor_proposal',true),
  ('project_manager','delayed_projects',true),
  ('project_manager','due_payments',true),
  ('project_manager','update_tasks_until_today',true),
  ('project_manager','quotes_without_vendor_proposal',true),
  ('architect','delayed_projects',true),
  ('architect','due_payments',true),
  ('architect','update_tasks_until_today',false),
  ('architect','quotes_without_vendor_proposal',true),
  ('site_supervisor','delayed_projects',true),
  ('site_supervisor','due_payments',false),
  ('site_supervisor','update_tasks_until_today',true),
  ('site_supervisor','quotes_without_vendor_proposal',false),
  ('admin_office','delayed_projects',true),
  ('admin_office','due_payments',true),
  ('admin_office','update_tasks_until_today',false),
  ('admin_office','quotes_without_vendor_proposal',true),
  ('viewer','delayed_projects',true),
  ('viewer','due_payments',false),
  ('viewer','update_tasks_until_today',false),
  ('viewer','quotes_without_vendor_proposal',false),
  ('accountant','delayed_projects',true),
  ('accountant','due_payments',true),
  ('accountant','update_tasks_until_today',false),
  ('accountant','quotes_without_vendor_proposal',false)
ON CONFLICT (role, intent) DO UPDATE
SET is_allowed = EXCLUDED.is_allowed,
    updated_at = now();

-- 4) Retry queue
CREATE TABLE IF NOT EXISTS public.castormind_retry_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text,
  trace_id text,
  session_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role text,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  intent text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued', -- queued | processing | succeeded | exhausted | cancelled
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  next_run_at timestamptz NOT NULL DEFAULT now(),
  backoff_seconds integer NOT NULL DEFAULT 60,
  last_error text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (attempts >= 0),
  CHECK (max_attempts >= 1)
);

CREATE INDEX IF NOT EXISTS idx_castormind_retry_queue_status_next
  ON public.castormind_retry_queue (status, next_run_at);
CREATE INDEX IF NOT EXISTS idx_castormind_retry_queue_request_id
  ON public.castormind_retry_queue (request_id);
CREATE INDEX IF NOT EXISTS idx_castormind_retry_queue_created_at
  ON public.castormind_retry_queue (created_at DESC);

ALTER TABLE public.castormind_retry_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "castormind_retry_queue_select" ON public.castormind_retry_queue;
CREATE POLICY "castormind_retry_queue_select"
ON public.castormind_retry_queue
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager') OR has_role(auth.uid(), 'global_admin'));

DROP POLICY IF EXISTS "castormind_retry_queue_manage" ON public.castormind_retry_queue;
CREATE POLICY "castormind_retry_queue_manage"
ON public.castormind_retry_queue
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'global_admin'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'global_admin'));

COMMIT;

