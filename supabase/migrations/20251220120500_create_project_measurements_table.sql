-- Migration: Create project_measurements table for periodic progress tracking
-- Date: 2025-12-20 12:05:00 UTC
-- Description: Creates project_measurements table to track physical and financial progress over time periods

BEGIN;

-- Create project_measurements table for tracking periodic measurements (medicoes)
-- This enables the physical-financial schedule (cronograma fisico-financeiro)
CREATE TABLE project_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES project_phases(id) ON DELETE SET NULL,
  activity_id UUID REFERENCES project_activities(id) ON DELETE SET NULL,

  -- Measurement period identification
  measurement_number INTEGER NOT NULL, -- Sequential number (1, 2, 3...)
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Physical progress (percentage-based)
  planned_physical_percent NUMERIC(5,2) DEFAULT 0.00,      -- Planned progress for this period (%)
  actual_physical_percent NUMERIC(5,2) DEFAULT 0.00,       -- Actual progress for this period (%)
  cumulative_planned_physical NUMERIC(5,2) DEFAULT 0.00,   -- Cumulative planned progress (%)
  cumulative_actual_physical NUMERIC(5,2) DEFAULT 0.00,    -- Cumulative actual progress (%)

  -- Financial progress (currency-based)
  planned_financial_amount NUMERIC(15,2) DEFAULT 0.00,     -- Planned disbursement for this period
  actual_financial_amount NUMERIC(15,2) DEFAULT 0.00,      -- Actual disbursement for this period
  cumulative_planned_financial NUMERIC(15,2) DEFAULT 0.00, -- Cumulative planned disbursement
  cumulative_actual_financial NUMERIC(15,2) DEFAULT 0.00,  -- Cumulative actual disbursement

  -- Approval workflow for measurements
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),

  -- Documentation and attachments
  notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb, -- Array of file references

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  UNIQUE(project_id, measurement_number), -- Only one measurement per period per project
  CHECK (period_start <= period_end),
  CHECK (planned_physical_percent >= 0 AND planned_physical_percent <= 100),
  CHECK (actual_physical_percent >= 0 AND actual_physical_percent <= 100),
  CHECK (cumulative_planned_physical >= 0 AND cumulative_planned_physical <= 100),
  CHECK (cumulative_actual_physical >= 0 AND cumulative_actual_physical <= 100),
  CHECK (planned_financial_amount >= 0),
  CHECK (actual_financial_amount >= 0),
  CHECK (cumulative_planned_financial >= 0),
  CHECK (cumulative_actual_financial >= 0)
);

-- Add comments for documentation
COMMENT ON TABLE project_measurements IS 'Periodic measurements for physical-financial schedule tracking';
COMMENT ON COLUMN project_measurements.measurement_number IS 'Sequential measurement number (1, 2, 3...)';
COMMENT ON COLUMN project_measurements.planned_physical_percent IS 'Planned physical progress percentage for this measurement period';
COMMENT ON COLUMN project_measurements.actual_physical_percent IS 'Actual physical progress percentage for this measurement period';
COMMENT ON COLUMN project_measurements.cumulative_planned_physical IS 'Cumulative planned physical progress percentage up to this measurement';
COMMENT ON COLUMN project_measurements.cumulative_actual_physical IS 'Cumulative actual physical progress percentage up to this measurement';
COMMENT ON COLUMN project_measurements.planned_financial_amount IS 'Planned financial disbursement amount for this measurement period';
COMMENT ON COLUMN project_measurements.actual_financial_amount IS 'Actual financial disbursement amount for this measurement period';
COMMENT ON COLUMN project_measurements.cumulative_planned_financial IS 'Cumulative planned financial disbursement up to this measurement';
COMMENT ON COLUMN project_measurements.cumulative_actual_financial IS 'Cumulative actual financial disbursement up to this measurement';

-- Create indexes for performance
CREATE INDEX idx_project_measurements_project_id ON project_measurements(project_id);
CREATE INDEX idx_project_measurements_phase_id ON project_measurements(phase_id);
CREATE INDEX idx_project_measurements_activity_id ON project_measurements(activity_id);
CREATE INDEX idx_project_measurements_period_start ON project_measurements(period_start);
CREATE INDEX idx_project_measurements_period_end ON project_measurements(period_end);
CREATE INDEX idx_project_measurements_status ON project_measurements(status);
CREATE INDEX idx_project_measurements_measurement_number ON project_measurements(measurement_number);

-- Enable Row Level Security
ALTER TABLE project_measurements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view measurements for accessible projects"
  ON project_measurements FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can insert measurements for accessible projects"
  ON project_measurements FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can update measurements for accessible projects"
  ON project_measurements FOR UPDATE
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Only admins can delete measurements"
  ON project_measurements FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_measurements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_measurements_updated_at
  BEFORE UPDATE ON project_measurements
  FOR EACH ROW
  EXECUTE FUNCTION update_project_measurements_updated_at();

COMMIT;