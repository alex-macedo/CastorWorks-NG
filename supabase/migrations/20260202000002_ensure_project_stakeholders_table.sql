-- Phase 1 Remediation: Ensure Project Stakeholders Table Exists
-- Created: 2026-02-02
-- Purpose: Support AppContacts and AppEmailReview with real data

BEGIN;

-- Create project_stakeholders table if it doesn't exist
CREATE TABLE IF NOT EXISTS project_stakeholders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL,
  company TEXT,
  stakeholder_type TEXT NOT NULL CHECK (stakeholder_type IN ('client', 'contractor', 'supplier', 'consultant', 'team', 'other')),
  avatar_url TEXT,
  is_lead BOOLEAN DEFAULT FALSE,
  last_contact_date DATE,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_stakeholders_project_id ON project_stakeholders(project_id);
CREATE INDEX IF NOT EXISTS idx_project_stakeholders_type ON project_stakeholders(stakeholder_type);
CREATE INDEX IF NOT EXISTS idx_project_stakeholders_is_lead ON project_stakeholders(is_lead) WHERE is_lead = true;
CREATE INDEX IF NOT EXISTS idx_project_stakeholders_email ON project_stakeholders(email);

-- Enable RLS
ALTER TABLE project_stakeholders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view stakeholders in their projects" ON project_stakeholders;
DROP POLICY IF EXISTS "Users can create stakeholders in their projects" ON project_stakeholders;
DROP POLICY IF EXISTS "Users can update stakeholders in their projects" ON project_stakeholders;
DROP POLICY IF EXISTS "Users can delete stakeholders in their projects" ON project_stakeholders;

-- RLS Policies
CREATE POLICY "Users can view stakeholders in their projects"
  ON project_stakeholders FOR SELECT
  USING (
    has_project_access(auth.uid(), project_id)
  );

CREATE POLICY "Users can create stakeholders in their projects"
  ON project_stakeholders FOR INSERT
  WITH CHECK (
    has_project_access(auth.uid(), project_id)
  );

CREATE POLICY "Users can update stakeholders in their projects"
  ON project_stakeholders FOR UPDATE
  USING (
    has_project_access(auth.uid(), project_id)
  )
  WITH CHECK (
    has_project_access(auth.uid(), project_id)
  );

CREATE POLICY "Users can delete stakeholders in their projects"
  ON project_stakeholders FOR DELETE
  USING (
    has_project_access(auth.uid(), project_id)
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_project_stakeholders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_project_stakeholders_updated_at_trigger ON project_stakeholders;
CREATE TRIGGER update_project_stakeholders_updated_at_trigger
  BEFORE UPDATE ON project_stakeholders
  FOR EACH ROW
  EXECUTE FUNCTION update_project_stakeholders_updated_at();

-- Insert sample stakeholders for testing (optional)
DO $$
DECLARE
  v_project_id UUID;
  v_user_id UUID;
BEGIN
  -- Get first project for demo data
  SELECT id INTO v_project_id FROM projects LIMIT 1;
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    -- Only insert if no stakeholders exist for this project
    IF NOT EXISTS (SELECT 1 FROM project_stakeholders WHERE project_id = v_project_id LIMIT 1) THEN
      INSERT INTO project_stakeholders (project_id, name, email, phone, role, company, stakeholder_type, is_lead, created_by)
      VALUES
        (v_project_id, 'Sarah Jenkins', 'sarah@jenkinscapital.com', '+1 (555) 123-4567', 'Lead Investor', 'Jenkins Capital', 'client', true, v_user_id),
        (v_project_id, 'Michael Chen', 'michael@chenarch.com', '+1 (555) 234-5678', 'Principal Architect', 'Chen & Associates', 'consultant', false, v_user_id),
        (v_project_id, 'Ana Silva', 'ana@constructco.com', '+1 (555) 345-6789', 'Site Manager', 'ConstructCo', 'contractor', false, v_user_id),
        (v_project_id, 'James Wilson', 'james@wilsonestates.com', '+1 (555) 456-7890', 'Property Owner', 'Wilson Estates', 'client', false, v_user_id),
        (v_project_id, 'Lisa Park', 'lisa@parkdesign.com', '+1 (555) 567-8901', 'Interior Designer', 'Park Design Studio', 'consultant', false, v_user_id);

      RAISE NOTICE 'Sample stakeholders created for testing';
    ELSE
      RAISE NOTICE 'Stakeholders already exist for project - skipping sample data';
    END IF;
  ELSE
    RAISE NOTICE 'No projects found - skipping sample data';
  END IF;
END $$;

COMMIT;

-- Log success
DO $$
BEGIN
  RAISE NOTICE 'Project stakeholders table ensured with RLS policies';
  RAISE NOTICE 'Sample stakeholders added for testing (if project exists)';
END $$;
