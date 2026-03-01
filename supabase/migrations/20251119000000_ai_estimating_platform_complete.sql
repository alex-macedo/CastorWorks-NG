-- =================================================================
-- AI ESTIMATING PLATFORM - COMPLETE DATABASE SCHEMA
-- =================================================================
-- Created: 2025-11-19
-- Description: Complete schema for AI-powered construction estimating
-- Dependencies: Requires auth.users, existing clients table
-- =================================================================

-- =================================================================
-- 1. ESTIMATES TABLE
-- =================================================================

CREATE TABLE IF NOT EXISTS estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- Versioning
  version INTEGER DEFAULT 1,
  parent_estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,

  -- Status tracking
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')),

  -- Line items (JSONB for flexibility)
  line_items JSONB DEFAULT '[]'::jsonb,

  -- Calculated totals
  subtotal NUMERIC(12,2) DEFAULT 0,
  tax_rate NUMERIC(5,4) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  markup_percentage NUMERIC(5,4) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,

  -- AI generation metadata
  ai_generated BOOLEAN DEFAULT false,
  ai_context JSONB DEFAULT '{}'::jsonb,
  ai_confidence_score INTEGER,
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_estimates_user_id ON estimates(user_id);
CREATE INDEX IF NOT EXISTS idx_estimates_project_id ON estimates(project_id);
CREATE INDEX IF NOT EXISTS idx_estimates_client_id ON estimates(client_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimates_created_at ON estimates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_estimates_ai_generated ON estimates(ai_generated) WHERE ai_generated = true;
CREATE INDEX IF NOT EXISTS idx_estimates_line_items ON estimates USING GIN(line_items);
CREATE INDEX IF NOT EXISTS idx_estimates_ai_context ON estimates USING GIN(ai_context);

-- RLS Policies
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own estimates" ON estimates;
DROP POLICY IF EXISTS "Users can create own estimates" ON estimates;
DROP POLICY IF EXISTS "Users can update own estimates" ON estimates;
DROP POLICY IF EXISTS "Users can delete own draft estimates" ON estimates;

CREATE POLICY "Users can view own estimates"
ON estimates FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create own estimates"
ON estimates FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own estimates"
ON estimates FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own draft estimates"
ON estimates FOR DELETE
USING (user_id = auth.uid() AND status = 'draft');

-- =================================================================
-- 2. AI USAGE LOGS TABLE
-- =================================================================

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,

  -- Feature tracking
  feature TEXT NOT NULL,
  model TEXT NOT NULL,

  -- Token usage (using input/output naming for Anthropic Claude)
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,

  -- Cost tracking
  total_cost NUMERIC(10,6) DEFAULT 0,

  -- Performance
  response_time_ms INTEGER,

  -- Related entities
  estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_feature ON ai_usage_logs(feature);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_estimate_id ON ai_usage_logs(estimate_id) WHERE estimate_id IS NOT NULL;

-- RLS Policies
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own usage logs" ON ai_usage_logs;
DROP POLICY IF EXISTS "Users can insert own usage logs" ON ai_usage_logs;

CREATE POLICY "Users can view own usage logs"
ON ai_usage_logs FOR SELECT
USING (user_id = auth.uid());

-- Note: Edge Functions with service role bypass RLS entirely
-- This policy ensures non-service-role inserts are properly scoped
CREATE POLICY "Users can insert own usage logs"
ON ai_usage_logs FOR INSERT
WITH CHECK (user_id = auth.uid());

-- =================================================================
-- 3. VOICE RECORDINGS TABLE (for Week 4)
-- =================================================================

CREATE TABLE IF NOT EXISTS voice_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  estimate_id UUID REFERENCES estimates(id) ON DELETE CASCADE,

  -- Audio file
  storage_path TEXT NOT NULL,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,

  -- Transcription
  transcription_text TEXT,
  transcription_confidence NUMERIC(5,4),

  -- Metadata
  whisper_model TEXT DEFAULT 'whisper-1',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_voice_recordings_user_id ON voice_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_estimate_id ON voice_recordings(estimate_id);

-- RLS Policies
ALTER TABLE voice_recordings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own recordings" ON voice_recordings;
DROP POLICY IF EXISTS "Users can create recordings" ON voice_recordings;
DROP POLICY IF EXISTS "Users can delete own recordings" ON voice_recordings;

CREATE POLICY "Users can view own recordings"
ON voice_recordings FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create recordings"
ON voice_recordings FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own recordings"
ON voice_recordings FOR DELETE
USING (user_id = auth.uid());

-- =================================================================
-- 4. CHAT MESSAGES TABLE (for Week 8)
-- =================================================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  estimate_id UUID REFERENCES estimates(id) ON DELETE CASCADE,

  -- Session management
  session_id UUID NOT NULL,

  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  -- Context
  context JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_estimate_id ON chat_messages(estimate_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- RLS Policies
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can create chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete own sessions" ON chat_messages;

CREATE POLICY "Users can view own chat messages"
ON chat_messages FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create chat messages"
ON chat_messages FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own sessions"
ON chat_messages FOR DELETE
USING (user_id = auth.uid());

-- =================================================================
-- 5. PROPOSALS TABLE (for Week 7)
-- =================================================================

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- Basic info
  proposal_number TEXT,
  title TEXT NOT NULL,

  -- Content
  introduction TEXT,
  scope_of_work TEXT,
  terms_and_conditions TEXT,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected')),

  -- PDF storage
  pdf_url TEXT,

  -- Tracking
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  -- Public access
  public_token TEXT UNIQUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_proposals_estimate_id ON proposals(estimate_id);
CREATE INDEX IF NOT EXISTS idx_proposals_user_id ON proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client_id ON proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'proposals'
      AND column_name = 'public_token'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_proposals_public_token ON proposals(public_token) WHERE public_token IS NOT NULL;
  END IF;
END;
$$;

-- RLS Policies
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own proposals" ON proposals;
DROP POLICY IF EXISTS "Public proposals viewable by token" ON proposals;
DROP POLICY IF EXISTS "Users can create proposals" ON proposals;
DROP POLICY IF EXISTS "Users can update own proposals" ON proposals;

CREATE POLICY "Users can view own proposals"
ON proposals FOR SELECT
USING (user_id = auth.uid());

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'proposals'
      AND column_name = 'public_token'
  ) THEN
    CREATE POLICY "Public proposals viewable by token"
    ON proposals FOR SELECT
    USING (public_token IS NOT NULL);
  END IF;
END;
$$;

CREATE POLICY "Users can create proposals"
ON proposals FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own proposals"
ON proposals FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- =================================================================
-- 6. FEEDBACK TABLE (for Week 6)
-- =================================================================

CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,

  -- What is this feedback about
  feature TEXT NOT NULL,
  rating TEXT CHECK (rating IN ('thumbs_up', 'thumbs_down')),

  -- Feedback content
  comment TEXT,

  -- Related entities
  estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'feedback'
      AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'feedback'
      AND column_name = 'feature'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_feedback_feature ON feedback(feature);
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'feedback'
      AND column_name = 'rating'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback(rating);
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'feedback'
      AND column_name = 'created_at'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
  END IF;
END;
$$;

-- RLS Policies
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own feedback" ON feedback;
DROP POLICY IF EXISTS "Users can create feedback" ON feedback;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'feedback'
      AND column_name = 'user_id'
  ) THEN
    CREATE POLICY "Users can view own feedback"
    ON feedback FOR SELECT
    USING (user_id = auth.uid());

    CREATE POLICY "Users can create feedback"
    ON feedback FOR INSERT
    WITH CHECK (user_id = auth.uid());
  END IF;
END;
$$;

-- =================================================================
-- 7. STORAGE BUCKETS
-- =================================================================

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('estimate-attachments', 'estimate-attachments', false),
  ('proposal-pdfs', 'proposal-pdfs', false),
  ('voice-recordings', 'voice-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for estimate-attachments
DROP POLICY IF EXISTS "Users can upload own estimate attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own estimate attachments" ON storage.objects;
CREATE POLICY "Users can upload own estimate attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'estimate-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own estimate attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'estimate-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for proposal-pdfs
DROP POLICY IF EXISTS "Users can upload own proposal PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own proposal PDFs" ON storage.objects;
CREATE POLICY "Users can upload own proposal PDFs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'proposal-pdfs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own proposal PDFs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'proposal-pdfs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for voice-recordings
DROP POLICY IF EXISTS "Users can upload own voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own voice recordings" ON storage.objects;
CREATE POLICY "Users can upload own voice recordings"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'voice-recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own voice recordings"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'voice-recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =================================================================
-- COMMENTS / DOCUMENTATION
-- =================================================================

COMMENT ON TABLE estimates IS 'AI-generated and manual construction estimates';
COMMENT ON TABLE ai_usage_logs IS 'Tracks AI API usage for cost monitoring';
COMMENT ON TABLE voice_recordings IS 'Voice recordings for voice-to-text estimate input (Week 4)';
COMMENT ON TABLE chat_messages IS 'AI chat conversation history for estimate refinement (Week 8)';
COMMENT ON TABLE proposals IS 'Professional proposals generated from estimates (Week 7)';
COMMENT ON TABLE feedback IS 'User feedback on AI features (Week 6)';

-- =================================================================
-- VERIFICATION
-- =================================================================

-- Run this to verify all tables were created:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('estimates', 'ai_usage_logs', 'voice_recordings', 'chat_messages', 'proposals', 'feedback')
-- ORDER BY table_name;
