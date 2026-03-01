-- Add auto_cascade column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS auto_cascade BOOLEAN DEFAULT FALSE;

-- Add description comment
COMMENT ON COLUMN projects.auto_cascade IS 'Whether to automatically recalculate milestone dates upon dependency or delay changes.';
