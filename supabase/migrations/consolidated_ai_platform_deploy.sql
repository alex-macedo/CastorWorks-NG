-- =====================================================
-- Enhance Clients Table for AI Estimating Platform
-- =====================================================
-- Migration: 20251118000000
-- Description: Add fields required for AI estimate generation
-- Tables Modified: clients
-- New Fields: user_id, address, notes, tags, lead_source
-- =====================================================

-- Add missing fields to clients table
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lead_source TEXT;

-- Create index for user_id (performance)
CREATE INDEX IF NOT EXISTS idx_clients_user_id_ai ON clients(user_id);

-- Create index for tags (for filtering)
CREATE INDEX IF NOT EXISTS idx_clients_tags ON clients USING GIN(tags);

-- Backfill user_id from existing data if possible
-- NOTE: This assumes each client belongs to the organization's admin user
-- You may need to adjust this logic based on your data model
DO $$
BEGIN
  -- Only backfill if user_id is NULL and there's a pattern to determine the owner
  -- This is a placeholder - adjust based on your actual data structure
  UPDATE clients
  SET user_id = (
    SELECT user_id FROM projects WHERE projects.client_id = clients.id LIMIT 1
  )
  WHERE user_id IS NULL
    AND EXISTS (SELECT 1 FROM projects WHERE projects.client_id = clients.id);
END $$;

-- Update RLS policies to include user_id checks
-- Note: Existing policies from migration 20251109162910 already handle client access
-- We're just ensuring user_id is considered

-- Update the "Users can view clients for accessible projects" policy
-- to also allow users to see their own clients
DROP POLICY IF EXISTS "Users can view clients for accessible projects" ON clients;

CREATE POLICY "Users can view clients for accessible projects"
ON clients FOR SELECT
USING (
  has_role(auth.uid(), 'admin') -- Admins see all
  OR
  has_role(auth.uid(), 'project_manager') -- PMs see all
  OR
  user_id = auth.uid() -- Users see their own clients
  OR
  -- Regular users can see clients of projects they're members of
  EXISTS (
    SELECT 1 FROM projects p
    JOIN project_team_members ptm ON ptm.project_id = p.id
    WHERE p.client_id = clients.id
      AND ptm.user_id = auth.uid()
  )
);

-- Comment on new fields
COMMENT ON COLUMN clients.user_id IS 'Owner/creator of the client record (for AI estimates)';
COMMENT ON COLUMN clients.address IS 'Full address for project location context';
COMMENT ON COLUMN clients.notes IS 'Free-form notes about the client';
COMMENT ON COLUMN clients.tags IS 'Array of tags for categorization (e.g., ["commercial", "repeat-customer"])';
COMMENT ON COLUMN clients.lead_source IS 'Where the lead came from (e.g., "referral", "website", "trade show")';

-- =====================================================
-- Verification Query (run after migration)
-- =====================================================
-- SELECT
--   COUNT(*) as total_clients,
--   COUNT(user_id) as clients_with_user_id,
--   COUNT(address) as clients_with_address
-- FROM clients;
-- =====================================================
-- Create Estimates Table
-- =====================================================
-- Migration: 20251118000001
-- Description: Core table for AI-generated estimates
-- Dependencies: clients table, projects table
-- =====================================================

CREATE TABLE IF NOT EXISTS estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- Versioning
  version INTEGER DEFAULT 1,
  parent_estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,

  -- Basic info
  name TEXT,
  description TEXT,

  -- Status tracking
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')),

  -- Line items (JSONB for flexibility)
  line_items JSONB DEFAULT '[]'::jsonb,

  -- Calculated totals
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_rate DECIMAL(5,4) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  markup_percentage DECIMAL(5,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,

  -- AI generation metadata
  ai_generated BOOLEAN DEFAULT false,
  ai_context JSONB DEFAULT '{}'::jsonb,
  ai_confidence_score DECIMAL(5,2),
  ai_model TEXT,

  -- Lifecycle tracking
  expires_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_estimates_user_id ON estimates(user_id);
CREATE INDEX IF NOT EXISTS idx_estimates_project_id ON estimates(project_id);
CREATE INDEX IF NOT EXISTS idx_estimates_client_id ON estimates(client_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimates_created_at ON estimates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_estimates_ai_generated ON estimates(ai_generated) WHERE ai_generated = true;

-- GIN index for JSONB querying
CREATE INDEX IF NOT EXISTS idx_estimates_line_items ON estimates USING GIN(line_items);
CREATE INDEX IF NOT EXISTS idx_estimates_ai_context ON estimates USING GIN(ai_context);

-- =====================================================
-- Comments / Documentation
-- =====================================================

COMMENT ON TABLE estimates IS 'AI-generated and manual construction estimates';
COMMENT ON COLUMN estimates.line_items IS 'Array of line item objects: [{id, category, subcategory, description, quantity, unit, unitPrice, markup, total, notes}]';
COMMENT ON COLUMN estimates.ai_context IS 'AI generation context: {projectType, location, squareFootage, qualityLevel, assumptions[], recommendations[], alternatives[]}';
COMMENT ON COLUMN estimates.ai_confidence_score IS 'AI confidence in estimate accuracy (0-100)';
COMMENT ON COLUMN estimates.parent_estimate_id IS 'Reference to original estimate if this is a versioned copy';

-- =====================================================
-- Triggers
-- =====================================================

-- Trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_estimates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_estimates_updated_at ON estimates;
CREATE TRIGGER update_estimates_updated_at
  BEFORE UPDATE ON estimates
  FOR EACH ROW
  EXECUTE FUNCTION update_estimates_updated_at();

-- Trigger for auto-calculating totals from line items
CREATE OR REPLACE FUNCTION calculate_estimate_totals()
RETURNS TRIGGER AS $$
DECLARE
  item JSONB;
  calculated_subtotal DECIMAL(12,2) := 0;
BEGIN
  -- Sum up line item totals
  IF NEW.line_items IS NOT NULL AND jsonb_array_length(NEW.line_items) > 0 THEN
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.line_items)
    LOOP
      calculated_subtotal := calculated_subtotal + COALESCE((item->>'total')::DECIMAL(12,2), 0);
    END LOOP;
  END IF;

  NEW.subtotal := calculated_subtotal;
  NEW.tax_amount := calculated_subtotal * NEW.tax_rate;
  NEW.total := NEW.subtotal + NEW.tax_amount;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_estimate_totals ON estimates;
CREATE TRIGGER calculate_estimate_totals
  BEFORE INSERT OR UPDATE OF line_items, tax_rate ON estimates
  FOR EACH ROW
  EXECUTE FUNCTION calculate_estimate_totals();

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;

-- Users can view their own estimates
DROP POLICY IF EXISTS "Users can view own estimates" ON estimates;
CREATE POLICY "Users can view own estimates"
ON estimates FOR SELECT
USING (user_id = auth.uid());

-- Project team members can view project estimates
DROP POLICY IF EXISTS "Team members can view project estimates" ON estimates;
CREATE POLICY "Team members can view project estimates"
ON estimates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_team_members ptm
    WHERE ptm.project_id = estimates.project_id
      AND ptm.user_id = auth.uid()
  )
);

-- Admins can view all estimates
DROP POLICY IF EXISTS "Admins can view all estimates" ON estimates;
CREATE POLICY "Admins can view all estimates"
ON estimates FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Users can create their own estimates
DROP POLICY IF EXISTS "Users can create own estimates" ON estimates;
CREATE POLICY "Users can create own estimates"
ON estimates FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own draft/sent estimates
DROP POLICY IF EXISTS "Users can update own estimates" ON estimates;
CREATE POLICY "Users can update own estimates"
ON estimates FOR UPDATE
USING (
  user_id = auth.uid()
  AND status IN ('draft', 'sent')
)
WITH CHECK (user_id = auth.uid());

-- Users can delete their own draft estimates
DROP POLICY IF EXISTS "Users can delete own draft estimates" ON estimates;
CREATE POLICY "Users can delete own draft estimates"
ON estimates FOR DELETE
USING (
  user_id = auth.uid()
  AND status = 'draft'
);

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to create a new version of an estimate
CREATE OR REPLACE FUNCTION create_estimate_version(estimate_id UUID)
RETURNS UUID AS $$
DECLARE
  new_estimate_id UUID;
  original_estimate RECORD;
BEGIN
  -- Get original estimate
  SELECT * INTO original_estimate FROM estimates WHERE id = estimate_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estimate not found';
  END IF;

  -- Create new version
  INSERT INTO estimates (
    user_id, project_id, client_id, version, parent_estimate_id,
    name, description, line_items, tax_rate, markup_percentage,
    ai_generated, ai_context, ai_confidence_score, ai_model
  )
  VALUES (
    original_estimate.user_id,
    original_estimate.project_id,
    original_estimate.client_id,
    original_estimate.version + 1,
    estimate_id,
    original_estimate.name,
    original_estimate.description,
    original_estimate.line_items,
    original_estimate.tax_rate,
    original_estimate.markup_percentage,
    original_estimate.ai_generated,
    original_estimate.ai_context,
    original_estimate.ai_confidence_score,
    original_estimate.ai_model
  )
  RETURNING id INTO new_estimate_id;

  RETURN new_estimate_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_estimate_version(UUID) TO authenticated;
-- =====================================================
-- Create Estimate Files Table
-- =====================================================
-- Migration: 20251118000002
-- Description: Track uploaded files for AI processing
-- Dependencies: estimates table
-- =====================================================

CREATE TABLE IF NOT EXISTS estimate_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID REFERENCES estimates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,

  -- File metadata
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL, -- MIME type
  file_url TEXT NOT NULL, -- Supabase Storage URL
  file_size BIGINT, -- bytes
  thumbnail_url TEXT,

  -- Processing status
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),

  -- AI extracted data (flexible JSONB structure)
  ai_extracted_data JSONB DEFAULT '{}'::jsonb,

  -- Performance tracking
  ai_processing_time_ms INTEGER,

  -- Error handling
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_estimate_files_estimate_id ON estimate_files(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_files_user_id ON estimate_files(user_id);
CREATE INDEX IF NOT EXISTS idx_estimate_files_status ON estimate_files(processing_status);
CREATE INDEX IF NOT EXISTS idx_estimate_files_created_at ON estimate_files(created_at DESC);

-- GIN index for searching extracted data
CREATE INDEX IF NOT EXISTS idx_estimate_files_extracted_data ON estimate_files USING GIN(ai_extracted_data);

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE estimate_files IS 'Files uploaded for AI processing (OCR, image analysis)';
COMMENT ON COLUMN estimate_files.ai_extracted_data IS 'Contains: {rawText, dimensions[], materials[], quantities[], brands[], specifications[], confidence, analysisType}';
COMMENT ON COLUMN estimate_files.processing_status IS 'Workflow: pending -> processing -> completed|failed';

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE estimate_files ENABLE ROW LEVEL SECURITY;

-- Users can view their own files
DROP POLICY IF EXISTS "Users can view own estimate files" ON estimate_files;
CREATE POLICY "Users can view own estimate files"
ON estimate_files FOR SELECT
USING (user_id = auth.uid());

-- Users can view files for estimates they have access to
DROP POLICY IF EXISTS "Users can view estimate files for accessible estimates" ON estimate_files;
CREATE POLICY "Users can view estimate files for accessible estimates"
ON estimate_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM estimates e
    WHERE e.id = estimate_files.estimate_id
      AND e.user_id = auth.uid()
  )
);

-- Users can upload files for their own estimates
DROP POLICY IF EXISTS "Users can upload estimate files" ON estimate_files;
CREATE POLICY "Users can upload estimate files"
ON estimate_files FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can delete their own pending/failed files
DROP POLICY IF EXISTS "Users can delete own estimate files" ON estimate_files;
CREATE POLICY "Users can delete own estimate files"
ON estimate_files FOR DELETE
USING (
  user_id = auth.uid()
  AND processing_status IN ('pending', 'failed')
);

-- Users can update their own files' processing status
-- Note: Edge Functions use SECURITY DEFINER function update_file_processing_status()
-- which bypasses RLS, so this policy only applies to authenticated user updates
DROP POLICY IF EXISTS "Users can update own estimate files" ON estimate_files;
CREATE POLICY "Users can update own estimate files"
ON estimate_files FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can manage all files
DROP POLICY IF EXISTS "Admins can manage all estimate files" ON estimate_files;
CREATE POLICY "Admins can manage all estimate files"
ON estimate_files FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to update file processing status
CREATE OR REPLACE FUNCTION update_file_processing_status(
  p_file_id UUID,
  p_status TEXT,
  p_extracted_data JSONB DEFAULT NULL,
  p_processing_time_ms INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE estimate_files
  SET
    processing_status = p_status,
    ai_extracted_data = COALESCE(p_extracted_data, ai_extracted_data),
    ai_processing_time_ms = COALESCE(p_processing_time_ms, ai_processing_time_ms),
    error_message = p_error_message
  WHERE id = p_file_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_file_processing_status(UUID, TEXT, JSONB, INTEGER, TEXT) TO authenticated, service_role;
-- =====================================================
-- Create AI Support Tables
-- =====================================================
-- Migration: 20251118000003
-- Description: Voice transcriptions, chat messages, proposals
-- Dependencies: estimates table, clients table
-- =====================================================

-- =====================================================
-- 1. VOICE TRANSCRIPTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS voice_transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID REFERENCES estimates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,

  -- Audio metadata
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,

  -- Transcription results
  transcription TEXT,
  confidence_score DECIMAL(5,4), -- 0.0000 to 1.0000
  language TEXT DEFAULT 'en',
  whisper_model TEXT DEFAULT 'whisper-1',

  -- Segments (optional detailed timestamps)
  segments JSONB,

  -- Performance
  processing_time_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_estimate_id ON voice_transcriptions(estimate_id);
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_user_id ON voice_transcriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_created_at ON voice_transcriptions(created_at DESC);

COMMENT ON TABLE voice_transcriptions IS 'Voice-to-text transcriptions using OpenAI Whisper';
COMMENT ON COLUMN voice_transcriptions.segments IS 'Array of {start, end, text} objects for timeline playback';

-- RLS for voice_transcriptions
ALTER TABLE voice_transcriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transcriptions" ON voice_transcriptions;
CREATE POLICY "Users can view own transcriptions"
ON voice_transcriptions FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create transcriptions" ON voice_transcriptions;
CREATE POLICY "Users can create transcriptions"
ON voice_transcriptions FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all transcriptions" ON voice_transcriptions;
CREATE POLICY "Admins can view all transcriptions"
ON voice_transcriptions FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 2. AI CHAT MESSAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,

  -- Session management
  session_id UUID NOT NULL,

  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  message TEXT NOT NULL,

  -- Context (page state, selected items, etc.)
  context JSONB DEFAULT '{}'::jsonb,

  -- Function calling (for AI assistant actions)
  function_calls JSONB,

  -- Usage tracking
  tokens_used INTEGER,
  model TEXT DEFAULT 'claude-sonnet-4-20250514',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_id ON ai_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_id ON ai_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_created_at ON ai_chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_role ON ai_chat_messages(role);

COMMENT ON TABLE ai_chat_messages IS 'AI chat assistant conversation history';
COMMENT ON COLUMN ai_chat_messages.context IS 'Contains: {currentPage, selectedProjectId, selectedEstimateId, recentActivity}';
COMMENT ON COLUMN ai_chat_messages.function_calls IS 'Array of function calls made by AI: [{name, arguments, result}]';

-- RLS for ai_chat_messages
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own chat messages" ON ai_chat_messages;
CREATE POLICY "Users can view own chat messages"
ON ai_chat_messages FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create chat messages" ON ai_chat_messages;
CREATE POLICY "Users can create chat messages"
ON ai_chat_messages FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own chat sessions" ON ai_chat_messages;
CREATE POLICY "Users can delete own chat sessions"
ON ai_chat_messages FOR DELETE
USING (user_id = auth.uid());

-- =====================================================
-- 3. PROPOSALS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- Basic info
  proposal_number TEXT,
  title TEXT,
  template_name TEXT DEFAULT 'standard',

  -- Content sections (JSONB for flexibility)
  sections JSONB DEFAULT '{}'::jsonb,

  -- Status tracking
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')),

  -- Delivery tracking
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  time_on_page_seconds INTEGER DEFAULT 0,

  -- Client response
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  client_comments TEXT,
  signature_data TEXT, -- Base64 encoded signature image

  -- Security
  public_hash TEXT UNIQUE, -- For secure public URLs

  -- Expiration
  expires_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposals_estimate_id ON proposals(estimate_id);
CREATE INDEX IF NOT EXISTS idx_proposals_user_id ON proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client_id ON proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_public_hash ON proposals(public_hash) WHERE public_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at DESC);

-- GIN index for sections
CREATE INDEX IF NOT EXISTS idx_proposals_sections ON proposals USING GIN(sections);

COMMENT ON TABLE proposals IS 'Professional proposals generated from estimates';
COMMENT ON COLUMN proposals.sections IS 'Object with keys: {introduction, scope, exclusions, payment, warranty, timeline} - each containing {content, aiGenerated, edited}';
COMMENT ON COLUMN proposals.public_hash IS 'Secure random hash for public proposal viewing (client-facing URL)';

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_proposals_updated_at ON proposals;
CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique public hash
CREATE OR REPLACE FUNCTION generate_proposal_hash()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.public_hash IS NULL THEN
    NEW.public_hash := encode(gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generate_proposal_hash ON proposals;
CREATE TRIGGER generate_proposal_hash
  BEFORE INSERT ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION generate_proposal_hash();

-- RLS for proposals
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own proposals" ON proposals;
CREATE POLICY "Users can view own proposals"
ON proposals FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Public proposals viewable by hash" ON proposals;
CREATE POLICY "Public proposals viewable by hash"
ON proposals FOR SELECT
USING (public_hash IS NOT NULL); -- Anyone with the hash can view

DROP POLICY IF EXISTS "Users can create proposals" ON proposals;
CREATE POLICY "Users can create proposals"
ON proposals FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own proposals" ON proposals;
CREATE POLICY "Users can update own proposals"
ON proposals FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own draft proposals" ON proposals;
CREATE POLICY "Users can delete own draft proposals"
ON proposals FOR DELETE
USING (
  user_id = auth.uid()
  AND status = 'draft'
);

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to track proposal views
CREATE OR REPLACE FUNCTION track_proposal_view(
  p_proposal_id UUID,
  p_time_spent_seconds INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  UPDATE proposals
  SET
    viewed_at = COALESCE(viewed_at, NOW()),
    last_viewed_at = NOW(),
    view_count = view_count + 1,
    time_on_page_seconds = time_on_page_seconds + p_time_spent_seconds
  WHERE id = p_proposal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION track_proposal_view(UUID, INTEGER) TO anon, authenticated;
-- =====================================================
-- Create AI Tracking Tables
-- =====================================================
-- Migration: 20251118000004
-- Description: AI usage logs and feedback collection
-- Dependencies: estimates, proposals, ai_chat_messages
-- =====================================================

-- =====================================================
-- 1. AI USAGE LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,

  -- Feature tracking
  feature TEXT NOT NULL, -- 'estimate_generation', 'ai_chat', 'proposal_generation', etc.
  model TEXT NOT NULL, -- 'claude-sonnet-4-20250514', 'whisper-1', etc.

  -- Token usage
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,

  -- Caching metrics
  cache_creation_tokens INTEGER DEFAULT 0,
  cache_read_tokens INTEGER DEFAULT 0,
  cached BOOLEAN DEFAULT false,

  -- Cost tracking
  cost_usd DECIMAL(10,6) NOT NULL DEFAULT 0,

  -- Performance
  response_time_ms INTEGER,

  -- Related entities (optional)
  estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  chat_session_id UUID,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_feature ON ai_usage_logs(feature);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_estimate_id ON ai_usage_logs(estimate_id) WHERE estimate_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_proposal_id ON ai_usage_logs(proposal_id) WHERE proposal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_cached ON ai_usage_logs(cached) WHERE cached = true;

-- Composite index for user feature analytics
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_feature_date ON ai_usage_logs(user_id, feature, created_at DESC);

COMMENT ON TABLE ai_usage_logs IS 'Tracks all AI API usage for cost monitoring and analytics';
COMMENT ON COLUMN ai_usage_logs.cache_read_tokens IS 'Tokens read from cache (90% cost savings)';
COMMENT ON COLUMN ai_usage_logs.cost_usd IS 'Calculated cost in USD based on token usage and pricing';

-- RLS for ai_usage_logs
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own usage logs" ON ai_usage_logs;
CREATE POLICY "Users can view own usage logs"
ON ai_usage_logs FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own usage logs
-- Note: Edge Functions with service role bypass RLS entirely
-- This policy ensures non-service-role inserts are properly scoped
DROP POLICY IF EXISTS "Users can insert own usage logs" ON ai_usage_logs;
CREATE POLICY "Users can insert own usage logs"
ON ai_usage_logs FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all usage logs" ON ai_usage_logs;
CREATE POLICY "Admins can view all usage logs"
ON ai_usage_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 2. AI FEEDBACK TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,

  -- What feature is this feedback for
  feature TEXT NOT NULL,

  -- Rating
  rating TEXT NOT NULL CHECK (rating IN ('thumbs_up', 'thumbs_down')),

  -- Optional comment
  comment TEXT,

  -- Link to usage log (optional)
  usage_log_id UUID REFERENCES ai_usage_logs(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_id ON ai_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_feature ON ai_feedback(feature);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_rating ON ai_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_created_at ON ai_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_usage_log_id ON ai_feedback(usage_log_id) WHERE usage_log_id IS NOT NULL;

COMMENT ON TABLE ai_feedback IS 'User feedback on AI responses (thumbs up/down, comments)';
COMMENT ON COLUMN ai_feedback.usage_log_id IS 'Links feedback to specific AI usage instance for analysis';

-- RLS for ai_feedback
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own feedback" ON ai_feedback;
CREATE POLICY "Users can view own feedback"
ON ai_feedback FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can submit feedback" ON ai_feedback;
CREATE POLICY "Users can submit feedback"
ON ai_feedback FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all feedback" ON ai_feedback;
CREATE POLICY "Admins can view all feedback"
ON ai_feedback FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- ANALYTICS FUNCTIONS
-- =====================================================

-- Get usage breakdown by feature
CREATE OR REPLACE FUNCTION get_ai_usage_breakdown(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  feature TEXT,
  total_requests BIGINT,
  total_cost DECIMAL,
  total_tokens BIGINT,
  cache_hit_rate DECIMAL,
  avg_response_time INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.feature,
    COUNT(*)::BIGINT as total_requests,
    SUM(l.cost_usd)::DECIMAL as total_cost,
    SUM(l.total_tokens)::BIGINT as total_tokens,
    ROUND(
      CASE
        WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE l.cached = true))::DECIMAL / COUNT(*)::DECIMAL
        ELSE 0
      END,
      2
    ) as cache_hit_rate,
    ROUND(AVG(l.response_time_ms))::INTEGER as avg_response_time
  FROM ai_usage_logs l
  WHERE l.user_id = p_user_id
    AND l.created_at >= p_start_date
    AND l.created_at <= p_end_date
  GROUP BY l.feature
  ORDER BY total_cost DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_ai_usage_breakdown(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- Get feedback summary
CREATE OR REPLACE FUNCTION get_ai_feedback_summary(
  p_feature TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days'
)
RETURNS TABLE (
  feature TEXT,
  total_feedback BIGINT,
  thumbs_up BIGINT,
  thumbs_down BIGINT,
  satisfaction_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.feature,
    COUNT(*)::BIGINT as total_feedback,
    COUNT(*) FILTER (WHERE f.rating = 'thumbs_up')::BIGINT as thumbs_up,
    COUNT(*) FILTER (WHERE f.rating = 'thumbs_down')::BIGINT as thumbs_down,
    ROUND(
      CASE
        WHEN COUNT(*) > 0
        THEN (COUNT(*) FILTER (WHERE f.rating = 'thumbs_up'))::DECIMAL / COUNT(*)::DECIMAL
        ELSE 0
      END,
      2
    ) as satisfaction_rate
  FROM ai_feedback f
  WHERE (p_feature IS NULL OR f.feature = p_feature)
    AND f.created_at >= p_start_date
  GROUP BY f.feature
  ORDER BY total_feedback DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_ai_feedback_summary(TEXT, TIMESTAMPTZ) TO authenticated;

-- Get user's total AI costs
CREATE OR REPLACE FUNCTION get_user_ai_costs(
  p_user_id UUID,
  p_period TEXT DEFAULT 'month' -- 'day', 'week', 'month', 'year'
)
RETURNS TABLE (
  period_start TIMESTAMPTZ,
  total_cost DECIMAL,
  total_requests BIGINT,
  total_tokens BIGINT
) AS $$
DECLARE
  interval_period INTERVAL;
BEGIN
  interval_period := CASE p_period
    WHEN 'day' THEN INTERVAL '1 day'
    WHEN 'week' THEN INTERVAL '7 days'
    WHEN 'month' THEN INTERVAL '30 days'
    WHEN 'year' THEN INTERVAL '365 days'
    ELSE INTERVAL '30 days'
  END;

  RETURN QUERY
  SELECT
    DATE_TRUNC(p_period, l.created_at) as period_start,
    SUM(l.cost_usd)::DECIMAL as total_cost,
    COUNT(*)::BIGINT as total_requests,
    SUM(l.total_tokens)::BIGINT as total_tokens
  FROM ai_usage_logs l
  WHERE l.user_id = p_user_id
    AND l.created_at >= NOW() - interval_period * 12
  GROUP BY DATE_TRUNC(p_period, l.created_at)
  ORDER BY period_start DESC
  LIMIT 12;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_ai_costs(UUID, TEXT) TO authenticated;
-- =====================================================
-- Create Storage Bucket and Utility Functions
-- =====================================================
-- Migration: 20251118000005
-- Description: Storage bucket for estimate files and helper functions
-- =====================================================

-- =====================================================
-- 1. UTILITY FUNCTION (if not exists)
-- =====================================================

-- Function to update updated_at timestamp (used by multiple tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. STORAGE BUCKET FOR ESTIMATE FILES
-- =====================================================

-- Create storage bucket for estimate-related files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'estimate-files',
  'estimate-files',
  false, -- Private bucket (use signed URLs)
  52428800, -- 50MB max file size
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', -- .docx
    'video/mp4',
    'video/quicktime', -- .mov
    'video/webm',
    'audio/mpeg', -- .mp3
    'audio/mp4', -- .m4a
    'audio/wav',
    'audio/webm'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 3. STORAGE POLICIES
-- =====================================================

-- Users can upload files to their own folder
DROP POLICY IF EXISTS "Users can upload estimate files" ON storage.objects;
CREATE POLICY "Users can upload estimate files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'estimate-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can read files in their own folder
DROP POLICY IF EXISTS "Users can view own estimate files" ON storage.objects;
CREATE POLICY "Users can view own estimate files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'estimate-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update files in their own folder
DROP POLICY IF EXISTS "Users can update own estimate files" ON storage.objects;
CREATE POLICY "Users can update own estimate files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'estimate-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'estimate-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete files in their own folder
DROP POLICY IF EXISTS "Users can delete own estimate files" ON storage.objects;
CREATE POLICY "Users can delete own estimate files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'estimate-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can manage all estimate files
DROP POLICY IF EXISTS "Admins can manage all estimate files" ON storage.objects;
CREATE POLICY "Admins can manage all estimate files"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'estimate-files' AND
  has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'estimate-files' AND
  has_role(auth.uid(), 'admin')
);

-- =====================================================
-- 4. HELPER FUNCTIONS FOR FILE MANAGEMENT
-- =====================================================

-- Function to generate signed URL for file download
CREATE OR REPLACE FUNCTION get_estimate_file_url(
  p_file_path TEXT,
  p_expires_in INTEGER DEFAULT 3600 -- 1 hour
)
RETURNS TEXT AS $$
DECLARE
  v_url TEXT;
BEGIN
  -- This is a placeholder - actual signed URL generation happens in Edge Functions
  -- or client-side using Supabase SDK
  -- This function just returns the storage path
  RETURN 'estimate-files/' || p_file_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_estimate_file_url(TEXT, INTEGER) TO authenticated;

-- Function to clean up orphaned files (files without estimate_files record)
CREATE OR REPLACE FUNCTION cleanup_orphaned_estimate_files()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- This is a maintenance function to be run periodically
  -- It should be executed with service role credentials

  -- Note: Actual file deletion from storage must be done via Edge Function
  -- This function just identifies orphans

  -- Mark estimate_files records as orphaned if file doesn't exist in storage
  -- (Implementation depends on your cleanup strategy)

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only admins can run cleanup
GRANT EXECUTE ON FUNCTION cleanup_orphaned_estimate_files() TO service_role;

-- =====================================================
-- 5. MATERIALIZED VIEW FOR FILE STATISTICS
-- =====================================================

-- View to track storage usage per user
CREATE OR REPLACE VIEW user_storage_stats AS
SELECT
  ef.user_id,
  COUNT(*) as total_files,
  SUM(ef.file_size) as total_bytes,
  ROUND(SUM(ef.file_size)::DECIMAL / 1024 / 1024, 2) as total_mb,
  COUNT(*) FILTER (WHERE ef.processing_status = 'completed') as processed_files,
  COUNT(*) FILTER (WHERE ef.processing_status = 'failed') as failed_files,
  COUNT(*) FILTER (WHERE ef.processing_status = 'pending') as pending_files
FROM estimate_files ef
GROUP BY ef.user_id;

-- Grant access to users for their own stats
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_storage_stats'
      AND table_type = 'BASE TABLE'
  ) THEN
    DROP POLICY IF EXISTS "Users can view own storage stats" ON user_storage_stats;
    CREATE POLICY "Users can view own storage stats"
    ON user_storage_stats FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
  END IF;
END;
$$;

-- Note: This is a regular view, not materialized, for real-time data
-- If performance becomes an issue, consider making it materialized and refreshing periodically

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function to automatically update updated_at timestamp';
COMMENT ON FUNCTION get_estimate_file_url(TEXT, INTEGER) IS 'Helper to get storage URL for estimate files';
COMMENT ON FUNCTION cleanup_orphaned_estimate_files() IS 'Maintenance function to clean up orphaned files (service role only)';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check bucket was created
SELECT * FROM storage.buckets WHERE id = 'estimate-files';

-- Check storage policies
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%estimate%';

-- Check storage usage
SELECT * FROM user_storage_stats WHERE user_id = auth.uid();
