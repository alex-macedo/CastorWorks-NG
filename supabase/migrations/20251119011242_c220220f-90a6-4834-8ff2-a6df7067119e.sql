-- Create estimates table
CREATE TABLE IF NOT EXISTS public.estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  
  -- AI generation metadata
  ai_generated BOOLEAN DEFAULT false,
  ai_confidence_score INTEGER,
  
  -- Project information
  project_type TEXT,
  location TEXT,
  square_footage INTEGER,
  quality_level TEXT,
  client_budget NUMERIC(12, 2),
  
  -- Generated data
  line_items JSONB DEFAULT '[]'::jsonb,
  estimated_duration_days INTEGER,
  assumptions JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  alternative_options JSONB,
  
  -- Relationships
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  user_id UUID,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_estimates_updated_at ON public.estimates;
CREATE TRIGGER update_estimates_updated_at
  BEFORE UPDATE ON public.estimates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view accessible estimates" ON public.estimates;
DROP POLICY IF EXISTS "Users can create their own estimates" ON public.estimates;
DROP POLICY IF EXISTS "Users can update their own estimates" ON public.estimates;
DROP POLICY IF EXISTS "Users can delete their own estimates" ON public.estimates;

-- RLS Policies: Users can view their own estimates or estimates for accessible clients
CREATE POLICY "Users can view accessible estimates"
  ON public.estimates
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'project_manager')
    OR (
      client_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM projects p
        JOIN project_team_members ptm ON ptm.project_id = p.id
        WHERE p.client_id = estimates.client_id
          AND ptm.user_id = auth.uid()
      )
    )
  );

-- RLS Policies: Users can create their own estimates
CREATE POLICY "Users can create their own estimates"
  ON public.estimates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies: Users can update their own estimates
CREATE POLICY "Users can update their own estimates"
  ON public.estimates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies: Users can delete their own estimates
CREATE POLICY "Users can delete their own estimates"
  ON public.estimates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_estimates_client_id ON public.estimates(client_id);
CREATE INDEX IF NOT EXISTS idx_estimates_user_id ON public.estimates(user_id);
CREATE INDEX IF NOT EXISTS idx_estimates_created_at ON public.estimates(created_at DESC);
