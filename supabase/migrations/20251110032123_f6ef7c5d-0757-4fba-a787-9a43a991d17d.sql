-- Create milestones table
CREATE TABLE IF NOT EXISTS project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES project_phases(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'achieved', 'missed')),
  achieved_date DATE,
  notify_days_before INTEGER DEFAULT 7,
  notification_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_due_date ON project_milestones(due_date);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON project_milestones(status);

-- Enable RLS
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view milestones for accessible projects" ON project_milestones;
CREATE POLICY "Users can view milestones for accessible projects"
  ON project_milestones FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can insert milestones" ON project_milestones;
CREATE POLICY "Project admins can insert milestones"
  ON project_milestones FOR INSERT
  WITH CHECK (has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can update milestones" ON project_milestones;
CREATE POLICY "Project admins can update milestones"
  ON project_milestones FOR UPDATE
  USING (has_project_admin_access(auth.uid(), project_id))
  WITH CHECK (has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can delete milestones" ON project_milestones;
CREATE POLICY "Project admins can delete milestones"
  ON project_milestones FOR DELETE
  USING (has_project_admin_access(auth.uid(), project_id));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_milestone_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_milestone_timestamp ON project_milestones;
CREATE TRIGGER update_milestone_timestamp
  BEFORE UPDATE ON project_milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_milestone_updated_at();

-- Add comment
COMMENT ON TABLE project_milestones IS 'Tracks project milestones with notification and achievement tracking';
