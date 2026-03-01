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
DROP POLICY IF EXISTS "Users can create transcriptions" ON voice_transcriptions;
DROP POLICY IF EXISTS "Admins can view all transcriptions" ON voice_transcriptions;

CREATE POLICY "Users can view own transcriptions"
ON voice_transcriptions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create transcriptions"
ON voice_transcriptions FOR INSERT
WITH CHECK (user_id = auth.uid());

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
DROP POLICY IF EXISTS "Users can create chat messages" ON ai_chat_messages;
DROP POLICY IF EXISTS "Users can delete own chat sessions" ON ai_chat_messages;

CREATE POLICY "Users can view own chat messages"
ON ai_chat_messages FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create chat messages"
ON ai_chat_messages FOR INSERT
WITH CHECK (user_id = auth.uid());

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
DROP POLICY IF EXISTS "Public proposals viewable by hash" ON proposals;
DROP POLICY IF EXISTS "Users can create proposals" ON proposals;
DROP POLICY IF EXISTS "Users can update own proposals" ON proposals;
DROP POLICY IF EXISTS "Users can delete own draft proposals" ON proposals;

CREATE POLICY "Users can view own proposals"
ON proposals FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Public proposals viewable by hash"
ON proposals FOR SELECT
USING (public_hash IS NOT NULL); -- Anyone with the hash can view

CREATE POLICY "Users can create proposals"
ON proposals FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own proposals"
ON proposals FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

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
