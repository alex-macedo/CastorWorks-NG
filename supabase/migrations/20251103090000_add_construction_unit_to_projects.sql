-- Add construction_unit column to projects table
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS construction_unit text NOT NULL DEFAULT 'square meter';

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_construction_unit_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_construction_unit_check
  CHECK (construction_unit IN ('square meter', 'square feet'));
