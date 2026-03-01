-- ============================================================================
-- CastorWorks Architect Module - Consolidated Migration
-- Created: 2025-11-20
-- Description: Consolidated migration for Lovable deployment
-- Combines: create_architect_module, architect_seed_data, fix_architect_tasks_rls
-- ============================================================================

-- ============================================================================
-- 1. EXTEND EXISTING TABLES
-- ============================================================================

-- Add architect-specific fields to clients table
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS client_type TEXT CHECK (client_type IN ('residential', 'corporate', 'developer')),
  ADD COLUMN IF NOT EXISTS sales_status TEXT DEFAULT 'lead' CHECK (sales_status IN ('lead', 'prospect', 'active', 'inactive'));

 -- Add client visibility flag to project_documents
 DO $$
 BEGIN
   IF EXISTS (
     SELECT 1
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = 'project_documents'
   ) THEN
     ALTER TABLE project_documents
       ADD COLUMN IF NOT EXISTS visible_to_client BOOLEAN DEFAULT false;
   END IF;
 END;
 $$;

-- ============================================================================
-- 2. OPPORTUNITIES (SALES PIPELINE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS architect_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  project_name TEXT NOT NULL,
  estimated_value DECIMAL(15, 2),
  probability INTEGER CHECK (probability >= 0 AND probability <= 100),
  stage TEXT NOT NULL DEFAULT 'initial_contact'
    CHECK (stage IN ('initial_contact', 'briefing', 'proposal_sent', 'negotiation', 'won', 'lost')),
  expected_closing_date DATE,
  notes TEXT,
  created_by UUID REFERENCES user_profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_architect_opportunities_client_id ON architect_opportunities(client_id);
CREATE INDEX IF NOT EXISTS idx_architect_opportunities_stage ON architect_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_architect_opportunities_created_by ON architect_opportunities(created_by);

-- ============================================================================
-- 3. PROJECT BRIEFINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS architect_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  client_objectives TEXT,
  style_preferences TEXT,
  budget_range_min DECIMAL(15, 2),
  budget_range_max DECIMAL(15, 2),
  area_m2 DECIMAL(10, 2),
  must_haves TEXT,
  constraints TEXT,
  inspirations JSONB DEFAULT '[]'::jsonb,  -- Array of {type: 'link'|'image', url: string, description: string}
  notes TEXT,
  created_by UUID REFERENCES user_profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id)  -- One briefing per project
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_architect_briefings_project_id ON architect_briefings(project_id);

-- ============================================================================
-- 4. MEETINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS architect_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  meeting_date TIMESTAMP WITH TIME ZONE NOT NULL,
  participants JSONB DEFAULT '[]'::jsonb,  -- Array of {name: string, role: string}
  agenda TEXT,
  decisions TEXT,
  next_actions TEXT,
  created_by UUID REFERENCES user_profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_architect_meetings_project_id ON architect_meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_architect_meetings_client_id ON architect_meetings(client_id);
CREATE INDEX IF NOT EXISTS idx_architect_meetings_date ON architect_meetings(meeting_date);

-- ============================================================================
-- 5. SITE DIARY (DIÁRIO DE OBRA)
-- ============================================================================

CREATE TABLE IF NOT EXISTS architect_site_diary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  diary_date DATE NOT NULL,
  weather TEXT,
  progress_summary TEXT,
  notes TEXT,
  photos JSONB DEFAULT '[]'::jsonb,  -- Array of {url: string, caption: string}
  checklist_status JSONB DEFAULT '{}'::jsonb,  -- {structure: boolean, finishes: boolean, installations: boolean}
  created_by UUID REFERENCES user_profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_architect_site_diary_project_id ON architect_site_diary(project_id);
CREATE INDEX IF NOT EXISTS idx_architect_site_diary_date ON architect_site_diary(diary_date DESC);

-- ============================================================================
-- 6. TASKS (ARCHITECTURE PROJECT TASKS) - CRITICAL TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS architect_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  phase_id UUID REFERENCES project_phases(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
  due_date DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed')),
  tags JSONB DEFAULT '[]'::jsonb,  -- Array of strings
  created_by UUID REFERENCES user_profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_architect_tasks_project_id ON architect_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_architect_tasks_phase_id ON architect_tasks(phase_id);
CREATE INDEX IF NOT EXISTS idx_architect_tasks_assignee_id ON architect_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_architect_tasks_status ON architect_tasks(status);
CREATE INDEX IF NOT EXISTS idx_architect_tasks_due_date ON architect_tasks(due_date);

-- ============================================================================
-- 7. TASK COMMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS architect_task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES architect_tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_architect_task_comments_task_id ON architect_task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_architect_task_comments_created_at ON architect_task_comments(created_at);

-- ============================================================================
-- 8. CLIENT PORTAL ACCESS TOKENS
-- ============================================================================

CREATE TABLE IF NOT EXISTS architect_client_portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_architect_portal_tokens_project_id ON architect_client_portal_tokens(project_id);
CREATE INDEX IF NOT EXISTS idx_architect_portal_tokens_token ON architect_client_portal_tokens(token);

-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE architect_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE architect_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE architect_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE architect_site_diary ENABLE ROW LEVEL SECURITY;
ALTER TABLE architect_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE architect_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE architect_client_portal_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view opportunities for accessible clients" ON architect_opportunities;
DROP POLICY IF EXISTS "Users can insert opportunities" ON architect_opportunities;
DROP POLICY IF EXISTS "Users can update their opportunities" ON architect_opportunities;
DROP POLICY IF EXISTS "Users can delete their opportunities" ON architect_opportunities;

DROP POLICY IF EXISTS "Users can view briefings for accessible projects" ON architect_briefings;
DROP POLICY IF EXISTS "Users can insert briefings" ON architect_briefings;
DROP POLICY IF EXISTS "Users can update briefings" ON architect_briefings;
DROP POLICY IF EXISTS "Users can delete briefings" ON architect_briefings;

DROP POLICY IF EXISTS "Users can view meetings for accessible projects" ON architect_meetings;
DROP POLICY IF EXISTS "Users can insert meetings" ON architect_meetings;
DROP POLICY IF EXISTS "Users can update meetings" ON architect_meetings;
DROP POLICY IF EXISTS "Users can delete meetings" ON architect_meetings;

DROP POLICY IF EXISTS "Users can view site diary for accessible projects" ON architect_site_diary;
DROP POLICY IF EXISTS "Users can insert site diary entries" ON architect_site_diary;
DROP POLICY IF EXISTS "Users can update site diary entries" ON architect_site_diary;
DROP POLICY IF EXISTS "Users can delete site diary entries" ON architect_site_diary;

DROP POLICY IF EXISTS "Users can view tasks for accessible projects" ON architect_tasks;
DROP POLICY IF EXISTS "Users can insert tasks" ON architect_tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON architect_tasks;
DROP POLICY IF EXISTS "Users can delete tasks" ON architect_tasks;

DROP POLICY IF EXISTS "Users can view task comments for accessible tasks" ON architect_task_comments;
DROP POLICY IF EXISTS "Users can insert task comments" ON architect_task_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON architect_task_comments;

DROP POLICY IF EXISTS "Public can view portal data with valid token" ON architect_client_portal_tokens;
DROP POLICY IF EXISTS "Users can create portal tokens" ON architect_client_portal_tokens;
DROP POLICY IF EXISTS "Users can delete portal tokens" ON architect_client_portal_tokens;

-- Opportunities: Users can see opportunities for clients they have access to
-- Check if user has access to any project using this client, or is the creator
CREATE POLICY "Users can view opportunities for accessible clients"
  ON architect_opportunities FOR SELECT
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects p
      JOIN client_project_access cpa ON cpa.project_id = p.id
      WHERE cpa.client_id = architect_opportunities.client_id
      AND has_project_access(auth.uid(), p.id)
    )
  );

CREATE POLICY "Users can insert opportunities"
  ON architect_opportunities FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM projects p
      JOIN client_project_access cpa ON cpa.project_id = p.id
      WHERE cpa.client_id = architect_opportunities.client_id
      AND has_project_access(auth.uid(), p.id)
    )
  );

CREATE POLICY "Users can update their opportunities"
  ON architect_opportunities FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects p
      JOIN client_project_access cpa ON cpa.project_id = p.id
      WHERE cpa.client_id = architect_opportunities.client_id
      AND has_project_access(auth.uid(), p.id)
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects p
      JOIN client_project_access cpa ON cpa.project_id = p.id
      WHERE cpa.client_id = architect_opportunities.client_id
      AND has_project_access(auth.uid(), p.id)
    )
  );

CREATE POLICY "Users can delete their opportunities"
  ON architect_opportunities FOR DELETE
  USING (created_by = auth.uid());

-- Briefings: Users can see briefings for projects they have access to
CREATE POLICY "Users can view briefings for accessible projects"
  ON architect_briefings FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can insert briefings"
  ON architect_briefings FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND has_project_access(auth.uid(), project_id)
  );

CREATE POLICY "Users can update briefings"
  ON architect_briefings FOR UPDATE
  USING (has_project_access(auth.uid(), project_id))
  WITH CHECK (has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can delete briefings"
  ON architect_briefings FOR DELETE
  USING (has_project_access(auth.uid(), project_id));

-- Meetings: Users can see meetings for projects they have access to
CREATE POLICY "Users can view meetings for accessible projects"
  ON architect_meetings FOR SELECT
  USING (
    (project_id IS NOT NULL AND has_project_access(auth.uid(), project_id))
    OR (client_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM projects p
      JOIN client_project_access cpa ON cpa.project_id = p.id
      WHERE cpa.client_id = architect_meetings.client_id
      AND has_project_access(auth.uid(), p.id)
    ))
  );

CREATE POLICY "Users can insert meetings"
  ON architect_meetings FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      (project_id IS NOT NULL AND has_project_access(auth.uid(), project_id))
      OR (client_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM projects p
        JOIN client_project_access cpa ON cpa.project_id = p.id
        WHERE cpa.client_id = architect_meetings.client_id
        AND has_project_access(auth.uid(), p.id)
      ))
    )
  );

CREATE POLICY "Users can update meetings"
  ON architect_meetings FOR UPDATE
  USING (
    created_by = auth.uid()
    OR (
      (project_id IS NOT NULL AND has_project_access(auth.uid(), project_id))
      OR (client_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM projects p
        JOIN client_project_access cpa ON cpa.project_id = p.id
        WHERE cpa.client_id = architect_meetings.client_id
        AND has_project_access(auth.uid(), p.id)
      ))
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR (
      (project_id IS NOT NULL AND has_project_access(auth.uid(), project_id))
      OR (client_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM projects p
        JOIN client_project_access cpa ON cpa.project_id = p.id
        WHERE cpa.client_id = architect_meetings.client_id
        AND has_project_access(auth.uid(), p.id)
      ))
    )
  );

CREATE POLICY "Users can delete meetings"
  ON architect_meetings FOR DELETE
  USING (created_by = auth.uid());

-- Site Diary: Users can see diary entries for projects they have access to
CREATE POLICY "Users can view site diary for accessible projects"
  ON architect_site_diary FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can insert site diary entries"
  ON architect_site_diary FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND has_project_access(auth.uid(), project_id)
  );

CREATE POLICY "Users can update site diary entries"
  ON architect_site_diary FOR UPDATE
  USING (
    created_by = auth.uid()
    OR has_project_access(auth.uid(), project_id)
  )
  WITH CHECK (
    created_by = auth.uid()
    OR has_project_access(auth.uid(), project_id)
  );

CREATE POLICY "Users can delete site diary entries"
  ON architect_site_diary FOR DELETE
  USING (created_by = auth.uid());

-- Tasks: Users can see tasks for projects they have access to
-- Use has_project_access function if it exists, otherwise fallback to basic check
DO $$
BEGIN
  -- Check if has_project_access function exists
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'has_project_access'
  ) THEN
    -- Use has_project_access function for better security
    EXECUTE 'CREATE POLICY "Users can view tasks for accessible projects"
      ON architect_tasks FOR SELECT
      USING (has_project_access(auth.uid(), project_id))';

    EXECUTE 'CREATE POLICY "Users can update tasks"
      ON architect_tasks FOR UPDATE
      USING (has_project_access(auth.uid(), project_id))
      WITH CHECK (has_project_access(auth.uid(), project_id))';
  ELSE
    -- has_project_access function must exist - fail loudly if missing
    RAISE EXCEPTION 'has_project_access function not found. This migration requires the security functions to be created first.';
  END IF;
END $$;

CREATE POLICY "Users can insert tasks"
  ON architect_tasks FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND has_project_access(auth.uid(), project_id)
  );

CREATE POLICY "Users can delete tasks"
  ON architect_tasks FOR DELETE
  USING (created_by = auth.uid());

-- Task Comments: Users can see comments for tasks they have access to
-- Check project access through the parent task's project_id
CREATE POLICY "Users can view task comments for accessible tasks"
  ON architect_task_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM architect_tasks at
      WHERE at.id = architect_task_comments.task_id
      AND has_project_access(auth.uid(), at.project_id)
    )
  );

CREATE POLICY "Users can insert task comments"
  ON architect_task_comments FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM architect_tasks at
      WHERE at.id = architect_task_comments.task_id
      AND has_project_access(auth.uid(), at.project_id)
    )
  );

CREATE POLICY "Users can delete their own comments"
  ON architect_task_comments FOR DELETE
  USING (user_id = auth.uid());

-- Client Portal Tokens: Users can view tokens for projects they have access to
DROP POLICY IF EXISTS "Users can view portal tokens for accessible projects" ON architect_client_portal_tokens;
CREATE POLICY "Users can view portal tokens for accessible projects"
  ON architect_client_portal_tokens FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can create portal tokens" ON architect_client_portal_tokens;
CREATE POLICY "Users can create portal tokens"
  ON architect_client_portal_tokens FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND has_project_access(auth.uid(), project_id)
  );

DROP POLICY IF EXISTS "Users can delete portal tokens" ON architect_client_portal_tokens;
CREATE POLICY "Users can delete portal tokens"
  ON architect_client_portal_tokens FOR DELETE
  USING (has_project_access(auth.uid(), project_id));

-- ============================================================================
-- 10. UPDATED_AT TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp (create if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist (for idempotency)
DROP TRIGGER IF EXISTS update_architect_opportunities_updated_at ON architect_opportunities;
DROP TRIGGER IF EXISTS update_architect_briefings_updated_at ON architect_briefings;
DROP TRIGGER IF EXISTS update_architect_meetings_updated_at ON architect_meetings;
DROP TRIGGER IF EXISTS update_architect_site_diary_updated_at ON architect_site_diary;
DROP TRIGGER IF EXISTS update_architect_tasks_updated_at ON architect_tasks;

-- Apply triggers to tables with updated_at column
CREATE TRIGGER update_architect_opportunities_updated_at
  BEFORE UPDATE ON architect_opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_architect_briefings_updated_at
  BEFORE UPDATE ON architect_briefings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_architect_meetings_updated_at
  BEFORE UPDATE ON architect_meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_architect_site_diary_updated_at
  BEFORE UPDATE ON architect_site_diary
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_architect_tasks_updated_at
  BEFORE UPDATE ON architect_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 11. HELPER FUNCTIONS
-- ============================================================================

-- Function to generate unique portal token
CREATE OR REPLACE FUNCTION generate_portal_token()
RETURNS TEXT AS $$
DECLARE
  new_token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random token (32 characters)
    new_token := encode(gen_random_bytes(24), 'base64');
    new_token := replace(new_token, '/', '_');
    new_token := replace(new_token, '+', '-');

    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM architect_client_portal_tokens WHERE token = new_token) INTO token_exists;

    EXIT WHEN NOT token_exists;
  END LOOP;

  RETURN new_token;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 12. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE architect_opportunities IS 'Sales pipeline opportunities for architecture projects';
COMMENT ON TABLE architect_briefings IS 'Structured briefing forms for architecture projects';
COMMENT ON TABLE architect_meetings IS 'Client and project meetings with decisions and actions';
COMMENT ON TABLE architect_site_diary IS 'Daily construction site diary entries with photos';
COMMENT ON TABLE architect_tasks IS 'Project tasks with Kanban workflow for architecture teams';
COMMENT ON TABLE architect_task_comments IS 'Comments and discussions on architecture tasks';
COMMENT ON TABLE architect_client_portal_tokens IS 'Secure tokens for client portal access';

-- ============================================================================
-- END OF CONSOLIDATED MIGRATION
-- ============================================================================
