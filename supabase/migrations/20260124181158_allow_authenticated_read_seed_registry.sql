-- Allow authenticated users to read seed_data_registry for status display
-- This enables the Demo Data tab to show accurate counts without requiring admin role

DO $$
BEGIN
  -- Add SELECT policy for authenticated users (read-only access)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'seed_data_registry' 
    AND policyname = 'Authenticated users can read seed registry'
  ) THEN
    CREATE POLICY "Authenticated users can read seed registry"
      ON public.seed_data_registry
      FOR SELECT
      TO authenticated
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;
