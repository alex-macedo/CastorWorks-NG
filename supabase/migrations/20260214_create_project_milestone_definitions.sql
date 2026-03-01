-- Migration: Create project milestone definitions table
-- Purpose: Track milestone definitions, justifications, and comments
-- Date: 2026-02-14

BEGIN;

-- Table to store milestone definitions and comments
CREATE TABLE IF NOT EXISTS project_milestone_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES project_phases(id) ON DELETE CASCADE,
  milestone_name TEXT NOT NULL,
  target_date DATE NOT NULL,
  actual_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'delayed')),
  definition_text TEXT,
  justification_text TEXT,
  comments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE project_milestone_definitions IS
'Stores milestone definitions, justifications, and comments for project timeline tracking. Milestones represent key delivery points like Fundação (Foundation), 1º Laje (First Slab), Portas Internas (Interior Doors), etc.';

COMMENT ON COLUMN project_milestone_definitions.milestone_name IS 'Name of the milestone (e.g., Fundação, 1º Laje, Portas Internas)';
COMMENT ON COLUMN project_milestone_definitions.target_date IS 'Planned target date for milestone completion';
COMMENT ON COLUMN project_milestone_definitions.actual_date IS 'Actual completion date (null if not yet completed)';
COMMENT ON COLUMN project_milestone_definitions.status IS 'Current status: pending (not started), completed (finished), delayed (behind schedule)';
COMMENT ON COLUMN project_milestone_definitions.definition_text IS 'Detailed definition of what this milestone entails';
COMMENT ON COLUMN project_milestone_definitions.justification_text IS 'Justification for the milestone or explanation if delayed';
COMMENT ON COLUMN project_milestone_definitions.comments IS 'Array of comment objects: [{ id, userId, userName, text, timestamp }]';

-- RLS Policies
ALTER TABLE project_milestone_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view milestone definitions for accessible projects"
  ON project_milestone_definitions FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Admins and project managers can create milestone definitions"
  ON project_milestone_definitions FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'project_manager') OR
    has_role(auth.uid(), 'admin_office')
  );

CREATE POLICY "Admins and project managers can update milestone definitions"
  ON project_milestone_definitions FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'project_manager') OR
    has_role(auth.uid(), 'admin_office')
  );

CREATE POLICY "Admins can delete milestone definitions"
  ON project_milestone_definitions FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX idx_milestone_definitions_project
  ON project_milestone_definitions(project_id);

CREATE INDEX idx_milestone_definitions_phase
  ON project_milestone_definitions(phase_id);

CREATE INDEX idx_milestone_definitions_target_date
  ON project_milestone_definitions(target_date);

CREATE INDEX idx_milestone_definitions_status
  ON project_milestone_definitions(status)
  WHERE status != 'completed';

-- Updated_at trigger
CREATE TRIGGER update_milestone_definitions_updated_at
  BEFORE UPDATE ON project_milestone_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
