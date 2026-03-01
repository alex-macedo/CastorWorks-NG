-- Migration: Fix schedule dates for projects with calendar enabled
-- Purpose: Recalculate activity start_date and end_date so tasks respect project calendar
--          (no weekends/holidays when calendar_enabled=true).
-- Date: 2026-02-21
--
-- Fixes:
-- 1. Client-side getNextWorkDay was adding 1 day without skipping weekends
-- 2. Existing data may have wrong dates from before calendar was enabled

-- ============================================
-- 1. Create helper: get next working day after a date
-- ============================================

CREATE OR REPLACE FUNCTION get_next_working_day(
  p_project_id UUID,
  p_date DATE
) RETURNS DATE AS $$
DECLARE
  v_next DATE;
  v_iterations INTEGER := 0;
BEGIN
  v_next := p_date + 1;

  WHILE v_iterations < 365 LOOP
    IF is_day_working(p_project_id, v_next) THEN
      RETURN v_next;
    END IF;
    v_next := v_next + 1;
    v_iterations := v_iterations + 1;
  END LOOP;

  RAISE EXCEPTION 'Could not find next working day within 365 days after %', p_date;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_next_working_day IS 'Returns the next working day after the given date for a project, respecting calendar settings';

-- ============================================
-- 2. Create RPC to rebuild schedule for a project
-- ============================================
-- (Children under phases; nested activities under parents handled by phase sync)
CREATE OR REPLACE FUNCTION rebuild_project_schedule_for_calendar(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_project_start DATE;
  v_calendar_enabled BOOLEAN;
  v_cursor DATE;
  v_updated INTEGER := 0;
  v_phase_rec RECORD;
  v_activity_rec RECORD;
  v_child_rec RECORD;
  v_start DATE;
  v_end DATE;
  v_parent_id UUID;
  v_parent_start DATE;
  v_parent_end DATE;
BEGIN
  SELECT start_date::DATE, COALESCE(calendar_enabled, false)
  INTO v_project_start, v_calendar_enabled
  FROM projects WHERE id = p_project_id;

  IF v_project_start IS NULL OR NOT v_calendar_enabled THEN
    RETURN 0;
  END IF;

  IF NOT is_day_working(p_project_id, v_project_start) THEN
    v_project_start := get_next_working_day(p_project_id, v_project_start - 1);
  END IF;

  v_cursor := v_project_start;

  FOR v_phase_rec IN
    SELECT id, sort_order FROM project_phases
    WHERE project_id = p_project_id
    ORDER BY sort_order NULLS LAST, created_at
  LOOP
    FOR v_activity_rec IN
      SELECT pa.id, pa.days_for_activity,
             (SELECT COUNT(*) FROM project_activities c WHERE c.phase_id = pa.id) AS child_count
      FROM project_activities pa
      WHERE pa.phase_id = v_phase_rec.id
      ORDER BY pa.sequence NULLS LAST, pa.created_at
    LOOP
      IF v_activity_rec.child_count > 0 THEN
        v_parent_id := v_activity_rec.id;
        v_parent_start := v_cursor;
        v_parent_end := v_cursor;
        FOR v_child_rec IN
          SELECT pa.id, pa.days_for_activity
          FROM project_activities pa
          WHERE pa.phase_id = v_parent_id
          ORDER BY pa.sequence NULLS LAST, pa.created_at
        LOOP
          v_start := v_cursor;
          v_end := calculate_activity_end_date(v_start, COALESCE(v_child_rec.days_for_activity, 1), p_project_id, true);
          UPDATE project_activities SET start_date = v_start, end_date = v_end WHERE id = v_child_rec.id;
          v_updated := v_updated + 1;
          v_cursor := get_next_working_day(p_project_id, v_end);
          IF v_end > v_parent_end THEN v_parent_end := v_end; END IF;
        END LOOP;
        UPDATE project_activities SET start_date = v_parent_start, end_date = v_parent_end WHERE id = v_parent_id;
        v_updated := v_updated + 1;
        v_cursor := get_next_working_day(p_project_id, v_parent_end);
      ELSE
        v_start := v_cursor;
        v_end := calculate_activity_end_date(v_start, COALESCE(v_activity_rec.days_for_activity, 1), p_project_id, true);
        UPDATE project_activities SET start_date = v_start, end_date = v_end WHERE id = v_activity_rec.id;
        v_updated := v_updated + 1;
        v_cursor := get_next_working_day(p_project_id, v_end);
      END IF;
    END LOOP;
  END LOOP;

  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION rebuild_project_schedule_for_calendar IS 'Rebuilds activity start/end dates for a project with calendar enabled, ensuring tasks fall on working days only';

-- ============================================
-- 3. Run for all calendar-enabled projects
-- ============================================
DO $$
DECLARE
  v_project_id UUID;
  v_count INTEGER;
BEGIN
  FOR v_project_id IN
    SELECT id FROM projects WHERE COALESCE(calendar_enabled, false) = true
  LOOP
    v_count := rebuild_project_schedule_for_calendar(v_project_id);
    RAISE NOTICE 'Rebuilt schedule for project %: % activities updated', v_project_id, v_count;
  END LOOP;
END;
$$;
