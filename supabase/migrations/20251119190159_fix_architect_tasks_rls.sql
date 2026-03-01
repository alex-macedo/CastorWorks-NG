-- Fix RLS policies for architect_tasks table
-- The original policies were checking if project exists, not if user has access

-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Users can view tasks for accessible projects" ON architect_tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON architect_tasks;

-- Create correct policies using has_project_access function
CREATE POLICY "Users can view tasks for accessible projects"
  ON architect_tasks FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can update tasks"
  ON architect_tasks FOR UPDATE
  USING (has_project_access(auth.uid(), project_id))
  WITH CHECK (has_project_access(auth.uid(), project_id));

