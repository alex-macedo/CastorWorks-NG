-- ============================================================================
-- FORMS MODULE - Row Level Security Policies
-- ============================================================================
-- Migration: Enable RLS and create security policies
-- Description: Implements form-level access control with collaborator support
-- Author: CastorWorks Team
-- Date: 2026-02-01
-- ============================================================================

BEGIN;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_response_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_webhooks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTION: Check if user has form access
-- ============================================================================

CREATE OR REPLACE FUNCTION has_form_access(p_user_id UUID, p_form_id UUID, p_min_level TEXT DEFAULT 'viewer')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_form forms;
  v_access_level TEXT;
BEGIN
  -- Null user check
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO v_form FROM forms WHERE id = p_form_id;

  -- Form doesn't exist
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Owner always has access
  IF v_form.created_by = p_user_id THEN
    RETURN true;
  END IF;

  -- Admin always has access
  IF has_role(p_user_id, 'admin') THEN
    RETURN true;
  END IF;

  -- Check collaborator access
  SELECT access_level INTO v_access_level
  FROM form_collaborators
  WHERE form_id = p_form_id AND user_id = p_user_id;

  IF v_access_level IS NULL THEN
    RETURN false;
  END IF;

  -- Check minimum level
  CASE p_min_level
    WHEN 'viewer' THEN RETURN true;
    WHEN 'editor' THEN RETURN v_access_level IN ('editor', 'admin');
    WHEN 'admin' THEN RETURN v_access_level = 'admin';
    ELSE RETURN false;
  END CASE;
END;
$$;

-- ============================================================================
-- FORMS POLICIES
-- ============================================================================

-- Users can view forms they have access to OR public published forms
CREATE POLICY "Users can view forms they have access to" ON forms
  FOR SELECT USING (
    has_form_access(auth.uid(), id, 'viewer')
    OR (is_public = true AND status = 'published')
  );

-- Users can create forms
CREATE POLICY "Users can create forms" ON forms
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Users can update forms they can edit
CREATE POLICY "Users can update forms they can edit" ON forms
  FOR UPDATE USING (has_form_access(auth.uid(), id, 'editor'));

-- Admins can delete forms
CREATE POLICY "Admins can delete forms" ON forms
  FOR DELETE USING (has_form_access(auth.uid(), id, 'admin'));

-- ============================================================================
-- FORM QUESTIONS POLICIES
-- ============================================================================

-- Users can view questions for accessible forms OR public forms
CREATE POLICY "Users can view questions for accessible forms" ON form_questions
  FOR SELECT USING (
    has_form_access(auth.uid(), form_id, 'viewer')
    OR EXISTS (SELECT 1 FROM forms WHERE id = form_id AND is_public = true AND status = 'published')
  );

-- Editors can insert questions
CREATE POLICY "Editors can insert questions" ON form_questions
  FOR INSERT WITH CHECK (has_form_access(auth.uid(), form_id, 'editor'));

-- Editors can update questions
CREATE POLICY "Editors can update questions" ON form_questions
  FOR UPDATE USING (has_form_access(auth.uid(), form_id, 'editor'));

-- Editors can delete questions
CREATE POLICY "Editors can delete questions" ON form_questions
  FOR DELETE USING (has_form_access(auth.uid(), form_id, 'editor'));

-- ============================================================================
-- FORM RESPONSES POLICIES
-- ============================================================================

-- Public users can submit responses to public forms
CREATE POLICY "authenticated_insert_form_responses_public" ON form_responses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM forms WHERE id = form_id AND is_public = true AND status = 'published')
    OR auth.uid() IS NOT NULL
  );

-- Users can view their own responses
CREATE POLICY "Users can view their own responses" ON form_responses
  FOR SELECT USING (
    respondent_id = auth.uid()
    OR has_form_access(auth.uid(), form_id, 'viewer')
  );

-- Users can update their own in-progress responses
CREATE POLICY "Users can update their own responses" ON form_responses
  FOR UPDATE USING (
    respondent_id = auth.uid() AND status = 'in_progress'
  );

-- ============================================================================
-- RESPONSE ANSWERS POLICIES
-- ============================================================================

-- Can insert answers for responses they can access
CREATE POLICY "Can insert answers for own responses" ON form_response_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM form_responses
      WHERE id = response_id
      AND (respondent_id = auth.uid() OR EXISTS (SELECT 1 FROM forms WHERE id = form_responses.form_id AND is_public = true))
    )
  );

-- Form owners can view all answers
CREATE POLICY "Form owners can view answers" ON form_response_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM form_responses r
      WHERE r.id = response_id
      AND (r.respondent_id = auth.uid() OR has_form_access(auth.uid(), r.form_id, 'viewer'))
    )
  );

-- Users can update their own answers for in-progress responses
CREATE POLICY "Users can update their own answers" ON form_response_answers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM form_responses r
      WHERE r.id = response_id
      AND r.respondent_id = auth.uid()
      AND r.status = 'in_progress'
    )
  );

-- ============================================================================
-- COLLABORATORS POLICIES
-- ============================================================================

-- Admins can manage collaborators
CREATE POLICY "Admins can manage collaborators" ON form_collaborators
  FOR ALL USING (has_form_access(auth.uid(), form_id, 'admin'));

-- Users can view their collaborations
CREATE POLICY "Users can view their collaborations" ON form_collaborators
  FOR SELECT USING (user_id = auth.uid());

-- ============================================================================
-- ANALYTICS CACHE POLICIES
-- ============================================================================

-- Viewers can see analytics
CREATE POLICY "Viewers can see analytics" ON form_analytics_cache
  FOR SELECT USING (has_form_access(auth.uid(), form_id, 'viewer'));

-- System can update analytics (service role or authenticated)
CREATE POLICY "service_role_update_analytics" ON form_analytics_cache
  FOR ALL USING (auth.role() IN ('service_role', 'authenticated'));

-- ============================================================================
-- WEBHOOKS POLICIES
-- ============================================================================

-- Admins can manage webhooks
CREATE POLICY "Admins can view webhooks" ON form_webhooks
  FOR SELECT USING (has_form_access(auth.uid(), form_id, 'admin'));

CREATE POLICY "Admins can insert webhooks" ON form_webhooks
  FOR INSERT WITH CHECK (has_form_access(auth.uid(), form_id, 'admin'));

CREATE POLICY "Admins can update webhooks" ON form_webhooks
  FOR UPDATE USING (has_form_access(auth.uid(), form_id, 'admin'));

CREATE POLICY "Admins can delete webhooks" ON form_webhooks
  FOR DELETE USING (has_form_access(auth.uid(), form_id, 'admin'));

COMMIT;
