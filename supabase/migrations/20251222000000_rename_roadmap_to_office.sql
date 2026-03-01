-- Rename roadmap_phases to office_phases
ALTER TABLE public.roadmap_phases RENAME TO office_phases;

-- Rename roadmap_tasks to office_tasks
ALTER TABLE public.roadmap_tasks RENAME TO office_tasks;

-- Rename roadmap_task_updates to office_task_updates
ALTER TABLE public.roadmap_task_updates RENAME TO office_task_updates;

-- Rename Foreign Key Constraints
ALTER TABLE public.office_tasks RENAME CONSTRAINT roadmap_tasks_phase_id_fkey TO office_tasks_phase_id_fkey;
ALTER TABLE public.office_task_updates RENAME CONSTRAINT roadmap_task_updates_task_id_fkey TO office_task_updates_task_id_fkey;

-- Rename Indexes
ALTER INDEX public.idx_roadmap_phases_phase_number RENAME TO idx_office_phases_phase_number;
ALTER INDEX public.idx_roadmap_phases_status RENAME TO idx_office_phases_status;

ALTER INDEX public.idx_roadmap_tasks_phase_id RENAME TO idx_office_tasks_phase_id;
ALTER INDEX public.idx_roadmap_tasks_status RENAME TO idx_office_tasks_status;
ALTER INDEX public.idx_roadmap_tasks_priority RENAME TO idx_office_tasks_priority;
ALTER INDEX public.idx_roadmap_tasks_assigned_user_id RENAME TO idx_office_tasks_assigned_user_id;
ALTER INDEX public.idx_roadmap_tasks_category RENAME TO idx_office_tasks_category;

ALTER INDEX public.idx_roadmap_task_updates_task_id RENAME TO idx_office_task_updates_task_id;
ALTER INDEX public.idx_roadmap_task_updates_user_id RENAME TO idx_office_task_updates_user_id;
ALTER INDEX public.idx_roadmap_task_updates_created_at RENAME TO idx_office_task_updates_created_at;

-- Rename Triggers
ALTER TRIGGER update_roadmap_phases_updated_at ON public.office_phases RENAME TO update_office_phases_updated_at;
ALTER TRIGGER update_roadmap_tasks_updated_at ON public.office_tasks RENAME TO update_office_tasks_updated_at;

-- Update RLS Policies
DROP POLICY IF EXISTS "authenticated_select_roadmap_phases" ON public.office_phases;
CREATE POLICY "authenticated_select_office_phases"
  ON public.office_phases FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "admin_pm_manage_roadmap_phases" ON public.office_phases;
CREATE POLICY "admin_pm_manage_office_phases"
  ON public.office_phases FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'project_manager'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'project_manager'::app_role)
  );

DROP POLICY IF EXISTS "authenticated_select_roadmap_tasks" ON public.office_tasks;
CREATE POLICY "authenticated_select_office_tasks"
  ON public.office_tasks FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "admin_pm_manage_roadmap_tasks" ON public.office_tasks;
CREATE POLICY "admin_pm_manage_office_tasks"
  ON public.office_tasks FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'project_manager'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'project_manager'::app_role)
  );

DROP POLICY IF EXISTS "authenticated_select_roadmap_task_updates" ON public.office_task_updates;
CREATE POLICY "authenticated_select_office_task_updates"
  ON public.office_task_updates FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "authenticated_insert_office_task_updates" ON public.office_task_updates;
CREATE POLICY "authenticated_insert_office_task_updates"
  ON public.office_task_updates FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Update Table/Column Comments
COMMENT ON TABLE public.office_phases IS 'Office/Team workspace phases for organizing tasks';
COMMENT ON TABLE public.office_tasks IS 'Tasks associated with office phases';
COMMENT ON TABLE public.office_task_updates IS 'Audit trail for office task updates';
