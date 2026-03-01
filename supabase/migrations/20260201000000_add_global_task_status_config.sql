-- Migration: Add global Task Status category to dropdown_options
-- Date: 2026-02-01
-- Description: Creates the task_status category with default statuses that all projects will inherit

BEGIN;

-- Add task_status category to dropdown_options with current default values
-- These will be copied to each new project upon creation
INSERT INTO dropdown_options (category, value, label, sort_order, is_default, color, icon, is_active) VALUES
('task_status', 'not_started', 'Not Started', 1, true, '#9CA3AF', 'circle-outline', true),
('task_status', 'in_progress', 'In Progress', 2, false, '#3B82F6', 'clock-outline', true),
('task_status', 'completed', 'Completed', 3, false, '#10B981', 'checkmark-circle-outline', true),
('task_status', 'blocked', 'Blocked', 4, false, '#EF4444', 'alert-circle-outline', true)
ON CONFLICT (category, value) DO NOTHING;

COMMIT;
