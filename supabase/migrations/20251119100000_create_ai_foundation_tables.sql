-- =====================================================
-- AI FOUNDATION TABLES - Phase 1 Completion
-- =====================================================
-- Migration: 20251119100000
-- Description: Create core AI infrastructure tables for AI Implementation Plan Phase 1
-- Dependencies: auth.users, projects table
-- Related Epic: Epic 1 - AI Foundation Infrastructure (Week 1)
-- =====================================================

-- =====================================================
-- 1. AI INSIGHTS TABLE
-- =====================================================
-- Central storage for all AI-generated insights across all domains

CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Classification
  insight_type VARCHAR(100) NOT NULL, -- 'budget_risk', 'schedule_optimization', 'cost_variance', etc.
  domain VARCHAR(50) NOT NULL, -- 'budget', 'schedule', 'procurement', 'materials', 'quality', 'safety'

  -- Scope
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Content
  title TEXT NOT NULL,
  summary TEXT,
  content JSONB NOT NULL, -- Full AI response with structured data
  confidence_level INTEGER CHECK (confidence_level >= 0 AND confidence_level <= 100),

  -- AI Metadata
  prompt_version VARCHAR(50),
  model_used VARCHAR(100) DEFAULT 'google/gemini-2.5-flash',
  tokens_used INTEGER,
  processing_time_ms INTEGER,

  -- Lifecycle
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- When this insight becomes stale
  is_active BOOLEAN DEFAULT TRUE,

  -- User Feedback
  helpfulness_score INTEGER CHECK (helpfulness_score >= 1 AND helpfulness_score <= 5), -- 1-5 stars
  user_feedback TEXT,
  was_acted_upon BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_insights_project_id ON ai_insights(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_domain ON ai_insights(domain);
CREATE INDEX IF NOT EXISTS idx_ai_insights_active ON ai_insights(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_ai_insights_expires ON ai_insights(expires_at) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_ai_insights_generated ON ai_insights(generated_at DESC);

-- GIN index for JSONB content
CREATE INDEX IF NOT EXISTS idx_ai_insights_content ON ai_insights USING GIN(content);

-- Comments
COMMENT ON TABLE ai_insights IS 'Centralized storage for all AI-generated insights across all modules';
COMMENT ON COLUMN ai_insights.insight_type IS 'Specific type: budget_risk, schedule_delay_prediction, material_waste, etc.';
COMMENT ON COLUMN ai_insights.domain IS 'Module domain: budget, schedule, procurement, materials, quality, safety, financial';
COMMENT ON COLUMN ai_insights.content IS 'Full AI response in structured JSON format';
COMMENT ON COLUMN ai_insights.expires_at IS 'When this insight becomes stale and should be regenerated';
COMMENT ON COLUMN ai_insights.was_acted_upon IS 'Whether user took action based on this insight';

-- =====================================================
-- 2. AI RECOMMENDATIONS TABLE
-- =====================================================
-- Actionable recommendations with tracking and outcome measurement

CREATE TABLE IF NOT EXISTS ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  insight_id UUID REFERENCES ai_insights(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Classification
  category VARCHAR(50) NOT NULL, -- 'cost_saving', 'schedule_optimization', 'risk_mitigation', etc.
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reasoning TEXT, -- Why this recommendation was made

  -- Expected Impact
  expected_impact JSONB, -- { savings: 5000, time_saved_days: 3, risk_reduction: 20, etc. }

  -- Action Details
  action_type VARCHAR(50), -- 'adjust_budget', 'reschedule_activity', 'change_supplier', etc.
  action_payload JSONB, -- Specific data needed to execute the action

  -- Status Tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'applied', 'expired')),
  applied_at TIMESTAMPTZ,
  applied_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,

  -- Outcome Measurement
  actual_impact JSONB, -- Measured after implementation
  effectiveness_score INTEGER CHECK (effectiveness_score >= 0 AND effectiveness_score <= 100),
  outcome_notes TEXT,

  -- Lifecycle
  expires_at TIMESTAMPTZ, -- Recommendation no longer relevant after this

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_insight_id ON ai_recommendations(insight_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_project_id ON ai_recommendations(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user_id ON ai_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_status ON ai_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_priority ON ai_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_category ON ai_recommendations(category);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_created ON ai_recommendations(created_at DESC);

-- GIN indexes for JSONB
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_expected_impact ON ai_recommendations USING GIN(expected_impact);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_actual_impact ON ai_recommendations USING GIN(actual_impact);

-- Comments
COMMENT ON TABLE ai_recommendations IS 'Actionable AI recommendations with status tracking and outcome measurement';
COMMENT ON COLUMN ai_recommendations.expected_impact IS 'Predicted impact: {savings: number, time_saved_days: number, risk_reduction: number}';
COMMENT ON COLUMN ai_recommendations.actual_impact IS 'Measured impact after implementation';
COMMENT ON COLUMN ai_recommendations.effectiveness_score IS 'How effective was this recommendation (0-100)';

-- =====================================================
-- 3. AI CONFIGURATIONS TABLE
-- =====================================================
-- Feature toggles and user preferences for AI features

CREATE TABLE IF NOT EXISTS ai_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  scope VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (scope IN ('global', 'project', 'user')),

  -- Feature Toggles
  enabled_features JSONB DEFAULT '{
    "budget_insights": true,
    "budget_risk_assessment": true,
    "cost_prediction": true,
    "schedule_optimization": true,
    "delay_prediction": true,
    "material_analysis": true,
    "procurement_recommendations": true,
    "quality_inspection": true,
    "safety_scanning": true,
    "financial_anomaly_detection": true
  }'::jsonb,

  -- AI Preferences
  preferences JSONB DEFAULT '{
    "notification_frequency": "daily",
    "confidence_threshold": 70,
    "auto_apply_low_risk": false,
    "show_similar_projects": true,
    "language": "en"
  }'::jsonb,

  -- Cache Settings
  cache_duration_hours INTEGER DEFAULT 6 CHECK (cache_duration_hours >= 1 AND cache_duration_hours <= 168),
  auto_refresh BOOLEAN DEFAULT TRUE,

  -- Notification Preferences
  notification_settings JSONB DEFAULT '{
    "email_enabled": true,
    "push_enabled": true,
    "priority_threshold": "medium"
  }'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique configuration per scope
  UNIQUE(user_id, project_id, scope)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_configurations_user_id ON ai_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_configurations_project_id ON ai_configurations(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_configurations_scope ON ai_configurations(scope);

-- GIN indexes for JSONB
CREATE INDEX IF NOT EXISTS idx_ai_configurations_enabled_features ON ai_configurations USING GIN(enabled_features);
CREATE INDEX IF NOT EXISTS idx_ai_configurations_preferences ON ai_configurations USING GIN(preferences);

-- Comments
COMMENT ON TABLE ai_configurations IS 'User and project-level AI feature configurations and preferences';
COMMENT ON COLUMN ai_configurations.scope IS 'Configuration level: global (system-wide), project (per-project), user (per-user)';
COMMENT ON COLUMN ai_configurations.enabled_features IS 'Which AI features are enabled';
COMMENT ON COLUMN ai_configurations.preferences IS 'User preferences: notification frequency, confidence threshold, etc.';
COMMENT ON COLUMN ai_configurations.cache_duration_hours IS 'How long to cache AI insights (1-168 hours)';

-- =====================================================
-- 4. AI MODEL PERFORMANCE TABLE
-- =====================================================
-- Track accuracy and performance metrics over time

CREATE TABLE IF NOT EXISTS ai_model_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Model Details
  model_name VARCHAR(100) NOT NULL, -- 'google/gemini-2.5-flash', 'custom-cost-predictor', etc.
  prompt_version VARCHAR(50),
  insight_type VARCHAR(100), -- Which type of insight/prediction this tracks
  domain VARCHAR(50), -- budget, schedule, etc.

  -- Performance Metrics
  total_predictions INTEGER DEFAULT 0,
  accurate_predictions INTEGER DEFAULT 0,
  accuracy_percentage DECIMAL(5,2), -- Calculated: (accurate/total) * 100

  -- Quality Metrics
  avg_confidence_level DECIMAL(5,2),
  avg_processing_time_ms INTEGER,
  avg_tokens_used DECIMAL(10,2),
  avg_cost_per_prediction DECIMAL(10,6),

  -- User Satisfaction
  avg_rating DECIMAL(3,2), -- 1.00 to 5.00
  total_ratings INTEGER DEFAULT 0,
  thumbs_up_count INTEGER DEFAULT 0,
  thumbs_down_count INTEGER DEFAULT 0,
  satisfaction_rate DECIMAL(5,2), -- (thumbs_up / total) * 100

  -- Effectiveness
  recommendations_accepted INTEGER DEFAULT 0,
  recommendations_rejected INTEGER DEFAULT 0,
  acceptance_rate DECIMAL(5,2),
  avg_effectiveness_score DECIMAL(5,2), -- Average of recommendation effectiveness

  -- Time Period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_model_performance_model_name ON ai_model_performance(model_name);
CREATE INDEX IF NOT EXISTS idx_ai_model_performance_insight_type ON ai_model_performance(insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_model_performance_domain ON ai_model_performance(domain);
CREATE INDEX IF NOT EXISTS idx_ai_model_performance_period ON ai_model_performance(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_ai_model_performance_accuracy ON ai_model_performance(accuracy_percentage DESC);

-- Comments
COMMENT ON TABLE ai_model_performance IS 'Tracks AI model accuracy and performance metrics over time';
COMMENT ON COLUMN ai_model_performance.accuracy_percentage IS 'Percentage of accurate predictions vs total predictions';
COMMENT ON COLUMN ai_model_performance.satisfaction_rate IS 'Percentage of positive user feedback';
COMMENT ON COLUMN ai_model_performance.acceptance_rate IS 'Percentage of recommendations accepted by users';
COMMENT ON COLUMN ai_model_performance.avg_effectiveness_score IS 'Average effectiveness of implemented recommendations (0-100)';

-- =====================================================
-- 5. AI TRAINING DATA TABLE
-- =====================================================
-- Store validated data for continuous learning and prompt improvement

CREATE TABLE IF NOT EXISTS ai_training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source Tracking
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('user_feedback', 'validated_prediction', 'manual_entry', 'actual_outcome')),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Domain
  domain VARCHAR(50) NOT NULL, -- budget, schedule, etc.
  insight_type VARCHAR(100), -- Specific type of insight

  -- Training Example
  input_data JSONB NOT NULL, -- The context/data provided to AI
  expected_output JSONB NOT NULL, -- What the output should have been
  actual_output JSONB, -- What the AI actually produced

  -- Quality Assessment
  is_validated BOOLEAN DEFAULT FALSE,
  validated_by UUID REFERENCES auth.users(id),
  validated_at TIMESTAMPTZ,
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  quality_notes TEXT,

  -- Usage Tracking
  times_used INTEGER DEFAULT 0, -- How many times used in training/prompts
  last_used_at TIMESTAMPTZ,

  -- Effectiveness (if used for recommendation)
  was_effective BOOLEAN,
  effectiveness_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_training_data_source_type ON ai_training_data(source_type);
CREATE INDEX IF NOT EXISTS idx_ai_training_data_project_id ON ai_training_data(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_training_data_domain ON ai_training_data(domain);
CREATE INDEX IF NOT EXISTS idx_ai_training_data_insight_type ON ai_training_data(insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_training_data_validated ON ai_training_data(is_validated) WHERE is_validated = TRUE;
CREATE INDEX IF NOT EXISTS idx_ai_training_data_quality ON ai_training_data(quality_score DESC) WHERE is_validated = TRUE;
CREATE INDEX IF NOT EXISTS idx_ai_training_data_created ON ai_training_data(created_at DESC);

-- GIN indexes for JSONB
CREATE INDEX IF NOT EXISTS idx_ai_training_data_input ON ai_training_data USING GIN(input_data);
CREATE INDEX IF NOT EXISTS idx_ai_training_data_expected_output ON ai_training_data USING GIN(expected_output);
CREATE INDEX IF NOT EXISTS idx_ai_training_data_actual_output ON ai_training_data USING GIN(actual_output);

-- Comments
COMMENT ON TABLE ai_training_data IS 'Validated training examples for continuous AI improvement';
COMMENT ON COLUMN ai_training_data.source_type IS 'Where this training data came from';
COMMENT ON COLUMN ai_training_data.input_data IS 'Context and data provided to AI (for few-shot learning)';
COMMENT ON COLUMN ai_training_data.expected_output IS 'The correct/ideal output';
COMMENT ON COLUMN ai_training_data.actual_output IS 'What the AI actually produced (if applicable)';
COMMENT ON COLUMN ai_training_data.quality_score IS 'Human-assessed quality of this training example (0-100)';

-- =====================================================
-- 6. ENHANCE EXISTING COST_PREDICTIONS TABLE
-- =====================================================
-- Add new columns to track accuracy and feedback

DO $$
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'cost_predictions' AND column_name = 'prompt_version') THEN
    ALTER TABLE cost_predictions ADD COLUMN prompt_version VARCHAR(50);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'cost_predictions' AND column_name = 'model_used') THEN
    ALTER TABLE cost_predictions ADD COLUMN model_used VARCHAR(100) DEFAULT 'google/gemini-2.5-flash';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'cost_predictions' AND column_name = 'tokens_used') THEN
    ALTER TABLE cost_predictions ADD COLUMN tokens_used INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'cost_predictions' AND column_name = 'actual_cost') THEN
    ALTER TABLE cost_predictions ADD COLUMN actual_cost DECIMAL(15,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'cost_predictions' AND column_name = 'accuracy_percentage') THEN
    ALTER TABLE cost_predictions ADD COLUMN accuracy_percentage DECIMAL(5,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'cost_predictions' AND column_name = 'user_feedback') THEN
    ALTER TABLE cost_predictions ADD COLUMN user_feedback TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'cost_predictions' AND column_name = 'was_helpful') THEN
    ALTER TABLE cost_predictions ADD COLUMN was_helpful BOOLEAN;
  END IF;
END $$;

-- Add index for accuracy tracking
CREATE INDEX IF NOT EXISTS idx_cost_predictions_accuracy ON cost_predictions(accuracy_percentage DESC)
  WHERE accuracy_percentage IS NOT NULL;

COMMENT ON COLUMN cost_predictions.actual_cost IS 'Actual final cost (filled when project completes)';
COMMENT ON COLUMN cost_predictions.accuracy_percentage IS 'Calculated accuracy: 100 - ABS((actual - predicted) / actual * 100)';

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- ai_insights
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view insights for their projects" ON ai_insights;
CREATE POLICY "Users can view insights for their projects"
ON ai_insights FOR SELECT
USING (
  auth.uid() = user_id
  OR
  project_id IN (
    SELECT p.id FROM projects p
    LEFT JOIN project_team_members ptm ON ptm.project_id = p.id
    WHERE ptm.user_id = auth.uid()
  )
  OR
  has_role(auth.uid(), 'admin')
);

-- Note: Service role bypasses RLS, so no policy needed for service_role
-- This policy allows admins and users with project access to insert insights
DROP POLICY IF EXISTS "Admins and project members can insert insights" ON ai_insights;
CREATE POLICY "Admins and project members can insert insights"
ON ai_insights FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR
  project_id IN (
    SELECT p.id FROM projects p
    LEFT JOIN project_team_members ptm ON ptm.project_id = p.id
    WHERE ptm.user_id = auth.uid()
  )
  OR
  auth.uid() = user_id
);

DROP POLICY IF EXISTS "Users can update their own insights feedback" ON ai_insights;
CREATE POLICY "Users can update their own insights feedback"
ON ai_insights FOR UPDATE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- ai_recommendations
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view recommendations for their projects" ON ai_recommendations;
CREATE POLICY "Users can view recommendations for their projects"
ON ai_recommendations FOR SELECT
USING (
  auth.uid() = user_id
  OR
  project_id IN (
    SELECT p.id FROM projects p
    LEFT JOIN project_team_members ptm ON ptm.project_id = p.id
    WHERE ptm.user_id = auth.uid()
  )
  OR
  has_role(auth.uid(), 'admin')
);

-- Note: Service role bypasses RLS, so no policy needed for service_role
-- This policy allows admins and users with project access to insert recommendations
DROP POLICY IF EXISTS "Admins and project members can insert recommendations" ON ai_recommendations;
CREATE POLICY "Admins and project members can insert recommendations"
ON ai_recommendations FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR
  project_id IN (
    SELECT p.id FROM projects p
    LEFT JOIN project_team_members ptm ON ptm.project_id = p.id
    WHERE ptm.user_id = auth.uid()
  )
  OR
  auth.uid() = user_id
);

DROP POLICY IF EXISTS "Users can update recommendation status" ON ai_recommendations;
CREATE POLICY "Users can update recommendation status"
ON ai_recommendations FOR UPDATE
USING (
  auth.uid() = user_id
  OR project_id IN (
    SELECT p.id FROM projects p
    LEFT JOIN project_team_members ptm ON ptm.project_id = p.id
    WHERE ptm.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

-- ai_configurations
ALTER TABLE ai_configurations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own configurations" ON ai_configurations;
CREATE POLICY "Users can view own configurations"
ON ai_configurations FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can create own configurations" ON ai_configurations;
CREATE POLICY "Users can create own configurations"
ON ai_configurations FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own configurations" ON ai_configurations;
CREATE POLICY "Users can update own configurations"
ON ai_configurations FOR UPDATE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- ai_model_performance
ALTER TABLE ai_model_performance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all performance metrics" ON ai_model_performance;
CREATE POLICY "Admins can view all performance metrics"
ON ai_model_performance FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Note: Service role bypasses RLS, so no policy needed for service_role
-- Only admins can manage performance metrics
DROP POLICY IF EXISTS "Admins can manage performance metrics" ON ai_model_performance;
CREATE POLICY "Admins can manage performance metrics"
ON ai_model_performance FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- ai_training_data
ALTER TABLE ai_training_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all training data" ON ai_training_data;
CREATE POLICY "Admins can view all training data"
ON ai_training_data FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Note: Service role bypasses RLS, so no policy needed for service_role
-- Only admins can manage training data
DROP POLICY IF EXISTS "Admins can manage training data" ON ai_training_data;
CREATE POLICY "Admins can manage training data"
ON ai_training_data FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to expire old insights
CREATE OR REPLACE FUNCTION expire_old_insights()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE ai_insights
  SET is_active = FALSE
  WHERE is_active = TRUE
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION expire_old_insights IS 'Marks insights as inactive when they expire (run via cron)';

-- Function to calculate recommendation acceptance rate
CREATE OR REPLACE FUNCTION calculate_recommendation_stats(
  p_project_id UUID DEFAULT NULL,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_recommendations BIGINT,
  accepted BIGINT,
  rejected BIGINT,
  pending BIGINT,
  acceptance_rate DECIMAL,
  avg_effectiveness DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_recommendations,
    COUNT(*) FILTER (WHERE status = 'accepted')::BIGINT as accepted,
    COUNT(*) FILTER (WHERE status = 'rejected')::BIGINT as rejected,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending,
    ROUND(
      CASE
        WHEN COUNT(*) FILTER (WHERE status IN ('accepted', 'rejected')) > 0
        THEN (COUNT(*) FILTER (WHERE status = 'accepted'))::DECIMAL /
             (COUNT(*) FILTER (WHERE status IN ('accepted', 'rejected')))::DECIMAL * 100
        ELSE 0
      END,
      2
    ) as acceptance_rate,
    ROUND(AVG(effectiveness_score), 2) as avg_effectiveness
  FROM ai_recommendations
  WHERE (p_project_id IS NULL OR project_id = p_project_id)
    AND created_at >= NOW() - (p_days_back || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION calculate_recommendation_stats(UUID, INTEGER) TO authenticated;

COMMENT ON FUNCTION calculate_recommendation_stats IS 'Calculate recommendation acceptance rate and effectiveness';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ai_insights_updated_at ON ai_insights;
CREATE TRIGGER update_ai_insights_updated_at
  BEFORE UPDATE ON ai_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_updated_at();

DROP TRIGGER IF EXISTS update_ai_recommendations_updated_at ON ai_recommendations;
CREATE TRIGGER update_ai_recommendations_updated_at
  BEFORE UPDATE ON ai_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_updated_at();

DROP TRIGGER IF EXISTS update_ai_configurations_updated_at ON ai_configurations;
CREATE TRIGGER update_ai_configurations_updated_at
  BEFORE UPDATE ON ai_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_updated_at();

DROP TRIGGER IF EXISTS update_ai_model_performance_updated_at ON ai_model_performance;
CREATE TRIGGER update_ai_model_performance_updated_at
  BEFORE UPDATE ON ai_model_performance
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_updated_at();

DROP TRIGGER IF EXISTS update_ai_training_data_updated_at ON ai_training_data;
CREATE TRIGGER update_ai_training_data_updated_at
  BEFORE UPDATE ON ai_training_data
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_updated_at();

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify all tables were created
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'ai_insights',
      'ai_recommendations',
      'ai_configurations',
      'ai_model_performance',
      'ai_training_data'
    );

  IF table_count = 5 THEN
    RAISE NOTICE 'SUCCESS: All 5 AI foundation tables created successfully';
  ELSE
    RAISE EXCEPTION 'FAILED: Only % out of 5 tables were created', table_count;
  END IF;
END $$;
