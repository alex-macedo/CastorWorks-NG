-- Migration: Create Client Portal Tables
-- Description: Creates all necessary tables for the Client Portal module
-- Author: AI Agent
-- Date: 2025-11-27

-- =====================================================
-- DROP EXISTING OBJECTS (for idempotency)
-- =====================================================
DROP TRIGGER IF EXISTS update_schedule_events_updated_at ON schedule_events;
DROP TRIGGER IF EXISTS update_client_meetings_updated_at ON client_meetings;

DROP TABLE IF EXISTS meeting_attendees CASCADE;
DROP TABLE IF EXISTS client_meetings CASCADE;
DROP TABLE IF EXISTS schedule_events CASCADE;
DROP TABLE IF EXISTS client_portal_tokens CASCADE;

-- =====================================================
-- CLIENT PORTAL TOKENS
-- =====================================================
-- Table for managing client portal access tokens
CREATE TABLE client_portal_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  CONSTRAINT unique_active_token_per_project UNIQUE (project_id, is_active)
);

-- Create index for faster token lookups
CREATE INDEX idx_client_portal_tokens_token ON client_portal_tokens(token);
CREATE INDEX idx_client_portal_tokens_project_id ON client_portal_tokens(project_id);
CREATE INDEX idx_client_portal_tokens_client_id ON client_portal_tokens(client_id);

-- Enable RLS
ALTER TABLE client_portal_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view tokens for their projects
DROP POLICY IF EXISTS "Users can view tokens for their projects" ON client_portal_tokens;
CREATE POLICY "Users can view tokens for their projects"
  ON client_portal_tokens FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE id IN (
        SELECT project_id FROM project_team_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policy: Users can create tokens for their projects
DROP POLICY IF EXISTS "Users can create tokens for their projects" ON client_portal_tokens;
CREATE POLICY "Users can create tokens for their projects"
  ON client_portal_tokens FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects 
      WHERE id IN (
        SELECT project_id FROM project_team_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policy: Users can update tokens for their projects
DROP POLICY IF EXISTS "Users can update tokens for their projects" ON client_portal_tokens;
CREATE POLICY "Users can update tokens for their projects"
  ON client_portal_tokens FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE id IN (
        SELECT project_id FROM project_team_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- SCHEDULE EVENTS
-- =====================================================
-- Table for project schedule events (milestones, meetings, inspections, deadlines)
CREATE TABLE schedule_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('milestone', 'meeting', 'inspection', 'deadline')),
  event_date DATE NOT NULL,
  event_time TIME,
  all_day BOOLEAN DEFAULT false,
  description TEXT,
  location TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_schedule_events_project_id ON schedule_events(project_id);
CREATE INDEX idx_schedule_events_event_date ON schedule_events(event_date);
CREATE INDEX idx_schedule_events_type ON schedule_events(type);

-- Enable RLS
ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Clients can view schedule events for their project via token
DROP POLICY IF EXISTS "Clients can view schedule events via token" ON schedule_events;
CREATE POLICY "Clients can view schedule events via token"
  ON schedule_events FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM client_portal_tokens 
      WHERE token = current_setting('request.jwt.claims', true)::json->>'portal_token'
      AND (expires_at IS NULL OR expires_at > NOW())
      AND is_active = true
    )
  );

-- RLS Policy: Team members can manage schedule events
DROP POLICY IF EXISTS "Team members can manage schedule events" ON schedule_events;
CREATE POLICY "Team members can manage schedule events"
  ON schedule_events FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_team_members 
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- CLIENT MEETINGS
-- =====================================================
-- Table for client portal meetings
CREATE TABLE client_meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  meeting_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER, -- minutes
  location TEXT,
  meeting_link TEXT,
  status TEXT CHECK (status IN ('upcoming', 'completed', 'cancelled')) DEFAULT 'upcoming',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_client_meetings_project_id ON client_meetings(project_id);
CREATE INDEX idx_client_meetings_meeting_date ON client_meetings(meeting_date);
CREATE INDEX idx_client_meetings_status ON client_meetings(status);

-- Enable RLS
ALTER TABLE client_meetings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Clients can view meetings via token
DROP POLICY IF EXISTS "Clients can view meetings via token" ON client_meetings;
CREATE POLICY "Clients can view meetings via token"
  ON client_meetings FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM client_portal_tokens 
      WHERE token = current_setting('request.jwt.claims', true)::json->>'portal_token'
      AND (expires_at IS NULL OR expires_at > NOW())
      AND is_active = true
    )
  );

-- RLS Policy: Team members can manage meetings
DROP POLICY IF EXISTS "Team members can manage meetings" ON client_meetings;
CREATE POLICY "Team members can manage meetings"
  ON client_meetings FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_team_members 
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- MEETING ATTENDEES
-- =====================================================
-- Table for meeting attendees
CREATE TABLE meeting_attendees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES client_meetings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_meeting_attendees_meeting_id ON meeting_attendees(meeting_id);

-- Enable RLS
ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Attendees visible if meeting is visible
DROP POLICY IF EXISTS "Attendees visible if meeting is visible" ON meeting_attendees;
CREATE POLICY "Attendees visible if meeting is visible"
  ON meeting_attendees FOR SELECT
  USING (
    meeting_id IN (
      SELECT id FROM client_meetings
      WHERE project_id IN (
        SELECT project_id FROM client_portal_tokens 
        WHERE token = current_setting('request.jwt.claims', true)::json->>'portal_token'
        AND (expires_at IS NULL OR expires_at > NOW())
        AND is_active = true
      )
    )
  );

-- RLS Policy: Team members can manage attendees
DROP POLICY IF EXISTS "Team members can manage attendees" ON meeting_attendees;
CREATE POLICY "Team members can manage attendees"
  ON meeting_attendees FOR ALL
  USING (
    meeting_id IN (
      SELECT id FROM client_meetings
      WHERE project_id IN (
        SELECT project_id FROM project_team_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================
-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_schedule_events_updated_at ON schedule_events;
CREATE TRIGGER update_schedule_events_updated_at
  BEFORE UPDATE ON schedule_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_meetings_updated_at ON client_meetings;
CREATE TRIGGER update_client_meetings_updated_at
  BEFORE UPDATE ON client_meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE client_portal_tokens IS 'Stores access tokens for client portal authentication';
COMMENT ON TABLE schedule_events IS 'Project schedule events visible in client portal';
COMMENT ON TABLE client_meetings IS 'Client-facing meetings with details and links';
COMMENT ON TABLE meeting_attendees IS 'Attendees for client portal meetings';
