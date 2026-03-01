-- Create view_templates table for storing user-defined view preferences
CREATE TABLE IF NOT EXISTS public.view_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  view_type TEXT NOT NULL DEFAULT 'project_plan',
  filters JSONB DEFAULT '{}'::jsonb,
  sort_config JSONB DEFAULT '{}'::jsonb,
  visible_columns JSONB DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.view_templates ENABLE ROW LEVEL SECURITY;

-- Policies and trigger for view_templates
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'view_templates'
  ) THEN
    DROP POLICY IF EXISTS "Users can view their own view templates" ON public.view_templates;
    DROP POLICY IF EXISTS "Users can create their own view templates" ON public.view_templates;
    DROP POLICY IF EXISTS "Users can update their own view templates" ON public.view_templates;
    DROP POLICY IF EXISTS "Users can delete their own view templates" ON public.view_templates;

    CREATE POLICY "Users can view their own view templates"
      ON public.view_templates
      FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can create their own view templates"
      ON public.view_templates
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own view templates"
      ON public.view_templates
      FOR UPDATE
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own view templates"
      ON public.view_templates
      FOR DELETE
      USING (auth.uid() = user_id);

    DROP TRIGGER IF EXISTS update_view_templates_updated_at ON public.view_templates;
    CREATE TRIGGER update_view_templates_updated_at
      BEFORE UPDATE ON public.view_templates
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END;
$$;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_view_templates_user_id ON public.view_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_view_templates_view_type ON public.view_templates(view_type);
