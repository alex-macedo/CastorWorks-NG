-- Create project_labor table for labor templates tied to projects
CREATE TABLE IF NOT EXISTS public.project_labor (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  "group" TEXT NOT NULL,
  description TEXT NOT NULL,
  total_value NUMERIC DEFAULT 0,
  percentage NUMERIC DEFAULT 0,
  editable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.project_labor ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_project_labor_project_id
  ON public.project_labor(project_id);

DROP POLICY IF EXISTS "project_labor_select_policy" ON public.project_labor;
CREATE POLICY "project_labor_select_policy"
  ON public.project_labor
  FOR SELECT
  TO authenticated
  USING (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "project_labor_insert_policy" ON public.project_labor;
CREATE POLICY "project_labor_insert_policy"
  ON public.project_labor
  FOR INSERT
  TO authenticated
  WITH CHECK (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "project_labor_update_policy" ON public.project_labor;
CREATE POLICY "project_labor_update_policy"
  ON public.project_labor
  FOR UPDATE
  TO authenticated
  USING (has_project_access(auth.uid(), project_id))
  WITH CHECK (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "project_labor_delete_policy" ON public.project_labor;
CREATE POLICY "project_labor_delete_policy"
  ON public.project_labor
  FOR DELETE
  TO authenticated
  USING (has_project_access(auth.uid(), project_id));

DROP TRIGGER IF EXISTS update_project_labor_updated_at ON public.project_labor;
CREATE TRIGGER update_project_labor_updated_at
  BEFORE UPDATE ON public.project_labor
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
