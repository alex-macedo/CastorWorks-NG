-- Migration: Complete fix for project_task_statuses
-- Issue: Rename migration (20251231...) incorrectly tried to UPDATE from non-existent display_order column
--        and failed to properly recreate task status functions and trigger
-- Solution: Drop broken components, recreate from original migration, ensure constraints are correct

-- 1. CLEAN UP: Drop orphaned/broken components
DROP TRIGGER IF EXISTS on_project_created_create_task_statuses ON projects;
DROP FUNCTION IF EXISTS trigger_create_default_task_statuses();
DROP FUNCTION IF EXISTS create_default_task_statuses(UUID);
DROP FUNCTION IF EXISTS reorder_project_task_statuses(UUID, UUID[]);

-- 2. RECREATE: create_default_task_statuses function (from original migration)
-- This function creates 4 default task statuses for a new project
CREATE OR REPLACE FUNCTION public.create_default_task_statuses(p_project_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.project_task_statuses (
    project_id,
    name,
    slug,
    color,
    icon,
    sort_order,
    is_default,
    is_completed,
    is_system
  ) VALUES
    (p_project_id, 'Not Started', 'not_started', '#9CA3AF', 'circle-outline', 0, true, false, true),
    (p_project_id, 'In Progress', 'in_progress', '#3B82F6', 'clock-outline', 1, false, false, true),
    (p_project_id, 'Completed', 'completed', '#10B981', 'checkmark-circle-outline', 2, false, true, true),
    (p_project_id, 'Blocked', 'blocked', '#EF4444', 'alert-circle-outline', 3, false, false, true)
  ON CONFLICT (project_id, slug) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 3. RECREATE: trigger_create_default_task_statuses wrapper function
CREATE OR REPLACE FUNCTION public.trigger_create_default_task_statuses()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.create_default_task_statuses(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. RECREATE: reorder_project_task_statuses function for drag-drop functionality
CREATE OR REPLACE FUNCTION public.reorder_project_task_statuses(
  p_project_id UUID,
  p_status_ids UUID[]
)
RETURNS void AS $$
DECLARE
  i INTEGER;
BEGIN
  SET CONSTRAINTS unique_project_sort_order DEFERRED;
  FOR i IN 1..array_length(p_status_ids, 1) LOOP
    UPDATE public.project_task_statuses
    SET sort_order = i - 1
    WHERE id = p_status_ids[i]
      AND project_id = p_project_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. RECREATE: Trigger that fires on project creation
CREATE TRIGGER on_project_created_create_task_statuses
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_create_default_task_statuses();

-- 6. GRANT: Execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.create_default_task_statuses(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_project_task_statuses(UUID, UUID[]) TO authenticated;

-- 7. CLEANUP: Remove any lingering display_order artifacts if they exist
-- (These would have been created in error by the rename migration)
ALTER TABLE public.project_task_statuses DROP COLUMN IF EXISTS display_order;
DROP INDEX IF EXISTS public.idx_project_task_statuses_display_order;
ALTER TABLE public.project_task_statuses DROP CONSTRAINT IF EXISTS unique_project_display_order;

-- 8. VERIFY: Ensure the unique constraint on sort_order exists
-- This constraint is critical for maintaining sort order integrity per project
DO $$
BEGIN
  -- Drop the constraint if it already exists
  ALTER TABLE public.project_task_statuses DROP CONSTRAINT IF EXISTS unique_project_sort_order;
  
  -- Now create it fresh
  ALTER TABLE public.project_task_statuses
  ADD CONSTRAINT unique_project_sort_order
    UNIQUE(project_id, sort_order)
    DEFERRABLE INITIALLY DEFERRED;
EXCEPTION WHEN OTHERS THEN
  -- Handle any unexpected errors
  NULL;
END $$;

-- 9. VERIFY: Ensure proper RLS policies are in place for task statuses
-- Select policy
DROP POLICY IF EXISTS "Users can view project task statuses" ON public.project_task_statuses;
CREATE POLICY "Users can view project task statuses"
  ON public.project_task_statuses
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.project_team_members
      WHERE project_id = public.project_task_statuses.project_id
    )
    OR auth.uid() IN (
      SELECT owner_id FROM public.projects
      WHERE id = public.project_task_statuses.project_id
    )
  );

-- Insert policy
DROP POLICY IF EXISTS "Users can insert task statuses in their projects" ON public.project_task_statuses;
CREATE POLICY "Users can insert task statuses in their projects"
  ON public.project_task_statuses
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.project_team_members
      WHERE project_id = project_task_statuses.project_id
        AND role IN ('owner', 'manager', 'admin')
    )
  );

-- Update policy
DROP POLICY IF EXISTS "Users can update task statuses in their projects" ON public.project_task_statuses;
CREATE POLICY "Users can update task statuses in their projects"
  ON public.project_task_statuses
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.project_team_members
      WHERE project_id = project_task_statuses.project_id
        AND role IN ('owner', 'manager', 'admin')
    )
  );

-- Delete policy
DROP POLICY IF EXISTS "Users can delete task statuses from their projects" ON public.project_task_statuses;
CREATE POLICY "Users can delete task statuses from their projects"
  ON public.project_task_statuses
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.project_team_members
      WHERE project_id = project_task_statuses.project_id
        AND role IN ('owner', 'manager', 'admin')
    )
  );

-- 10. Ensure table has RLS enabled
ALTER TABLE public.project_task_statuses ENABLE ROW LEVEL SECURITY;

-- Explicit index for sort_order queries (performance)
CREATE INDEX IF NOT EXISTS idx_project_task_statuses_sort_order
  ON public.project_task_statuses(project_id, sort_order);
