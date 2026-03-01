-- Ensure contractors table uses RLS and define access policies

-- Enable RLS (safe if already enabled)
ALTER TABLE IF EXISTS public.contractors ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read contractors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contractors'
      AND policyname = 'authenticated_select_contractors'
  ) THEN
    CREATE POLICY "authenticated_select_contractors"
    ON public.contractors
    FOR SELECT
    TO authenticated
    USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Admins (and service role) can manage contractors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contractors'
      AND policyname = 'admins_manage_contractors'
  ) THEN
    CREATE POLICY "admins_manage_contractors"
    ON public.contractors
    FOR ALL
    USING (
      auth.role() = 'service_role'
      OR has_role(auth.uid(), 'admin'::app_role)
    )
    WITH CHECK (
      auth.role() = 'service_role'
      OR has_role(auth.uid(), 'admin'::app_role)
    );
  END IF;
END $$;
