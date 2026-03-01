-- Add support for assigning architect tasks to project team members
-- (in addition to / instead of direct user_profiles assignee_id).

ALTER TABLE IF EXISTS public.architect_tasks
  ADD COLUMN IF NOT EXISTS team_member_id uuid
  REFERENCES public.project_team_members(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_architect_tasks_team_member_id
  ON public.architect_tasks(team_member_id);

