-- Migration: Update project_phases_type_check
-- Description: Removes 'financial' from the allowed types for project phases

BEGIN;

-- Drop existing constraint
ALTER TABLE public.project_phases DROP CONSTRAINT IF EXISTS project_phases_type_check;

-- Add updated constraint
ALTER TABLE public.project_phases ADD CONSTRAINT project_phases_type_check CHECK (type IN ('schedule', 'budget'));

COMMIT;
