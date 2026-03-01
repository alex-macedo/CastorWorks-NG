-- Create table for AI feature suggestions
CREATE TABLE IF NOT EXISTS public.roadmap_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('feature', 'bug_fix', 'integration', 'refinement')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  estimated_effort TEXT NOT NULL DEFAULT 'medium' CHECK (estimated_effort IN ('small', 'medium', 'large', 'xlarge')),
  suggested_by TEXT DEFAULT 'AI Assistant',
  is_imported BOOLEAN DEFAULT false,
  imported_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.roadmap_suggestions ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view suggestions
DROP POLICY IF EXISTS "admin_select_roadmap_suggestions" ON public.roadmap_suggestions;
CREATE POLICY "admin_select_roadmap_suggestions"
  ON public.roadmap_suggestions
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Policy: Authenticated users can create suggestions
DROP POLICY IF EXISTS "Authenticated users can create suggestions" ON public.roadmap_suggestions;
CREATE POLICY "Authenticated users can create suggestions"
  ON public.roadmap_suggestions
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Policy: Authenticated users can update suggestions
DROP POLICY IF EXISTS "Authenticated users can update suggestions" ON public.roadmap_suggestions;
CREATE POLICY "Authenticated users can update suggestions"
  ON public.roadmap_suggestions
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Policy: Authenticated users can delete suggestions
DROP POLICY IF EXISTS "Authenticated users can delete suggestions" ON public.roadmap_suggestions;
CREATE POLICY "Authenticated users can delete suggestions"
  ON public.roadmap_suggestions
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create index for quick filtering
CREATE INDEX IF NOT EXISTS idx_roadmap_suggestions_imported ON public.roadmap_suggestions(is_imported);
CREATE INDEX IF NOT EXISTS idx_roadmap_suggestions_created_at ON public.roadmap_suggestions(created_at DESC);
