-- Recreate project_materials table with factor and tgfa_applicable columns
-- This table was accidentally dropped and needs to be fully recreated
-- Includes TGFA-based quantity calculations for template materials

BEGIN;

-- Drop table if exists (clean slate)
DROP TABLE IF EXISTS public.project_materials CASCADE;

-- Create project_materials table with all columns including new factor/tgfa_applicable
CREATE TABLE public.project_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,  -- No FK constraint to allow template UUID
  sinapi_code TEXT,
  group_name TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  price_per_unit NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC GENERATED ALWAYS AS (quantity * price_per_unit) STORED,
  freight_percentage NUMERIC DEFAULT 0,
  factor NUMERIC DEFAULT 0,
  tgfa_applicable BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_materials ENABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE public.project_materials IS 'Template materials use project_id = 00000000-0000-0000-0000-000000000000';
COMMENT ON COLUMN public.project_materials.factor IS 'Base factor for quantity calculation. When tgfa_applicable=true, this is replaced by project TGFA during duplication.';
COMMENT ON COLUMN public.project_materials.tgfa_applicable IS 'If true, factor is calculated from project total_gross_floor_area during duplication.';

-- Note: We intentionally do NOT create an FK constraint to allow template materials
-- Template materials use special UUID: 00000000-0000-0000-0000-000000000000
-- RLS policies will handle access control for regular project materials

-- Create RLS policy for SELECT - allow reading template materials and project-specific materials
DROP POLICY IF EXISTS "Users can view project materials" ON public.project_materials;

CREATE POLICY "Users can view project materials"
  ON public.project_materials FOR SELECT
  USING (
    project_id = '00000000-0000-0000-0000-000000000000'::uuid -- Template materials readable by all authenticated users
    OR has_project_access(auth.uid(), project_id)
  );

-- Create RLS policy for INSERT - allow inserting template materials and project-specific materials
DROP POLICY IF EXISTS "Users can insert project materials" ON public.project_materials;

CREATE POLICY "Users can insert project materials"
  ON public.project_materials FOR INSERT
  WITH CHECK (
    project_id = '00000000-0000-0000-0000-000000000000'::uuid -- Allow inserting template materials
    OR has_project_access(auth.uid(), project_id)
  );

-- Create RLS policy for UPDATE - allow updating project-specific materials only
DROP POLICY IF EXISTS "Users can update project materials" ON public.project_materials;

CREATE POLICY "Users can update project materials"
  ON public.project_materials FOR UPDATE
  USING (has_project_access(auth.uid(), project_id));

-- Create RLS policy for DELETE - allow deleting project-specific materials only
DROP POLICY IF EXISTS "Users can delete project materials" ON public.project_materials;

CREATE POLICY "Users can delete project materials"
  ON public.project_materials FOR DELETE
  USING (has_project_access(auth.uid(), project_id));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_project_materials_project_id ON public.project_materials(project_id);
CREATE INDEX IF NOT EXISTS idx_project_materials_group_name ON public.project_materials(group_name);

COMMIT;
