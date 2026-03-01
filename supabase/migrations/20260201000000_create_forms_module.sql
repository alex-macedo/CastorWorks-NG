-- ============================================================================
-- FORMS MODULE - Core Schema
-- ============================================================================
-- Migration: Create forms module tables
-- Description: Production-grade forms builder with Google Forms parity
-- Author: CastorWorks Team
-- Date: 2026-02-01
-- ============================================================================

BEGIN;

-- 1. FORMS TABLE
-- ============================================================================
CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed', 'archived')),

  -- Settings
  settings JSONB DEFAULT '{
    "collectEmail": false,
    "limitOneResponsePerUser": false,
    "showProgressBar": true,
    "shuffleQuestions": false,
    "confirmationMessage": "Thank you for your response!"
  }'::jsonb,

  -- Theme
  theme JSONB DEFAULT '{
    "primaryColor": "#3B82F6",
    "backgroundColor": "#FFFFFF",
    "fontFamily": "Inter",
    "logoUrl": null
  }'::jsonb,

  -- Limits
  response_limit INTEGER,
  deadline TIMESTAMP WITH TIME ZONE,

  -- Sharing
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_public BOOLEAN DEFAULT false,

  -- Metadata
  created_by UUID REFERENCES user_profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE,
  version INTEGER DEFAULT 1
);

-- 2. FORM QUESTIONS TABLE
-- ============================================================================
CREATE TABLE form_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE NOT NULL,

  -- Question definition
  type TEXT NOT NULL CHECK (type IN (
    'short_answer', 'paragraph', 'multiple_choice', 'checkboxes',
    'dropdown', 'linear_scale', 'date', 'time', 'file_upload',
    'matrix_grid', 'rating', 'section_break'
  )),
  title TEXT NOT NULL,
  description TEXT,

  -- Options (for choice-based questions)
  options JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"id": "uuid", "label": "Option 1", "value": "opt1"}]

  -- Validation
  required BOOLEAN DEFAULT false,
  validation JSONB DEFAULT '{}'::jsonb,
  -- Example: {"minLength": 10, "maxLength": 500, "pattern": "^[a-z]+$"}

  -- Conditional logic
  conditional_logic JSONB,
  -- Example: {"showIf": {"questionId": "uuid", "operator": "equals", "value": "yes"}}

  -- Layout
  position INTEGER NOT NULL DEFAULT 0,
  section_id UUID,

  -- Scale-specific (linear_scale, rating)
  scale_min INTEGER DEFAULT 1,
  scale_max INTEGER DEFAULT 5,
  scale_min_label TEXT,
  scale_max_label TEXT,

  -- Matrix-specific
  matrix_rows JSONB DEFAULT '[]'::jsonb,
  matrix_columns JSONB DEFAULT '[]'::jsonb,

  -- File upload specific
  allowed_file_types JSONB DEFAULT '["image/*", "application/pdf"]'::jsonb,
  max_file_size_mb INTEGER DEFAULT 10,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. FORM RESPONSES TABLE
-- ============================================================================
CREATE TABLE form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE NOT NULL,

  -- Respondent
  respondent_id UUID REFERENCES user_profiles(user_id),
  respondent_email TEXT,
  respondent_ip TEXT,

  -- Status
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  user_agent TEXT,
  referrer TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. FORM RESPONSE ANSWERS TABLE
-- ============================================================================
CREATE TABLE form_response_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID REFERENCES form_responses(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES form_questions(id) ON DELETE CASCADE NOT NULL,

  -- Answer data (flexible for all question types)
  answer_text TEXT,
  answer_options JSONB DEFAULT '[]'::jsonb,  -- For multi-select
  answer_number DECIMAL(15, 4),
  answer_date DATE,
  answer_time TIME,
  answer_file_urls JSONB DEFAULT '[]'::jsonb,
  answer_matrix JSONB,  -- For matrix responses

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  UNIQUE(response_id, question_id)
);

-- 5. FORM COLLABORATORS TABLE
-- ============================================================================
CREATE TABLE form_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE NOT NULL,

  access_level TEXT DEFAULT 'viewer' CHECK (access_level IN ('viewer', 'editor', 'admin')),

  invited_by UUID REFERENCES user_profiles(user_id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  UNIQUE(form_id, user_id)
);

-- 6. FORM ANALYTICS CACHE TABLE
-- ============================================================================
CREATE TABLE form_analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Aggregated metrics
  total_responses INTEGER DEFAULT 0,
  completed_responses INTEGER DEFAULT 0,
  average_completion_time_seconds INTEGER,
  completion_rate DECIMAL(5, 2),

  -- Per-question analytics (JSONB for flexibility)
  question_analytics JSONB DEFAULT '{}'::jsonb,
  -- Example: {"questionId": {"responseCount": 100, "distribution": {"opt1": 40, "opt2": 60}}}

  -- Time-series data
  daily_responses JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"date": "2026-01-30", "count": 25}]

  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. FORM WEBHOOKS TABLE
-- ============================================================================
CREATE TABLE form_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE NOT NULL,

  url TEXT NOT NULL,
  secret TEXT,
  events JSONB DEFAULT '["response.completed"]'::jsonb,

  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  failure_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Forms indexes
CREATE INDEX idx_forms_project_id ON forms(project_id);
CREATE INDEX idx_forms_status ON forms(status);
CREATE INDEX idx_forms_share_token ON forms(share_token);
CREATE INDEX idx_forms_created_by ON forms(created_by);

-- Form questions indexes
CREATE INDEX idx_form_questions_form_id ON form_questions(form_id);
CREATE INDEX idx_form_questions_position ON form_questions(form_id, position);
CREATE INDEX idx_form_questions_type ON form_questions(type);

-- Form responses indexes
CREATE INDEX idx_form_responses_form_id ON form_responses(form_id);
CREATE INDEX idx_form_responses_status ON form_responses(status);
CREATE INDEX idx_form_responses_completed_at ON form_responses(completed_at DESC);

-- Form response answers indexes
CREATE INDEX idx_form_response_answers_response_id ON form_response_answers(response_id);
CREATE INDEX idx_form_response_answers_question_id ON form_response_answers(question_id);

-- Form collaborators indexes
CREATE INDEX idx_form_collaborators_form_id ON form_collaborators(form_id);
CREATE INDEX idx_form_collaborators_user_id ON form_collaborators(user_id);

COMMIT;
