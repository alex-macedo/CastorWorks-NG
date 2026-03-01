-- Allow service role (and admins) to manage time_logs for seeding and admin operations

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'time_logs'
  ) THEN
    DROP POLICY IF EXISTS "service_role_manage_time_logs" ON public.time_logs;
    CREATE POLICY "service_role_manage_time_logs"
    ON public.time_logs
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
