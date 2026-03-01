-- ============================================================================
-- Fix Task Statuses RLS Policies
-- Created: 2025-12-27
-- Description: Fix RLS policies to properly check project access
-- ============================================================================

BEGIN;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view task statuses for accessible projects" ON project_task_statuses;
DROP POLICY IF EXISTS "Users can insert task statuses for their projects" ON project_task_statuses;
DROP POLICY IF EXISTS "Users can update task statuses for their projects" ON project_task_statuses;
DROP POLICY IF EXISTS "Users can delete custom task statuses" ON project_task_statuses;
DROP POLICY IF EXISTS "Admins have full access to task statuses" ON project_task_statuses;

-- Policy: Users can view task statuses for projects they have access to
CREATE POLICY "Users can view task statuses for accessible projects"
  ON project_task_statuses FOR SELECT
  USING (
    has_project_access(auth.uid(), project_id)
  );

-- Policy: Users can insert task statuses for their projects (PM/Admin only)
CREATE POLICY "Users can insert task statuses for their projects"
  ON project_task_statuses FOR INSERT
  WITH CHECK (
    has_project_access(auth.uid(), project_id)
    AND (has_role(auth.uid(), 'project_manager') OR has_role(auth.uid(), 'admin'))
  );

-- Policy: Users can update task statuses for their projects (PM/Admin only)
CREATE POLICY "Users can update task statuses for their projects"
  ON project_task_statuses FOR UPDATE
  USING (
    has_project_access(auth.uid(), project_id)
    AND (has_role(auth.uid(), 'project_manager') OR has_role(auth.uid(), 'admin'))
  );

-- Policy: Users can delete custom task statuses (PM/Admin only, not system statuses)
CREATE POLICY "Users can delete custom task statuses"
  ON project_task_statuses FOR DELETE
  USING (
    is_system = false
    AND has_project_access(auth.uid(), project_id)
    AND (has_role(auth.uid(), 'project_manager') OR has_role(auth.uid(), 'admin'))
  );

-- Policy: Admins have full access
CREATE POLICY "Admins have full access to task statuses"
  ON project_task_statuses FOR ALL
  USING (has_role(auth.uid(), 'admin'));

COMMIT;
