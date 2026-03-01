
-- =====================================================
-- DROP EXISTING OBJECTS (for idempotency)
-- =====================================================
DROP TRIGGER IF EXISTS update_project_team_members_updated_at ON project_team_members;
DROP TRIGGER IF EXISTS update_client_tasks_updated_at ON client_tasks;
DROP TRIGGER IF EXISTS set_client_task_completed_at ON client_tasks;
DROP TRIGGER IF EXISTS update_communication_logs_updated_at ON communication_logs;

DROP TABLE IF EXISTS communication_attachments CASCADE;
DROP TABLE IF EXISTS communication_participants CASCADE;
DROP TABLE IF EXISTS communication_logs CASCADE;
DROP TABLE IF EXISTS client_tasks CASCADE;
DROP TABLE IF EXISTS project_team_members CASCADE;

DROP FUNCTION IF EXISTS set_task_completed_at() CASCADE;

-- Ensure uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Utility function to auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PROJECT TEAM MEMBERS
-- =====================================================
-- Table for project team directory visible in client portal
CREATE TABLE project_team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_visible_to_client BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_project_team_members_project_id ON project_team_members(project_id);
CREATE INDEX idx_project_team_members_user_id ON project_team_members(user_id);
CREATE INDEX idx_project_team_members_sort_order ON project_team_members(sort_order);

-- Enable RLS
ALTER TABLE project_team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Clients can view team members via token
DROP POLICY IF EXISTS "Clients can view team members via token" ON project_team_members;
CREATE POLICY "Clients can view team members via token"
  ON project_team_members FOR SELECT
  USING (
    is_visible_to_client = true
    AND project_id IN (
      SELECT project_id FROM client_portal_tokens 
      WHERE token = current_setting('request.jwt.claims', true)::json->>'portal_token'
      AND (expires_at IS NULL OR expires_at > NOW())
      AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Team members can manage team directory" ON project_team_members;
CREATE POLICY "Team members can manage team directory"
  ON project_team_members FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_team_members 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_team_members 
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- CLIENT TASKS
-- =====================================================
-- Table for client-relevant tasks
CREATE TABLE client_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('pending', 'in-progress', 'completed', 'blocked')) DEFAULT 'pending',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  due_date DATE,
  assigned_to UUID REFERENCES project_team_members(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX idx_client_tasks_project_id ON client_tasks(project_id);
CREATE INDEX idx_client_tasks_status ON client_tasks(status);
CREATE INDEX idx_client_tasks_due_date ON client_tasks(due_date);
CREATE INDEX idx_client_tasks_assigned_to ON client_tasks(assigned_to);

-- Enable RLS
ALTER TABLE client_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Clients can view tasks via token
DROP POLICY IF EXISTS "Clients can view tasks via token" ON client_tasks;
CREATE POLICY "Clients can view tasks via token"
  ON client_tasks FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM client_portal_tokens 
      WHERE token = current_setting('request.jwt.claims', true)::json->>'portal_token'
      AND (expires_at IS NULL OR expires_at > NOW())
      AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Team members can manage tasks" ON client_tasks;
CREATE POLICY "Team members can manage tasks"
  ON client_tasks FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_team_members 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_team_members 
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- COMMUNICATION LOGS
-- =====================================================
-- Table for communication history
CREATE TABLE communication_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('meeting', 'email', 'phone-call', 'message')) NOT NULL,
  date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_communication_logs_project_id ON communication_logs(project_id);
CREATE INDEX idx_communication_logs_type ON communication_logs(type);
CREATE INDEX idx_communication_logs_date_time ON communication_logs(date_time);

-- Enable RLS
ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Clients can view communication logs via token
DROP POLICY IF EXISTS "Clients can view communication logs via token" ON communication_logs;
CREATE POLICY "Clients can view communication logs via token"
  ON communication_logs FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM client_portal_tokens 
      WHERE token = current_setting('request.jwt.claims', true)::json->>'portal_token'
      AND (expires_at IS NULL OR expires_at > NOW())
      AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Team members can manage communication logs" ON communication_logs;
CREATE POLICY "Team members can manage communication logs"
  ON communication_logs FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_team_members 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_team_members 
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- COMMUNICATION PARTICIPANTS
-- =====================================================
-- Table for communication participants
CREATE TABLE communication_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  communication_id UUID NOT NULL REFERENCES communication_logs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_communication_participants_communication_id ON communication_participants(communication_id);

-- Enable RLS
ALTER TABLE communication_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Participants visible if communication is visible
DROP POLICY IF EXISTS "Participants visible if communication is visible" ON communication_participants;
CREATE POLICY "Participants visible if communication is visible"
  ON communication_participants FOR SELECT
  USING (
    communication_id IN (
      SELECT id FROM communication_logs
      WHERE project_id IN (
        SELECT project_id FROM client_portal_tokens 
        WHERE token = current_setting('request.jwt.claims', true)::json->>'portal_token'
        AND (expires_at IS NULL OR expires_at > NOW())
        AND is_active = true
      )
    )
  );

DROP POLICY IF EXISTS "Team members can manage participants" ON communication_participants;
CREATE POLICY "Team members can manage participants"
  ON communication_participants FOR ALL
  USING (
    communication_id IN (
      SELECT id FROM communication_logs
      WHERE project_id IN (
        SELECT project_id FROM project_team_members 
        WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    communication_id IN (
      SELECT id FROM communication_logs
      WHERE project_id IN (
        SELECT project_id FROM project_team_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- COMMUNICATION ATTACHMENTS
-- =====================================================
-- Table for communication attachments
CREATE TABLE communication_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  communication_id UUID NOT NULL REFERENCES communication_logs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  size INTEGER,
  type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_communication_attachments_communication_id ON communication_attachments(communication_id);

-- Enable RLS
ALTER TABLE communication_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Attachments visible if communication is visible
DROP POLICY IF EXISTS "Attachments visible if communication is visible" ON communication_attachments;
CREATE POLICY "Attachments visible if communication is visible"
  ON communication_attachments FOR SELECT
  USING (
    communication_id IN (
      SELECT id FROM communication_logs
      WHERE project_id IN (
        SELECT project_id FROM client_portal_tokens 
        WHERE token = current_setting('request.jwt.claims', true)::json->>'portal_token'
        AND (expires_at IS NULL OR expires_at > NOW())
        AND is_active = true
      )
    )
  );

DROP POLICY IF EXISTS "Team members can manage attachments" ON communication_attachments;
CREATE POLICY "Team members can manage attachments"
  ON communication_attachments FOR ALL
  USING (
    communication_id IN (
      SELECT id FROM communication_logs
      WHERE project_id IN (
        SELECT project_id FROM project_team_members 
        WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    communication_id IN (
      SELECT id FROM communication_logs
      WHERE project_id IN (
        SELECT project_id FROM project_team_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================
DROP TRIGGER IF EXISTS update_project_team_members_updated_at ON project_team_members;
CREATE TRIGGER update_project_team_members_updated_at
  BEFORE UPDATE ON project_team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_tasks_updated_at ON client_tasks;
CREATE TRIGGER update_client_tasks_updated_at
  BEFORE UPDATE ON client_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_communication_logs_updated_at ON communication_logs;
CREATE TRIGGER update_communication_logs_updated_at
  BEFORE UPDATE ON communication_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to set completed_at when task status changes to completed
CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_client_task_completed_at ON client_tasks;
CREATE TRIGGER set_client_task_completed_at
  BEFORE UPDATE ON client_tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_task_completed_at();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE project_team_members IS 'Project team directory visible in client portal';
COMMENT ON TABLE client_tasks IS 'Client-relevant tasks with status tracking';
COMMENT ON TABLE communication_logs IS 'Communication history for client portal';
COMMENT ON TABLE communication_participants IS 'Participants in communications';
COMMENT ON TABLE communication_attachments IS 'File attachments for communications';
