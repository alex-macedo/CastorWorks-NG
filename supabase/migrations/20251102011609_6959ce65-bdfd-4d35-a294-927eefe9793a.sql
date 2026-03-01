-- Phase 1: Create ENUMs for project specifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'terrain_type_enum'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE terrain_type_enum AS ENUM ('PLANO', 'DECLIVE', 'ACLIVE');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'roof_type_enum'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE roof_type_enum AS ENUM ('COLONIAL', 'EMBUTIDO');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'floor_type_enum'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE floor_type_enum AS ENUM (
      'TÉRREO',
      '2 PAVIMENTOS',
      '3 PAVIMENTOS'
    );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'finishing_type_enum'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE finishing_type_enum AS ENUM ('Simple', 'Medium', 'High');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'paint_type_enum'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE paint_type_enum AS ENUM (
      'ACRÍLICA',
      'GRAFIATTO/TEXTURA'
    );
  END IF;
END;
$$;

-- Phase 2: Extend projects table with new columns
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS client_cpf TEXT,
  ADD COLUMN IF NOT EXISTS construction_address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS budget_date DATE,
  ADD COLUMN IF NOT EXISTS total_area NUMERIC,
  ADD COLUMN IF NOT EXISTS external_area_grass NUMERIC,
  ADD COLUMN IF NOT EXISTS external_area_paving NUMERIC,
  ADD COLUMN IF NOT EXISTS terrain_type terrain_type_enum,
  ADD COLUMN IF NOT EXISTS roof_type roof_type_enum,
  ADD COLUMN IF NOT EXISTS floor_type floor_type_enum,
  ADD COLUMN IF NOT EXISTS finishing_type finishing_type_enum,
  ADD COLUMN IF NOT EXISTS double_height_ceiling TEXT,
  ADD COLUMN IF NOT EXISTS paint_type paint_type_enum,
  ADD COLUMN IF NOT EXISTS bathrooms INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lavabos INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_spent NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labor_cost NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS material_cost NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxes_and_fees NUMERIC DEFAULT 0;

-- Phase 3: Create project_materials table
CREATE TABLE IF NOT EXISTS public.project_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id)
    ON DELETE CASCADE,
  sinapi_code TEXT,
  group_name TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  price_per_unit NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC GENERATED ALWAYS AS (quantity * price_per_unit) STORED,
  freight_percentage NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.project_materials
  ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_materials (project-scoped access)
DROP POLICY IF EXISTS "project_scoped_select_materials"
  ON public.project_materials;

CREATE POLICY "project_scoped_select_materials"
  ON public.project_materials
  FOR SELECT
  TO authenticated
  USING (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "project_scoped_insert_materials"
  ON public.project_materials;

CREATE POLICY "project_scoped_insert_materials"
  ON public.project_materials
  FOR INSERT
  TO authenticated
  WITH CHECK (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "project_scoped_update_materials"
  ON public.project_materials;

CREATE POLICY "project_scoped_update_materials"
  ON public.project_materials
  FOR UPDATE
  TO authenticated
  USING (has_project_access(auth.uid(), project_id))
  WITH CHECK (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "project_scoped_delete_materials"
  ON public.project_materials;

CREATE POLICY "project_scoped_delete_materials"
  ON public.project_materials
  FOR DELETE
  TO authenticated
  USING (has_project_access(auth.uid(), project_id));

-- Create sinapi_catalog table for SINAPI reference data
CREATE TABLE IF NOT EXISTS public.sinapi_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sinapi_code TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  unit TEXT NOT NULL,
  category TEXT,
  subcategory TEXT,
  reference_price NUMERIC,
  reference_date DATE,
  state TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sinapi_catalog
  ENABLE ROW LEVEL SECURITY;

-- RLS policies for sinapi_catalog
DROP POLICY IF EXISTS "authenticated_select_sinapi_catalog"
  ON public.sinapi_catalog;

CREATE POLICY "authenticated_select_sinapi_catalog"
  ON public.sinapi_catalog
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'service_role');

DROP POLICY IF EXISTS "authenticated_insert_sinapi_items"
  ON public.sinapi_catalog;

CREATE POLICY "authenticated_insert_sinapi_items"
  ON public.sinapi_catalog
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

DROP POLICY IF EXISTS "authenticated_update_sinapi_items"
  ON public.sinapi_catalog;

CREATE POLICY "authenticated_update_sinapi_items"
  ON public.sinapi_catalog
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

DROP POLICY IF EXISTS "authenticated_delete_sinapi_items"
  ON public.sinapi_catalog;

CREATE POLICY "authenticated_delete_sinapi_items"
  ON public.sinapi_catalog
  FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'service_role');

-- Phase 4: Create project_activities table for Gantt chart
CREATE TABLE IF NOT EXISTS public.project_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id)
    ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  completion_date DATE,
  completion_percentage INTEGER DEFAULT 0 CHECK (
    completion_percentage >= 0
    AND completion_percentage <= 100
  ),
  days_for_activity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, sequence)
);

ALTER TABLE public.project_activities
  ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_activities
DROP POLICY IF EXISTS "project_scoped_select_activities"
  ON public.project_activities;

CREATE POLICY "project_scoped_select_activities"
  ON public.project_activities
  FOR SELECT
  TO authenticated
  USING (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "project_scoped_insert_activities"
  ON public.project_activities;

CREATE POLICY "project_scoped_insert_activities"
  ON public.project_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "project_scoped_update_activities"
  ON public.project_activities;

CREATE POLICY "project_scoped_update_activities"
  ON public.project_activities
  FOR UPDATE
  TO authenticated
  USING (has_project_access(auth.uid(), project_id))
  WITH CHECK (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "project_scoped_delete_activities"
  ON public.project_activities;

CREATE POLICY "project_scoped_delete_activities"
  ON public.project_activities
  FOR DELETE
  TO authenticated
  USING (has_project_access(auth.uid(), project_id));

-- Phase 5: Extend project_financial_entries table
ALTER TABLE public.project_financial_entries
  ADD COLUMN IF NOT EXISTS quantity NUMERIC,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS price_per_unit NUMERIC,
  ADD COLUMN IF NOT EXISTS freight_percentage NUMERIC DEFAULT 0;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_materials_project_id
  ON public.project_materials(project_id);

CREATE INDEX IF NOT EXISTS idx_project_materials_sinapi_code
  ON public.project_materials(sinapi_code);

CREATE INDEX IF NOT EXISTS idx_sinapi_catalog_code
  ON public.sinapi_catalog(sinapi_code);

CREATE INDEX IF NOT EXISTS idx_sinapi_catalog_category
  ON public.sinapi_catalog(category);

CREATE INDEX IF NOT EXISTS idx_project_activities_project_id
  ON public.project_activities(project_id);

CREATE INDEX IF NOT EXISTS idx_project_activities_sequence
  ON public.project_activities(project_id, sequence);

-- Triggers for updated_at columns
DROP TRIGGER IF EXISTS update_project_materials_updated_at
  ON public.project_materials;

CREATE TRIGGER update_project_materials_updated_at
  BEFORE UPDATE ON public.project_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sinapi_catalog_updated_at
  ON public.sinapi_catalog;

CREATE TRIGGER update_sinapi_catalog_updated_at
  BEFORE UPDATE ON public.sinapi_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_activities_updated_at
  ON public.project_activities;

CREATE TRIGGER update_project_activities_updated_at
  BEFORE UPDATE ON public.project_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
