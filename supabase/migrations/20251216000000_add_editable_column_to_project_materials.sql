-- Migration: Add editable column to project_materials table
-- Description: Add a boolean column to control whether materials can be edited
-- Default value is true (editable)

BEGIN;

-- Add editable column with default value true
ALTER TABLE project_materials 
ADD COLUMN IF NOT EXISTS editable BOOLEAN NOT NULL DEFAULT true;

-- Add index for filtering editable materials
CREATE INDEX IF NOT EXISTS idx_project_materials_editable 
ON project_materials(editable);

-- Add comment to explain the column
COMMENT ON COLUMN project_materials.editable IS 
'Controls whether this material can be edited. Default is true (editable).';

COMMIT;
