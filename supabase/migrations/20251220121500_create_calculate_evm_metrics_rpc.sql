-- Migration: Create calculate_evm_metrics RPC for earned value management
-- Date: 2025-12-20 12:15:00 UTC
-- Description: Creates RPC function to calculate EVM metrics (PV, EV, AC, SPI, CPI, etc.)

BEGIN;

-- Function to calculate Earned Value Management metrics for a project
-- Returns comprehensive EVM metrics as of a specific date
CREATE OR REPLACE FUNCTION calculate_evm_metrics(
  p_project_id UUID,
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  -- Basic EVM metrics
  planned_value NUMERIC(15,2),      -- PV: Budgeted cost of work planned
  earned_value NUMERIC(15,2),       -- EV: Budgeted cost of work performed
  actual_cost NUMERIC(15,2),        -- AC: Actual cost of work performed

  -- Efficiency indicators
  schedule_performance_index NUMERIC(5,3),  -- SPI: EV/PV (schedule efficiency)
  cost_performance_index NUMERIC(5,3),      -- CPI: EV/AC (cost efficiency)

  -- Variance metrics
  schedule_variance NUMERIC(15,2),  -- SV: EV - PV (schedule variance)
  cost_variance NUMERIC(15,2),      -- CV: EV - AC (cost variance)

  -- Forecasting
  estimate_at_completion NUMERIC(15,2),     -- EAC: AC + (BAC - EV)/CPI (or AC + ETC)
  estimate_to_complete NUMERIC(15,2),       -- ETC: EAC - AC
  variance_at_completion NUMERIC(15,2),     -- VAC: BAC - EAC

  -- Baseline totals
  budget_at_completion NUMERIC(15,2),       -- BAC: Total baseline budget
  planned_duration_days INTEGER,            -- Total planned duration
  actual_duration_days INTEGER,             -- Actual duration to date

  -- Progress percentages
  planned_progress_percent NUMERIC(5,2),    -- Planned progress %
  actual_progress_percent NUMERIC(5,2),     -- Actual progress %
  earned_progress_percent NUMERIC(5,2)      -- Earned progress % (EV/BAC * 100)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pv NUMERIC(15,2) := 0;
  v_ev NUMERIC(15,2) := 0;
  v_ac NUMERIC(15,2) := 0;
  v_bac NUMERIC(15,2) := 0;
  v_planned_progress NUMERIC(5,2) := 0;
  v_actual_progress NUMERIC(5,2) := 0;
  v_project_start DATE;
  v_project_end DATE;
BEGIN
  -- Get project baseline dates and budget
  SELECT
    p.start_date,
    p.end_date,
    COALESCE(p.budget_total, 0)
  INTO v_project_start, v_project_end, v_bac
  FROM projects p
  WHERE p.id = p_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found: %', p_project_id;
  END IF;

  -- Calculate Planned Value (PV) - Budgeted cost of work scheduled
  -- Sum planned costs of activities that should be completed by as_of_date
  SELECT COALESCE(SUM(
    CASE
      WHEN pa.end_date <= p_as_of_date THEN pa.planned_cost
      WHEN pa.start_date <= p_as_of_date AND pa.end_date > p_as_of_date THEN
        -- Prorate cost based on time elapsed in activity
        pa.planned_cost * (
          EXTRACT(EPOCH FROM (p_as_of_date - pa.start_date)) /
          EXTRACT(EPOCH FROM (pa.end_date - pa.start_date))
        )
      ELSE 0
    END
  ), 0)
  INTO v_pv
  FROM project_activities pa
  WHERE pa.project_id = p_project_id
    AND pa.planned_cost > 0;

  -- Calculate Earned Value (EV) - Budgeted cost of work performed
  -- Weight activities by their planned_cost, not just duration
  SELECT COALESCE(SUM(
    pa.planned_cost * (pa.completion_percentage / 100.0)
  ), 0)
  INTO v_ev
  FROM project_activities pa
  WHERE pa.project_id = p_project_id
    AND pa.planned_cost > 0;

  -- Calculate Actual Cost (AC) - Actual cost incurred
  -- Sum financial entries up to as_of_date
  SELECT COALESCE(SUM(pfe.amount), 0)
  INTO v_ac
  FROM project_financial_entries pfe
  WHERE pfe.project_id = p_project_id
    AND pfe.date <= p_as_of_date;

  -- Calculate progress percentages
  IF v_bac > 0 THEN
    v_planned_progress := (v_pv / v_bac) * 100;
    v_actual_progress := (v_ev / v_bac) * 100;
  END IF;

  -- Return comprehensive EVM metrics
  RETURN QUERY SELECT
    v_pv,  -- planned_value
    v_ev,  -- earned_value
    v_ac,  -- actual_cost

    CASE WHEN v_pv > 0 THEN v_ev / v_pv ELSE NULL END,  -- schedule_performance_index
    CASE WHEN v_ac > 0 THEN v_ev / v_ac ELSE NULL END,  -- cost_performance_index

    (v_ev - v_pv),  -- schedule_variance
    (v_ev - v_ac),  -- cost_variance

    CASE
      WHEN v_ev > 0 AND v_ac > 0 THEN
        v_ac + ((v_bac - v_ev) / (v_ev / v_ac))
      ELSE v_bac
    END,  -- estimate_at_completion

    CASE
      WHEN v_ev > 0 AND v_ac > 0 THEN
        (v_ac + ((v_bac - v_ev) / (v_ev / v_ac))) - v_ac
      ELSE v_bac - v_ac
    END,  -- estimate_to_complete

    v_bac - CASE
      WHEN v_ev > 0 AND v_ac > 0 THEN
        v_ac + ((v_bac - v_ev) / (v_ev / v_ac))
      ELSE v_bac
    END,  -- variance_at_completion

    v_bac,  -- budget_at_completion

    CASE
      WHEN v_project_start IS NOT NULL AND v_project_end IS NOT NULL THEN
        v_project_end - v_project_start
      ELSE NULL
    END,  -- planned_duration_days

    CASE
      WHEN v_project_start IS NOT NULL THEN
        p_as_of_date - v_project_start
      ELSE NULL
    END,  -- actual_duration_days

    v_planned_progress,  -- planned_progress_percent
    v_actual_progress,   -- actual_progress_percent
    CASE WHEN v_bac > 0 THEN (v_ev / v_bac) * 100 ELSE 0 END;  -- earned_progress_percent

END;
$$;

-- Add comment
COMMENT ON FUNCTION calculate_evm_metrics(UUID, DATE) IS
'Calculates comprehensive EVM metrics for a project as of a specific date. Returns PV, EV, AC, SPI, CPI, and forecasting metrics.';

COMMIT;