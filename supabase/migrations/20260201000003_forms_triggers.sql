-- ============================================================================
-- FORMS MODULE - Database Triggers
-- ============================================================================
-- Migration: Create triggers for automatic updates and analytics
-- Description: Auto-update timestamps, version tracking, analytics caching
-- Author: CastorWorks Team
-- Date: 2026-02-01
-- ============================================================================

BEGIN;

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

-- Trigger for forms.updated_at
CREATE TRIGGER update_forms_updated_at
  BEFORE UPDATE ON forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for form_questions.updated_at
CREATE TRIGGER update_form_questions_updated_at
  BEFORE UPDATE ON form_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FORM VERSION TRACKING
-- ============================================================================

-- Auto-increment form version on question changes
CREATE OR REPLACE FUNCTION increment_form_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the parent form's version and updated_at
  UPDATE forms
  SET
    version = version + 1,
    updated_at = now()
  WHERE id = COALESCE(NEW.form_id, OLD.form_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger on INSERT, UPDATE, DELETE of form_questions
CREATE TRIGGER form_questions_version_trigger
  AFTER INSERT OR UPDATE OR DELETE ON form_questions
  FOR EACH ROW EXECUTE FUNCTION increment_form_version();

-- ============================================================================
-- ANALYTICS CACHE UPDATE
-- ============================================================================

-- Update analytics cache on response completion
CREATE OR REPLACE FUNCTION update_form_analytics_on_response()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_completion_time INTEGER;
BEGIN
  -- Only process when a response is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

    -- Calculate completion time in seconds
    v_completion_time := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at))::INTEGER;

    -- Insert or update analytics cache
    INSERT INTO form_analytics_cache (
      form_id,
      total_responses,
      completed_responses,
      average_completion_time_seconds,
      completion_rate,
      last_calculated_at
    )
    VALUES (
      NEW.form_id,
      1,
      1,
      v_completion_time,
      100.00,
      now()
    )
    ON CONFLICT (form_id) DO UPDATE SET
      total_responses = form_analytics_cache.total_responses + 1,
      completed_responses = form_analytics_cache.completed_responses + 1,
      average_completion_time_seconds = (
        (form_analytics_cache.average_completion_time_seconds * form_analytics_cache.completed_responses + v_completion_time)
        / (form_analytics_cache.completed_responses + 1)
      )::INTEGER,
      completion_rate = (
        (form_analytics_cache.completed_responses + 1.0) /
        (form_analytics_cache.total_responses + 1.0) * 100
      )::DECIMAL(5, 2),
      last_calculated_at = now();

  -- Track total responses on any insert (in_progress or completed)
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO form_analytics_cache (
      form_id,
      total_responses,
      completed_responses,
      last_calculated_at
    )
    VALUES (
      NEW.form_id,
      1,
      CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
      now()
    )
    ON CONFLICT (form_id) DO UPDATE SET
      total_responses = form_analytics_cache.total_responses + 1,
      last_calculated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on INSERT and UPDATE of form_responses
CREATE TRIGGER form_response_analytics_trigger
  AFTER INSERT OR UPDATE ON form_responses
  FOR EACH ROW EXECUTE FUNCTION update_form_analytics_on_response();

-- ============================================================================
-- PUBLISHED_AT AUTO-SET
-- ============================================================================

-- Auto-set published_at when status changes to 'published'
CREATE OR REPLACE FUNCTION set_published_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set published_at when changing to published status for the first time
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER form_published_at_trigger
  BEFORE INSERT OR UPDATE ON forms
  FOR EACH ROW EXECUTE FUNCTION set_published_at();

COMMIT;
