-- Migration: Create project_calendar table and add calendar fields to projects
-- Purpose: Enable project-specific working day calendars with holiday/non-working date tracking
-- Created: 2025-12-18
-- Phase: 1 - Database Schema & Migrations

-- ============================================
-- 1. Add calendar columns to projects table
-- ============================================

-- Add calendar_enabled flag (defaults to false for backward compatibility)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS calendar_enabled BOOLEAN DEFAULT false;

-- Add default working days pattern (comma-separated: monday,tuesday,wednesday,thursday,friday)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS calendar_default_working_days TEXT DEFAULT 'monday,tuesday,wednesday,thursday,friday';

-- Add comments for documentation
COMMENT ON COLUMN projects.calendar_enabled IS 'When true, project uses working day calculations instead of calendar days';
COMMENT ON COLUMN projects.calendar_default_working_days IS 'Comma-separated list of default working days (e.g., monday,tuesday,wednesday,thursday,friday)';

-- ============================================
-- 2. Create project_calendar table
-- ============================================

CREATE TABLE IF NOT EXISTS project_calendar (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key to project
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Calendar date being configured
  calendar_date DATE NOT NULL,

  -- Whether this date is a working day
  is_working_day BOOLEAN NOT NULL DEFAULT true,

  -- Reason for non-working day (e.g., "National Holiday", "Company Shutdown", "Special Work Day")
  reason TEXT,

  -- Audit timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint: one entry per project per date
  CONSTRAINT unique_project_calendar_date UNIQUE(project_id, calendar_date)
);

-- Add table comment
COMMENT ON TABLE project_calendar IS 'Stores project-specific calendar overrides for working/non-working days';

-- ============================================
-- 3. Create indexes for performance
-- ============================================

-- Index on project_id for filtering by project
CREATE INDEX IF NOT EXISTS idx_project_calendar_project_id
ON project_calendar(project_id);

-- Index on calendar_date for date range queries
CREATE INDEX IF NOT EXISTS idx_project_calendar_date
ON project_calendar(calendar_date);

-- Composite index for common query pattern (project + date + is_working_day)
CREATE INDEX IF NOT EXISTS idx_project_calendar_project_date_working
ON project_calendar(project_id, calendar_date, is_working_day);

-- Index for finding non-working days
CREATE INDEX IF NOT EXISTS idx_project_calendar_non_working
ON project_calendar(project_id, is_working_day)
WHERE is_working_day = false;

-- ============================================
-- 4. Enable Row Level Security (RLS)
-- ============================================

ALTER TABLE project_calendar ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. Create RLS Policies
-- ============================================

-- Policy: Users with project access can view calendar
CREATE POLICY "Users can view project calendar if they have project access"
  ON project_calendar
  FOR SELECT
  USING (
    has_project_access(auth.uid(), project_id)
  );

-- Policy: Project managers/admins can insert calendar entries
CREATE POLICY "Project managers can insert calendar entries"
  ON project_calendar
  FOR INSERT
  WITH CHECK (
    has_project_access(auth.uid(), project_id)
    AND (
      has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM project_team_members ptm
        WHERE ptm.project_id = project_calendar.project_id
          AND ptm.user_id = auth.uid()
          AND ptm.role IN ('admin', 'manager')
      )
    )
  );

-- Policy: Project managers/admins can update calendar entries
CREATE POLICY "Project managers can update calendar entries"
  ON project_calendar
  FOR UPDATE
  USING (
    has_project_access(auth.uid(), project_id)
    AND (
      has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM project_team_members ptm
        WHERE ptm.project_id = project_calendar.project_id
          AND ptm.user_id = auth.uid()
          AND ptm.role IN ('admin', 'manager')
      )
    )
  )
  WITH CHECK (
    has_project_access(auth.uid(), project_id)
    AND (
      has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM project_team_members ptm
        WHERE ptm.project_id = project_calendar.project_id
          AND ptm.user_id = auth.uid()
          AND ptm.role IN ('admin', 'manager')
      )
    )
  );

-- Policy: Project managers/admins can delete calendar entries
CREATE POLICY "Project managers can delete calendar entries"
  ON project_calendar
  FOR DELETE
  USING (
    has_project_access(auth.uid(), project_id)
    AND (
      has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM project_team_members ptm
        WHERE ptm.project_id = project_calendar.project_id
          AND ptm.user_id = auth.uid()
          AND ptm.role IN ('admin', 'manager')
      )
    )
  );

-- ============================================
-- 6. Add updated_at trigger
-- ============================================

-- Use existing update_updated_at_column function (should already exist)
DROP TRIGGER IF EXISTS update_project_calendar_updated_at ON project_calendar;
CREATE TRIGGER update_project_calendar_updated_at
  BEFORE UPDATE ON project_calendar
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. Create helper function to check RLS policies
-- ============================================

-- Verification function: Check if user can modify project calendar
CREATE OR REPLACE FUNCTION can_modify_project_calendar(
  p_user_id UUID,
  p_project_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user has project access
  IF NOT has_project_access(p_user_id, p_project_id) THEN
    RETURN false;
  END IF;

  -- Check if user is admin or project manager
  RETURN (
    has_role(p_user_id, 'admin')
    OR EXISTS (
      SELECT 1 FROM project_team_members ptm
      WHERE ptm.project_id = p_project_id
        AND ptm.user_id = p_user_id
        AND ptm.role IN ('admin', 'manager')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function comment
COMMENT ON FUNCTION can_modify_project_calendar IS 'Check if user has permission to modify project calendar (admin or project manager)';

-- ============================================
-- 8. Grant permissions
-- ============================================

-- Grant usage on the table to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON project_calendar TO authenticated;

-- ============================================
-- Migration complete
-- ============================================

-- Rollback instructions (if needed):
-- DROP TABLE IF EXISTS project_calendar CASCADE;
-- ALTER TABLE projects DROP COLUMN IF EXISTS calendar_enabled;
-- ALTER TABLE projects DROP COLUMN IF EXISTS calendar_default_working_days;
-- DROP FUNCTION IF EXISTS can_modify_project_calendar;
