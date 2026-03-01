-- Migration: Ensure project_task_statuses has sort_order column
-- This migration ensures that the project_task_statuses table has the correct sort_order column
-- and removes any leftover display_order column if it exists

-- 1. Add sort_order column if it doesn't exist
ALTER TABLE project_task_statuses ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 2. Remove display_order column if it exists (cleanup from old schema)
ALTER TABLE project_task_statuses DROP COLUMN IF EXISTS display_order;

-- 3. Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_project_task_statuses_sort_order
ON project_task_statuses(project_id, sort_order);
