-- Fix foreign key constraint on client_tasks.assigned_to
-- The original constraint prevented deletion of team members with assigned tasks
-- This migration adds ON DELETE SET NULL to allow team member deletion
-- When a team member is deleted, their assigned tasks will have NULL for assigned_to

BEGIN;

-- Drop the existing foreign key constraint
ALTER TABLE client_tasks
DROP CONSTRAINT client_tasks_assigned_to_fkey;

-- Add the new constraint with ON DELETE SET NULL
-- This allows team members to be deleted, leaving tasks unassigned
ALTER TABLE client_tasks
ADD CONSTRAINT client_tasks_assigned_to_fkey
  FOREIGN KEY (assigned_to)
  REFERENCES project_team_members(id)
  ON DELETE SET NULL;

COMMIT;
