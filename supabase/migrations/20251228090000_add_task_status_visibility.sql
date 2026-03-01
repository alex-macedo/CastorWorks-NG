-- ============================================================================
-- Add visibility toggle for task status columns
-- Created: 2025-12-28
-- ============================================================================

ALTER TABLE project_task_statuses
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;
