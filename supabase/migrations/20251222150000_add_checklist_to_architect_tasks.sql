-- Add checklist functionality to architect tasks
-- Created: 2025-12-22
-- Description: Add checklist_items JSONB field to architect_tasks table

-- Add checklist_items field to architect_tasks table
ALTER TABLE architect_tasks
ADD COLUMN IF NOT EXISTS checklist_items JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN architect_tasks.checklist_items IS 'Array of checklist items with structure: [{id: string, text: string, completed: boolean, created_at: timestamp}]';

-- Create index for better query performance on checklist items
CREATE INDEX IF NOT EXISTS idx_architect_tasks_checklist_items ON architect_tasks USING GIN (checklist_items);