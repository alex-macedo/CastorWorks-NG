-- Migration: Add architect role to project_task_statuses RLS policies
-- Date: 2026-02-01
-- Description: Allows architects to modify task statuses for projects they have access to

BEGIN;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "project_task_statuses_select" ON project_task_statuses;
DROP POLICY IF EXISTS "project_task_statuses_insert" ON project_task_statuses;
DROP POLICY IF EXISTS "project_task_statuses_update" ON project_task_statuses;
DROP POLICY IF EXISTS "project_task_statuses_delete" ON project_task_statuses;
DROP POLICY IF EXISTS "project_task_statuses_all" ON project_task_statuses;
DROP POLICY IF EXISTS "project_task_statuses_modify" ON project_task_statuses;

-- Create unified policy for all operations
-- Allows architects to modify task statuses for projects they have access to
CREATE POLICY "project_task_statuses_all"
  ON project_task_statuses FOR ALL
  USING (
    has_project_access(auth.uid(), project_id) AND
    (
      has_role(auth.uid(), 'admin') OR
      has_role(auth.uid(), 'project_manager') OR
      has_role(auth.uid(), 'admin_office') OR
      has_role(auth.uid(), 'site_supervisor') OR
      has_role(auth.uid(), 'architect')
    )
  )
  WITH CHECK (
    has_project_access(auth.uid(), project_id) AND
    (
      has_role(auth.uid(), 'admin') OR
      has_role(auth.uid(), 'project_manager') OR
      has_role(auth.uid(), 'admin_office') OR
      has_role(auth.uid(), 'site_supervisor') OR
      has_role(auth.uid(), 'architect')
    )
  );

COMMIT;
