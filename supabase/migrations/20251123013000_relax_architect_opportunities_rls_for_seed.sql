-- Allow service role (and admins) to manage architect_opportunities for seeding

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'architect_opportunities'
  ) THEN
    DROP POLICY IF EXISTS "service_role_manage_architect_opportunities" ON public.architect_opportunities;
    CREATE POLICY "service_role_manage_architect_opportunities"
    ON public.architect_opportunities
    FOR ALL
    TO authenticated
    USING (
      auth.role() = 'service_role'
      OR has_role(auth.uid(), 'admin'::app_role)
    )
    WITH CHECK (
      auth.role() = 'service_role'
      OR has_role(auth.uid(), 'admin'::app_role)
    );
  END IF;
END;
$$;
