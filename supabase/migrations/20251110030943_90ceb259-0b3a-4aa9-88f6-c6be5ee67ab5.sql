-- Add phase_id to project_activities table to link activities to phases
ALTER TABLE project_activities 
ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES project_phases(id) ON DELETE CASCADE;

-- Create index for performance when querying activities by phase
CREATE INDEX IF NOT EXISTS idx_project_activities_phase_id ON project_activities(phase_id);

-- Add comment for documentation
COMMENT ON COLUMN project_activities.phase_id IS 'Links activity to its parent phase for hierarchical project planning';
