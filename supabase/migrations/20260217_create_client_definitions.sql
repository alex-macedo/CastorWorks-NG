-- ============================================================
-- Client Definitions: Track client decision-making progress
-- ============================================================

BEGIN;

CREATE TYPE client_definition_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'overdue',
  'blocking'
);

CREATE TABLE client_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES project_milestone_definitions(id) ON DELETE SET NULL,
  definition_item TEXT NOT NULL,
  description TEXT,
  required_by_date DATE NOT NULL,
  status client_definition_status DEFAULT 'pending',
  assigned_client_contact TEXT,
  impact_score INTEGER DEFAULT 0 CHECK (impact_score BETWEEN 0 AND 100),
  completion_date DATE,
  notes TEXT,
  follow_up_history JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_client_definitions_project ON client_definitions(project_id);
CREATE INDEX idx_client_definitions_milestone ON client_definitions(milestone_id);
CREATE INDEX idx_client_definitions_status ON client_definitions(status);
CREATE INDEX idx_client_definitions_due ON client_definitions(required_by_date)
  WHERE status NOT IN ('completed');

-- Updated_at trigger
CREATE TRIGGER set_client_definitions_updated_at
  BEFORE UPDATE ON client_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE client_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view definitions for accessible projects"
  ON client_definitions FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers can create client definitions"
  ON client_definitions FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'project_manager'::app_role) OR
    has_role(auth.uid(), 'admin_office'::app_role)
  );

CREATE POLICY "Managers can update client definitions"
  ON client_definitions FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'project_manager'::app_role) OR
    has_role(auth.uid(), 'admin_office'::app_role)
  );

CREATE POLICY "Admins can delete client definitions"
  ON client_definitions FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

COMMIT;
