-- Phase 1 Remediation: Add project_id to notifications for mobile app filtering
-- Created: 2026-02-02
-- Purpose: Notifications table already exists (20241201000000).
--          Add project_id column so mobile app can filter by project.

BEGIN;

-- Add project_id column if not already present
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_project_id ON public.notifications(project_id);

-- Backfill project_id from data->>'projectId' where available
UPDATE public.notifications
SET project_id = (data->>'projectId')::UUID
WHERE project_id IS NULL
  AND data->>'projectId' IS NOT NULL
  AND (data->>'projectId')::UUID IN (SELECT id FROM public.projects);

COMMIT;
