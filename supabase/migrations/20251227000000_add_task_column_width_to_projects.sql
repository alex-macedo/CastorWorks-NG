-- Add task_column_width field to projects table
-- This allows each project to have a configurable column width for the task board
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS task_column_width INTEGER DEFAULT 416;

-- Add a check constraint to ensure the width is within reasonable bounds (200px - 800px)
ALTER TABLE projects
ADD CONSTRAINT task_column_width_range CHECK (task_column_width >= 200 AND task_column_width <= 800);

-- Add a comment to document the field
COMMENT ON COLUMN projects.task_column_width IS 'Width in pixels for task board columns (200-800px, default: 416px)';
