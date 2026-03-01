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
DROP POLICY IF EXISTS "Users can insert own usage logs" ON ai_usage_logs;
DROP POLICY IF EXISTS "Admins can view all usage logs" ON ai_usage_logs;

CREATE POLICY "Users can view own usage logs"
ON ai_usage_logs FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own usage logs
-- Note: Edge Functions with service role bypass RLS entirely
-- This policy ensures non-service-role inserts are properly scoped
CREATE POLICY "Users can insert own usage logs"
ON ai_usage_logs FOR INSERT
WITH CHECK (user_id = auth.uid());

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
DROP POLICY IF EXISTS "Users can submit feedback" ON ai_feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON ai_feedback;

CREATE POLICY "Users can view own feedback"
ON ai_feedback FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can submit feedback"
ON ai_feedback FOR INSERT
WITH CHECK (user_id = auth.uid());

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
