-- Migration: Update activity date calculation to support working days
-- Purpose: Enable working day calculations for project activities instead of calendar days
-- Created: 2025-12-18
-- Phase: 3 - Database Trigger Updates
--
-- CRITICAL: This logic must match the client-side workingDayCalculators.ts
--           to ensure consistency between UI and database calculations.

-- ============================================
-- 1. Create helper function to check if a day is working
-- ============================================

-- Day name mapping (0=Sunday, 1=Monday, ..., 6=Saturday)
CREATE OR REPLACE FUNCTION get_day_name(p_date DATE) RETURNS TEXT AS $$
DECLARE
  v_day_num INTEGER;
BEGIN
  v_day_num := EXTRACT(DOW FROM p_date); -- 0=Sunday, 1=Monday, ..., 6=Saturday
  RETURN CASE v_day_num
    WHEN 0 THEN 'sunday'
    WHEN 1 THEN 'monday'
    WHEN 2 THEN 'tuesday'
    WHEN 3 THEN 'wednesday'
    WHEN 4 THEN 'thursday'
    WHEN 5 THEN 'friday'
    WHEN 6 THEN 'saturday'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Check if a specific date is a working day for a project
-- Returns: true if working day, false if non-working
--
-- Logic:
-- 1. If calendar_enabled = false: use Mon-Fri pattern only
-- 2. If calendar_enabled = true:
--    a. Check if date is explicitly marked as non-working in project_calendar
--    b. If not found, use default working days pattern from project
CREATE OR REPLACE FUNCTION is_day_working(
  p_project_id UUID,
  p_check_date DATE
) RETURNS BOOLEAN AS $$
DECLARE
  v_calendar_enabled BOOLEAN;
  v_default_working_days TEXT;
  v_day_name TEXT;
  v_calendar_entry RECORD;
BEGIN
  -- Get project calendar settings
  SELECT calendar_enabled, calendar_default_working_days
  INTO v_calendar_enabled, v_default_working_days
  FROM projects
  WHERE id = p_project_id;

  -- If project not found or calendar not enabled, use default Mon-Fri
  IF v_calendar_enabled IS NULL OR NOT v_calendar_enabled THEN
    v_day_name := get_day_name(p_check_date);
    -- Default Mon-Fri: return true for Mon-Fri, false for Sat-Sun
    RETURN v_day_name IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday');
  END IF;

  -- Calendar is enabled: check for explicit overrides first
  SELECT calendar_date, is_working_day
  INTO v_calendar_entry
  FROM project_calendar
  WHERE project_id = p_project_id
    AND calendar_date = p_check_date
  LIMIT 1;

  -- If explicit entry exists, use it
  IF FOUND THEN
    RETURN v_calendar_entry.is_working_day;
  END IF;

  -- No explicit entry: use default working days pattern
  v_day_name := get_day_name(p_check_date);
  v_default_working_days := COALESCE(v_default_working_days, 'monday,tuesday,wednesday,thursday,friday');

  -- Check if day name is in the default working days
  RETURN v_day_name = ANY(string_to_array(v_default_working_days, ','));
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION is_day_working IS 'Check if a specific date is a working day for a project, considering calendar settings and overrides';

-- ============================================
-- 2. Update calculate_activity_end_date function
-- ============================================

-- First, drop the old version of the function
DROP FUNCTION IF EXISTS calculate_activity_end_date(DATE, INTEGER);

-- Calculate activity end date using working days
--
-- CRITICAL: This must match calculateEndDateByWorkingDays() in workingDayCalculators.ts
--
-- Algorithm:
-- 1. Start from p_start_date
-- 2. Count only working days (skip non-working days)
-- 3. Stop when we've counted p_days_for_activity working days
-- 4. Return the end date
--
-- Example:
--   Start: 2025-09-01 (Mon), Duration: 5 working days
--   Count: Mon(1), Tue(2), Wed(3), Thu(4), Fri(5)
--   End: 2025-09-05 (Fri)
--
--   If 2025-09-02 (Tue) is holiday:
--   Count: Mon(1), Wed(2), Thu(3), Fri(4), Mon(5)
--   End: 2025-09-08 (Mon)
CREATE OR REPLACE FUNCTION calculate_activity_end_date(
  p_start_date DATE,
  p_days_for_activity INTEGER,
  p_project_id UUID DEFAULT NULL,
  p_calendar_enabled BOOLEAN DEFAULT false
) RETURNS DATE AS $$
DECLARE
  v_current_date DATE;
  v_days_counted INTEGER;
  v_iterations INTEGER;
BEGIN
  -- Handle 0 or negative duration
  IF p_days_for_activity IS NULL OR p_days_for_activity <= 0 THEN
    RETURN p_start_date;
  END IF;

  -- If calendar not enabled or project_id not provided, use simple calendar day calculation
  IF p_project_id IS NULL OR NOT p_calendar_enabled THEN
    -- Simple calendar day calculation: start date is day 1
    -- So subtract 1 from the duration to get the number of days to add
    RETURN p_start_date + (p_days_for_activity - 1);
  END IF;

  -- Calendar is enabled: use working day calculation
  v_current_date := p_start_date;
  v_days_counted := 0;
  v_iterations := 0;

  -- CRITICAL: This loop must match the client-side logic exactly
  -- Loop until we've counted p_days_for_activity working days
  WHILE v_days_counted < p_days_for_activity LOOP
    -- Safety check: prevent infinite loops (max 3650 iterations = ~10 years)
    v_iterations := v_iterations + 1;
    IF v_iterations > 3650 THEN
      RAISE EXCEPTION 'Could not find % working days within 3650 calendar days starting from %',
        p_days_for_activity, p_start_date;
    END IF;

    -- Check if current date is a working day
    IF is_day_working(p_project_id, v_current_date) THEN
      v_days_counted := v_days_counted + 1;

      -- If we've reached the target, return current date
      IF v_days_counted = p_days_for_activity THEN
        RETURN v_current_date;
      END IF;
    END IF;

    -- Move to next day
    v_current_date := v_current_date + 1;
  END LOOP;

  -- Should never reach here, but return current date as fallback
  RETURN v_current_date;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_activity_end_date IS 'Calculate activity end date from start date and duration, supporting both calendar days and working days';

-- ============================================
-- 3. Update auto_calculate_activity_end_date trigger
-- ============================================

-- First, drop the old trigger and function
DROP TRIGGER IF EXISTS auto_calculate_activity_end_date_trigger ON project_activities;
DROP FUNCTION IF EXISTS auto_calculate_activity_end_date() CASCADE;

-- Auto-calculate end_date for activity before insert/update
-- Now passes project_id and calendar_enabled to calculate_activity_end_date
CREATE OR REPLACE FUNCTION auto_calculate_activity_end_date()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
  v_calendar_enabled BOOLEAN;
BEGIN
  -- Calculate end_date from start_date + days_for_activity
  IF NEW.start_date IS NOT NULL AND NEW.days_for_activity IS NOT NULL THEN
    -- Get project_id from the activity (directly or via phase)
    v_project_id := NEW.project_id;

    -- If project_id not directly on activity, get it from phase
    IF v_project_id IS NULL AND NEW.phase_id IS NOT NULL THEN
      SELECT project_id INTO v_project_id
      FROM project_phases
      WHERE id = NEW.phase_id;
    END IF;

    -- Get calendar_enabled setting from project
    IF v_project_id IS NOT NULL THEN
      SELECT calendar_enabled INTO v_calendar_enabled
      FROM projects
      WHERE id = v_project_id;
    END IF;

    -- Calculate end_date using working days if calendar enabled
    NEW.end_date := calculate_activity_end_date(
      NEW.start_date,
      NEW.days_for_activity,
      v_project_id,
      COALESCE(v_calendar_enabled, false)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_calculate_activity_end_date IS 'Trigger function to auto-calculate activity end_date considering project calendar settings';

-- ============================================
-- 4. Recreate trigger
-- ============================================

-- Drop and recreate trigger to ensure it uses updated function
DROP TRIGGER IF EXISTS auto_calculate_activity_end_date_trigger ON project_activities;
CREATE TRIGGER auto_calculate_activity_end_date_trigger
  BEFORE INSERT OR UPDATE OF start_date, days_for_activity ON project_activities
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_activity_end_date();

COMMENT ON TRIGGER auto_calculate_activity_end_date_trigger ON project_activities IS
  'Automatically calculates activity end_date from start_date and days_for_activity, considering project calendar if enabled';

-- ============================================
-- Migration complete
-- ============================================

-- Note: The sync_phase_with_activities() function continues to work as-is
--       because it aggregates activity dates, which are already correctly calculated
--       by the auto_calculate_activity_end_date trigger.

-- Rollback instructions (if needed):
-- DROP FUNCTION IF EXISTS is_day_working CASCADE;
-- DROP FUNCTION IF EXISTS get_day_name CASCADE;
-- Then restore original calculate_activity_end_date from 20251209221309 migration
