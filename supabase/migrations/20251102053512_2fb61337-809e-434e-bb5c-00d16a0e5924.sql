-- Create project_photos table for enhanced photo gallery
CREATE TABLE IF NOT EXISTS project_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('before', 'during', 'after', 'issues', 'completion', 'other')),
  caption TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE project_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies (project-scoped access)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_photos' AND policyname = 'project_scoped_select_project_photos'
  ) THEN
    CREATE POLICY "project_scoped_select_project_photos"
      ON project_photos FOR SELECT
      TO authenticated
      USING (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_photos' AND policyname = 'project_scoped_insert_project_photos'
  ) THEN
    CREATE POLICY "project_scoped_insert_project_photos"
      ON project_photos FOR INSERT
      TO authenticated
      WITH CHECK (has_project_access(auth.uid(), project_id) AND auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_photos' AND policyname = 'Users can update their own photos'
  ) THEN
    CREATE POLICY "Users can update their own photos"
      ON project_photos FOR UPDATE
      TO authenticated
      USING (uploaded_by = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_photos' AND policyname = 'Users can delete their own photos'
  ) THEN
    CREATE POLICY "Users can delete their own photos"
      ON project_photos FOR DELETE
      TO authenticated
      USING (uploaded_by = auth.uid());
  END IF;
END $$;

-- Create trigger for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_project_photos_updated_at' AND tgrelid = 'public.project_photos'::regclass
  ) THEN
    CREATE TRIGGER update_project_photos_updated_at
      BEFORE UPDATE ON project_photos
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Add benchmark fields to app_settings for analytics
ALTER TABLE app_settings 
  ADD COLUMN IF NOT EXISTS benchmark_profit_margin NUMERIC DEFAULT 15.0,
  ADD COLUMN IF NOT EXISTS benchmark_overhead_percentage NUMERIC DEFAULT 10.0,
  ADD COLUMN IF NOT EXISTS benchmark_labor_cost_percentage NUMERIC DEFAULT 40.0;
