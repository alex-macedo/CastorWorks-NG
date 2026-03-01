-- Migration: Create calculate_pv_distribution RPC for planned value distribution
-- Date: 2025-12-20 12:10:00 UTC
-- Description: Creates RPC function to distribute activity costs over time periods for PV curves

BEGIN;

-- Function to calculate Planned Value (PV) distribution across activity duration
-- This spreads the activity's planned_cost evenly across its working days
-- Returns a table with date and daily_planned_value for each working day
CREATE OR REPLACE FUNCTION calculate_pv_distribution(
  p_activity_id UUID,
  p_period_type TEXT DEFAULT 'daily' -- 'daily', 'weekly', 'monthly'
)
RETURNS TABLE (
  period_date DATE,
  planned_value NUMERIC(15,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_activity RECORD;
  v_start_date DATE;
  v_end_date DATE;
  v_total_cost NUMERIC(15,2);
  v_working_days INTEGER;
  v_daily_cost NUMERIC(15,2);
  v_project_id UUID;
  v_current_date DATE;
  v_period_start DATE;
  v_period_end DATE;
  v_period_cost NUMERIC(15,2);
BEGIN
  -- Get activity details
  SELECT
    pa.start_date,
    pa.end_date,
    pa.planned_cost,
    pa.project_id
  INTO v_activity
  FROM project_activities pa
  WHERE pa.id = p_activity_id;

  -- Validate activity exists and has cost
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Activity not found: %', p_activity_id;
  END IF;

  IF v_activity.planned_cost IS NULL OR v_activity.planned_cost = 0 THEN
    RETURN; -- No cost to distribute
  END IF;

  v_start_date := v_activity.start_date;
  v_end_date := v_activity.end_date;
  v_total_cost := v_activity.planned_cost;
  v_project_id := v_activity.project_id;

  -- Calculate working days for the activity
  SELECT COUNT(*)
  INTO v_working_days
  FROM generate_series(v_start_date, v_end_date, INTERVAL '1 day') AS d(date)
  WHERE is_day_working(v_project_id, d.date);

  IF v_working_days = 0 THEN
    RETURN; -- No working days
  END IF;

  -- Calculate daily cost
  v_daily_cost := v_total_cost / v_working_days;

  -- Generate distribution based on period type
  CASE p_period_type
    WHEN 'daily' THEN
      -- Return daily distribution
      FOR v_current_date IN
        SELECT d.date::DATE
        FROM generate_series(v_start_date, v_end_date, INTERVAL '1 day') AS d(date)
        WHERE is_day_working(v_project_id, d.date::DATE)
        ORDER BY d.date
      LOOP
        RETURN QUERY SELECT v_current_date, v_daily_cost;
      END LOOP;

    WHEN 'weekly' THEN
      -- Group by weeks (Monday to Sunday)
      FOR v_period_start, v_period_end, v_period_cost IN
        SELECT
          DATE_TRUNC('week', d.date)::DATE as week_start,
          (DATE_TRUNC('week', d.date) + INTERVAL '6 days')::DATE as week_end,
          COUNT(*) * v_daily_cost as weekly_cost
        FROM generate_series(v_start_date, v_end_date, INTERVAL '1 day') AS d(date)
        WHERE is_day_working(v_project_id, d.date::DATE)
        GROUP BY DATE_TRUNC('week', d.date)
        ORDER BY DATE_TRUNC('week', d.date)
      LOOP
        RETURN QUERY SELECT v_period_start, v_period_cost;
      END LOOP;

    WHEN 'monthly' THEN
      -- Group by months
      FOR v_period_start, v_period_end, v_period_cost IN
        SELECT
          DATE_TRUNC('month', d.date)::DATE as month_start,
          (DATE_TRUNC('month', d.date) + INTERVAL '1 month - 1 day')::DATE as month_end,
          COUNT(*) * v_daily_cost as monthly_cost
        FROM generate_series(v_start_date, v_end_date, INTERVAL '1 day') AS d(date)
        WHERE is_day_working(v_project_id, d.date::DATE)
        GROUP BY DATE_TRUNC('month', d.date)
        ORDER BY DATE_TRUNC('month', d.date)
      LOOP
        RETURN QUERY SELECT v_period_start, v_period_cost;
      END LOOP;

    ELSE
      RAISE EXCEPTION 'Invalid period_type: %. Must be daily, weekly, or monthly', p_period_type;
  END CASE;

END;
$$;

-- Add comment
COMMENT ON FUNCTION calculate_pv_distribution(UUID, TEXT) IS
'Distributes activity planned cost across working days. period_type: daily, weekly, monthly';

COMMIT;