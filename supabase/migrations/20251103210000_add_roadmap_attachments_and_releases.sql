-- Add release_version field to roadmap_items
ALTER TABLE public.roadmap_items ADD COLUMN IF NOT EXISTS release_version TEXT;

-- Create roadmap_item_attachments table for screenshots and files
CREATE TABLE IF NOT EXISTS public.roadmap_item_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_item_id UUID NOT NULL REFERENCES public.roadmap_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image', 'document', etc.
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_roadmap_item_attachments_item ON public.roadmap_item_attachments(roadmap_item_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_item_attachments_user ON public.roadmap_item_attachments(user_id);

-- Create releases table for tracking release versions
CREATE TABLE IF NOT EXISTS public.roadmap_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  release_date DATE,
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roadmap_releases_version ON public.roadmap_releases(version);
CREATE INDEX IF NOT EXISTS idx_roadmap_releases_release_date ON public.roadmap_releases(release_date DESC);

-- Enable RLS on new tables
ALTER TABLE public.roadmap_item_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_releases ENABLE ROW LEVEL SECURITY;

-- RLS policies for roadmap_item_attachments
DROP POLICY IF EXISTS "authenticated_select_attachments" ON public.roadmap_item_attachments;
CREATE POLICY "authenticated_select_attachments"
ON public.roadmap_item_attachments FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON public.roadmap_item_attachments;
CREATE POLICY "Authenticated users can upload attachments"
ON public.roadmap_item_attachments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own attachments" ON public.roadmap_item_attachments;
CREATE POLICY "Users can delete their own attachments"
ON public.roadmap_item_attachments FOR DELETE
USING (user_id = auth.uid());

-- RLS policies for roadmap_releases
DROP POLICY IF EXISTS "authenticated_select_published_releases" ON public.roadmap_releases;
CREATE POLICY "authenticated_select_published_releases"
ON public.roadmap_releases FOR SELECT
TO authenticated
USING (
  (is_published = true OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )) AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Admins can manage releases" ON public.roadmap_releases;
CREATE POLICY "Admins can manage releases"
ON public.roadmap_releases FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

-- Add trigger for updated_at on releases
DROP TRIGGER IF EXISTS update_roadmap_releases_updated_at ON public.roadmap_releases;
CREATE TRIGGER update_roadmap_releases_updated_at
BEFORE UPDATE ON public.roadmap_releases
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
