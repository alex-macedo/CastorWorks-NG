-- ============================================================================
-- Configurable Task Statuses Migration
-- Created: 2025-12-27
-- Description: Make task statuses configurable per project
-- ============================================================================

-- ============================================================================
-- 1. CREATE PROJECT_TASK_STATUSES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_task_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL, -- URL-friendly identifier (e.g., 'in_progress')
  color TEXT NOT NULL, -- Hex color or Tailwind color class
  icon TEXT, -- Icon identifier (e.g., 'clock', 'check-circle')
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT false, -- Default status for new tasks
  is_completed BOOLEAN DEFAULT false, -- Marks task as completed
  is_system BOOLEAN DEFAULT false, -- System-defined, cannot be deleted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_project_slug UNIQUE(project_id, slug),
  CONSTRAINT unique_project_sort_order UNIQUE(project_id, sort_order) DEFERRABLE INITIALLY DEFERRED
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_task_statuses_project_id 
  ON project_task_statuses(project_id);
CREATE INDEX IF NOT EXISTS idx_project_task_statuses_sort_order
  ON project_task_statuses(project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_project_task_statuses_slug 
  ON project_task_statuses(project_id, slug);

-- ============================================================================
-- 2. CREATE DEFAULT TASK STATUSES FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION create_default_task_statuses(p_project_id UUID)
RETURNS void AS $$
BEGIN
  -- Insert default statuses for the project
  INSERT INTO project_task_statuses (
    project_id, 
    name, 
    slug, 
    color, 
    icon, 
     sort_order,
     is_default,
     is_completed,
     is_system
   )
   VALUES
     (p_project_id, 'Not Started', 'not_started', 'gray', 'circle', 0, true, false, true),
     (p_project_id, 'In Progress', 'in_progress', 'blue', 'clock', 1, false, false, true),
     (p_project_id, 'Completed', 'completed', 'green', 'check-circle', 2, false, true, true),
     (p_project_id, 'Blocked', 'blocked', 'red', 'alert-circle', 3, false, false, true)
  ON CONFLICT (project_id, slug) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. CREATE TRIGGER FOR NEW PROJECTS
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_create_default_task_statuses()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_task_statuses(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_project_created_create_task_statuses ON projects;
CREATE TRIGGER on_project_created_create_task_statuses
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_default_task_statuses();

-- ============================================================================
-- 4. BACKFILL DEFAULT STATUSES FOR EXISTING PROJECTS
-- ============================================================================

-- Create default statuses for all existing projects
DO $$
DECLARE
  project_record RECORD;
BEGIN
  FOR project_record IN SELECT id FROM projects LOOP
    PERFORM create_default_task_statuses(project_record.id);
  END LOOP;
END;
$$;

-- ============================================================================
-- 5. ADD STATUS_ID COLUMN TO ARCHITECT_TASKS
-- ============================================================================

-- Add new status_id column (nullable for migration)
ALTER TABLE architect_tasks 
  ADD COLUMN IF NOT EXISTS status_id UUID REFERENCES project_task_statuses(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_architect_tasks_status_id 
  ON architect_tasks(status_id);

-- ============================================================================
-- 6. BACKFILL STATUS_ID FROM EXISTING STATUS STRINGS
-- ============================================================================

-- Map existing status strings to status_id
DO $$
DECLARE
  task_record RECORD;
  status_id_value UUID;
BEGIN
  FOR task_record IN 
    SELECT id, project_id, status 
    FROM architect_tasks 
    WHERE status_id IS NULL 
  LOOP
    -- Find matching status by slug
    SELECT pts.id INTO status_id_value
    FROM project_task_statuses pts
    WHERE pts.project_id = task_record.project_id
      AND pts.slug = task_record.status
    LIMIT 1;
    
    -- If found, update the task
    IF status_id_value IS NOT NULL THEN
      UPDATE architect_tasks
      SET status_id = status_id_value
      WHERE id = task_record.id;
    ELSE
      -- If no matching status found, use default status
      SELECT pts.id INTO status_id_value
      FROM project_task_statuses pts
      WHERE pts.project_id = task_record.project_id
        AND pts.is_default = true
      LIMIT 1;
      
      IF status_id_value IS NOT NULL THEN
        UPDATE architect_tasks
        SET status_id = status_id_value
        WHERE id = task_record.id;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================================
-- 7. REMOVE CHECK CONSTRAINT FROM ARCHITECT_TASKS
-- ============================================================================

-- Drop the old status CHECK constraint
ALTER TABLE architect_tasks 
  DROP CONSTRAINT IF EXISTS architect_tasks_status_check;

-- Add comment to status column indicating it's deprecated
COMMENT ON COLUMN architect_tasks.status IS 
  'DEPRECATED: Use status_id instead. Kept for backward compatibility during migration.';

-- ============================================================================
-- 8. ADD UPDATED_AT TRIGGER
-- ============================================================================

-- Create trigger for updated_at timestamp
DROP TRIGGER IF EXISTS update_project_task_statuses_updated_at ON project_task_statuses;
CREATE TRIGGER update_project_task_statuses_updated_at
  BEFORE UPDATE ON project_task_statuses
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE project_task_statuses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view task statuses for accessible projects" ON project_task_statuses;
DROP POLICY IF EXISTS "Users can insert task statuses for their projects" ON project_task_statuses;
DROP POLICY IF EXISTS "Users can update task statuses for their projects" ON project_task_statuses;
DROP POLICY IF EXISTS "Users can delete custom task statuses" ON project_task_statuses;
DROP POLICY IF EXISTS "Admins have full access to task statuses" ON project_task_statuses;

-- Policy: Users can view task statuses for projects they have access to
CREATE POLICY "Users can view task statuses for accessible projects"
  ON project_task_statuses FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE id = project_task_statuses.project_id
    )
  );

-- Policy: Users can insert task statuses for their projects
CREATE POLICY "Users can insert task statuses for their projects"
  ON project_task_statuses FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE id = project_task_statuses.project_id
    )
  );

-- Policy: Users can update task statuses for their projects
CREATE POLICY "Users can update task statuses for their projects"
  ON project_task_statuses FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE id = project_task_statuses.project_id
    )
  );

-- Policy: Users can delete custom task statuses (not system ones)
CREATE POLICY "Users can delete custom task statuses"
  ON project_task_statuses FOR DELETE
  USING (
    is_system = false
    AND project_id IN (
      SELECT id FROM projects WHERE id = project_task_statuses.project_id
    )
  );

-- Policy: Admins have full access
CREATE POLICY "Admins have full access to task statuses"
  ON project_task_statuses FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 10. HELPER FUNCTIONS
-- ============================================================================

-- Function to get default status for a project
CREATE OR REPLACE FUNCTION get_default_task_status(p_project_id UUID)
RETURNS UUID AS $$
DECLARE
  default_status_id UUID;
BEGIN
  SELECT id INTO default_status_id
  FROM project_task_statuses
  WHERE project_id = p_project_id
    AND is_default = true
  LIMIT 1;
  
  RETURN default_status_id;
END;
$$ LANGUAGE plpgsql;

-- Function to validate status belongs to project
CREATE OR REPLACE FUNCTION validate_task_status(p_task_id UUID, p_status_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  task_project_id UUID;
  status_project_id UUID;
BEGIN
  -- Get task's project_id
  SELECT project_id INTO task_project_id
  FROM architect_tasks
  WHERE id = p_task_id;
  
  -- Get status's project_id
  SELECT project_id INTO status_project_id
  FROM project_task_statuses
  WHERE id = p_status_id;
  
  -- Return true if they match
  RETURN task_project_id = status_project_id;
END;
$$ LANGUAGE plpgsql;

-- Function to reassign tasks when status is deleted
CREATE OR REPLACE FUNCTION reassign_tasks_on_status_delete()
RETURNS TRIGGER AS $$
DECLARE
  default_status_id UUID;
BEGIN
  -- Get the default status for this project
  SELECT id INTO default_status_id
  FROM project_task_statuses
  WHERE project_id = OLD.project_id
    AND is_default = true
  LIMIT 1;
  
  -- Reassign all tasks with this status to the default status
  UPDATE architect_tasks
  SET status_id = default_status_id
  WHERE status_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status deletion
DROP TRIGGER IF EXISTS on_task_status_delete_reassign_tasks ON project_task_statuses;
CREATE TRIGGER on_task_status_delete_reassign_tasks
  BEFORE DELETE ON project_task_statuses
  FOR EACH ROW
  EXECUTE FUNCTION reassign_tasks_on_status_delete();

-- Function to prevent deleting default status
CREATE OR REPLACE FUNCTION prevent_delete_default_status()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_default = true THEN
    -- Check if there's another default status for this project
    IF NOT EXISTS (
      SELECT 1 FROM project_task_statuses
      WHERE project_id = OLD.project_id
        AND id != OLD.id
        AND is_default = true
    ) THEN
      RAISE EXCEPTION 'Cannot delete the only default status for a project';
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent deleting default status
DROP TRIGGER IF EXISTS prevent_delete_only_default_status ON project_task_statuses;
CREATE TRIGGER prevent_delete_only_default_status
  BEFORE DELETE ON project_task_statuses
  FOR EACH ROW
  EXECUTE FUNCTION prevent_delete_default_status();

-- ============================================================================
-- 11. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE project_task_statuses IS 
  'Configurable task statuses per project. Each project can define custom workflow columns.';

COMMENT ON COLUMN project_task_statuses.slug IS 
  'URL-friendly identifier used for routing and API calls';

COMMENT ON COLUMN project_task_statuses.is_default IS 
  'Default status assigned to new tasks. Each project should have exactly one default status.';

COMMENT ON COLUMN project_task_statuses.is_completed IS 
  'Indicates this status represents a completed state for analytics and filtering';

COMMENT ON COLUMN project_task_statuses.is_system IS 
  'System-defined status that cannot be deleted (but can be renamed/reordered)';

COMMENT ON COLUMN project_task_statuses.sort_order IS
  'Order in which status columns appear in the task board (0-indexed)';

-- ============================================================================
-- 12. FIX EXISTING CONSTRAINT TO BE DEFERRABLE
-- ============================================================================

-- Drop the existing constraint if it exists (for tables already created)
ALTER TABLE project_task_statuses
  DROP CONSTRAINT IF EXISTS unique_project_sort_order;

-- Recreate it as deferrable
ALTER TABLE project_task_statuses
  ADD CONSTRAINT unique_project_sort_order
  UNIQUE(project_id, sort_order)
  DEFERRABLE INITIALLY DEFERRED;

-- ============================================================================
-- 13. RPC FUNCTION FOR REORDERING (Handles transaction properly)
-- ============================================================================

CREATE OR REPLACE FUNCTION reorder_project_task_statuses(
  p_project_id UUID,
  p_status_ids UUID[]
)
RETURNS void AS $$
DECLARE
  i INTEGER;
BEGIN
  -- Set constraint to deferred for this transaction
  SET CONSTRAINTS unique_project_sort_order DEFERRED;

  FOR i IN 1..array_length(p_status_ids, 1) LOOP
    UPDATE project_task_statuses
    SET sort_order = i - 1  -- 0-indexed
    WHERE id = p_status_ids[i]
      AND project_id = p_project_id;
  END LOOP;
  
  -- Constraint will be checked when transaction commits
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION reorder_project_task_statuses(UUID, UUID[]) TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
