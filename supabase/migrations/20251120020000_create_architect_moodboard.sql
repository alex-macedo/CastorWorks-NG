-- ============================================================================
-- CastorWorks Architect Moodboard Feature
-- Created: 2025-11-20
-- Description: Moodboard functionality for architect module
-- ============================================================================

-- ============================================================================
-- 1. MOODBOARD SECTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS architect_moodboard_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES user_profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_architect_moodboard_sections_project_id ON architect_moodboard_sections(project_id);
CREATE INDEX IF NOT EXISTS idx_architect_moodboard_sections_sort_order ON architect_moodboard_sections(project_id, sort_order);

-- ============================================================================
-- 2. MOODBOARD IMAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS architect_moodboard_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES architect_moodboard_sections(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  storage_path TEXT,  -- Path in Supabase storage
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES user_profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_architect_moodboard_images_section_id ON architect_moodboard_images(section_id);
CREATE INDEX IF NOT EXISTS idx_architect_moodboard_images_project_id ON architect_moodboard_images(project_id);
CREATE INDEX IF NOT EXISTS idx_architect_moodboard_images_sort_order ON architect_moodboard_images(section_id, sort_order);

-- ============================================================================
-- 3. MOODBOARD COLOR PALETTE
-- ============================================================================

CREATE TABLE IF NOT EXISTS architect_moodboard_colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  color_code TEXT NOT NULL,  -- Hex color code (e.g., #BC9673)
  color_name TEXT,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES user_profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_architect_moodboard_colors_project_id ON architect_moodboard_colors(project_id);
CREATE INDEX IF NOT EXISTS idx_architect_moodboard_colors_sort_order ON architect_moodboard_colors(project_id, sort_order);

-- ============================================================================
-- 4. STORAGE BUCKET FOR MOODBOARD IMAGES
-- ============================================================================

-- Create storage bucket for moodboard images (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('architect-moodboards', 'architect-moodboards', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE architect_moodboard_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE architect_moodboard_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE architect_moodboard_colors ENABLE ROW LEVEL SECURITY;

-- Sections policies
DROP POLICY IF EXISTS "Users can view moodboard sections for their projects" ON public.architect_moodboard_sections;
CREATE POLICY "Users can view moodboard sections for their projects"
  ON architect_moodboard_sections FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can insert moodboard sections for their projects" ON public.architect_moodboard_sections;
CREATE POLICY "Users can insert moodboard sections for their projects"
  ON architect_moodboard_sections FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can update their moodboard sections" ON public.architect_moodboard_sections;
CREATE POLICY "Users can update their moodboard sections"
  ON architect_moodboard_sections FOR UPDATE
  USING (has_project_access(auth.uid(), project_id))
  WITH CHECK (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can delete their moodboard sections" ON public.architect_moodboard_sections;
CREATE POLICY "Users can delete their moodboard sections"
  ON architect_moodboard_sections FOR DELETE
  USING (has_project_access(auth.uid(), project_id));

-- Images policies
DROP POLICY IF EXISTS "Users can view moodboard images for their projects" ON public.architect_moodboard_images;
CREATE POLICY "Users can view moodboard images for their projects"
  ON architect_moodboard_images FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can insert moodboard images for their projects" ON public.architect_moodboard_images;
CREATE POLICY "Users can insert moodboard images for their projects"
  ON architect_moodboard_images FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can update their moodboard images" ON public.architect_moodboard_images;
CREATE POLICY "Users can update their moodboard images"
  ON architect_moodboard_images FOR UPDATE
  USING (has_project_access(auth.uid(), project_id))
  WITH CHECK (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can delete their moodboard images" ON public.architect_moodboard_images;
CREATE POLICY "Users can delete their moodboard images"
  ON architect_moodboard_images FOR DELETE
  USING (has_project_access(auth.uid(), project_id));

-- Colors policies
DROP POLICY IF EXISTS "Users can view moodboard colors for their projects" ON public.architect_moodboard_colors;
CREATE POLICY "Users can view moodboard colors for their projects"
  ON architect_moodboard_colors FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can insert moodboard colors for their projects" ON public.architect_moodboard_colors;
CREATE POLICY "Users can insert moodboard colors for their projects"
  ON architect_moodboard_colors FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can update their moodboard colors" ON public.architect_moodboard_colors;
CREATE POLICY "Users can update their moodboard colors"
  ON architect_moodboard_colors FOR UPDATE
  USING (has_project_access(auth.uid(), project_id))
  WITH CHECK (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can delete their moodboard colors" ON public.architect_moodboard_colors;
CREATE POLICY "Users can delete their moodboard colors"
  ON architect_moodboard_colors FOR DELETE
  USING (has_project_access(auth.uid(), project_id));

-- ============================================================================
-- 6. STORAGE POLICIES
-- ============================================================================

-- Allow authenticated users to upload moodboard images
DROP POLICY IF EXISTS "Authenticated users can upload moodboard images" ON storage.objects;
CREATE POLICY "Authenticated users can upload moodboard images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'architect-moodboards' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to update their moodboard images
DROP POLICY IF EXISTS "Authenticated users can update moodboard images" ON storage.objects;
CREATE POLICY "Authenticated users can update moodboard images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'architect-moodboards' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete their moodboard images
DROP POLICY IF EXISTS "Authenticated users can delete moodboard images" ON storage.objects;
CREATE POLICY "Authenticated users can delete moodboard images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'architect-moodboards' AND
    auth.role() = 'authenticated'
  );

-- Allow public read access to moodboard images
DROP POLICY IF EXISTS "Public can view moodboard images" ON storage.objects;
CREATE POLICY "Public can view moodboard images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'architect-moodboards');

-- ============================================================================
-- 7. TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_architect_moodboard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS architect_moodboard_sections_updated_at ON architect_moodboard_sections;
CREATE TRIGGER architect_moodboard_sections_updated_at
  BEFORE UPDATE ON architect_moodboard_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_architect_moodboard_updated_at();

DROP TRIGGER IF EXISTS architect_moodboard_images_updated_at ON architect_moodboard_images;
CREATE TRIGGER architect_moodboard_images_updated_at
  BEFORE UPDATE ON architect_moodboard_images
  FOR EACH ROW
  EXECUTE FUNCTION update_architect_moodboard_updated_at();

DROP TRIGGER IF EXISTS architect_moodboard_colors_updated_at ON architect_moodboard_colors;
CREATE TRIGGER architect_moodboard_colors_updated_at
  BEFORE UPDATE ON architect_moodboard_colors
  FOR EACH ROW
  EXECUTE FUNCTION update_architect_moodboard_updated_at();

-- ============================================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE architect_moodboard_sections IS 'Moodboard sections/boards for organizing design inspiration by room or theme';
COMMENT ON TABLE architect_moodboard_images IS 'Images uploaded to moodboard sections for design inspiration';
COMMENT ON TABLE architect_moodboard_colors IS 'Color palette for projects, stored as hex codes';

COMMENT ON COLUMN architect_moodboard_sections.name IS 'Section name (e.g., "SALA DE ESTAR", "QUARTO PRINCIPAL")';
COMMENT ON COLUMN architect_moodboard_sections.sort_order IS 'Order in which sections appear';
COMMENT ON COLUMN architect_moodboard_images.image_url IS 'Public URL to access the image';
COMMENT ON COLUMN architect_moodboard_images.storage_path IS 'Internal storage path in Supabase storage';
COMMENT ON COLUMN architect_moodboard_colors.color_code IS 'Hex color code (e.g., #BC9673, #01D0CA)';
