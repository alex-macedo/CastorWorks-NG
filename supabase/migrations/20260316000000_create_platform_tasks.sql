-- Create platform_tasks table for the Platform workspace task management feature
BEGIN;

CREATE TABLE public.platform_tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'todo'
                CHECK (status IN ('todo','in_progress','done','cancelled')),
  priority    TEXT NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low','medium','high','urgent')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date    DATE,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_platform_tasks_status     ON public.platform_tasks(status);
CREATE INDEX idx_platform_tasks_assigned   ON public.platform_tasks(assigned_to);
CREATE INDEX idx_platform_tasks_created_by ON public.platform_tasks(created_by);

ALTER TABLE public.platform_tasks ENABLE ROW LEVEL SECURITY;

-- Any platform role can view tasks
CREATE POLICY "platform_tasks_select"
  ON public.platform_tasks FOR SELECT
  USING (
    has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'platform_support'::app_role)
    OR has_role(auth.uid(), 'platform_sales'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Any platform role can create tasks
CREATE POLICY "platform_tasks_insert"
  ON public.platform_tasks FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'platform_support'::app_role)
    OR has_role(auth.uid(), 'platform_sales'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Any platform role can update tasks
CREATE POLICY "platform_tasks_update"
  ON public.platform_tasks FOR UPDATE
  USING (
    has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'platform_support'::app_role)
    OR has_role(auth.uid(), 'platform_sales'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'platform_support'::app_role)
    OR has_role(auth.uid(), 'platform_sales'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Only platform_owner / super_admin can delete tasks
CREATE POLICY "platform_tasks_delete"
  ON public.platform_tasks FOR DELETE
  USING (
    has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE TRIGGER update_platform_tasks_updated_at
  BEFORE UPDATE ON public.platform_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
