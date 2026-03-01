-- Fix minor issues from main migration

-- Enable pg_trgm extension for text search (if available)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_trgm extension not available: %', SQLERRM;
END $$;

-- Create text search index if extension is available
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_log_messages_message_trgm 
    ON public.log_messages USING gin(message gin_trgm_ops);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create trigram index: %', SQLERRM;
END $$;

-- Add project member policy if not exists (using different approach)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'log_messages' 
    AND policyname = 'Project members can view project logs'
  ) THEN
    CREATE POLICY "Project members can view project logs"
    ON public.log_messages
    FOR SELECT
    TO authenticated
    USING (
      project_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.project_team_members ptm
        WHERE ptm.project_id = log_messages.project_id
        AND ptm.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'global_admin')
      )
    );
  END IF;
END $$;
