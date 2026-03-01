-- Allow authenticated users to view all clients (RESTRICTED TO INTERNAL ROLES)
-- Migration: 20251230000006
-- Description: Adds a policy to allow internal users (admin, project_manager, etc.) to select all clients. 
-- This fixes the issue where users could not see clients in the dropdown when creating a new project.
-- This policy is RESTRICTED to internal roles only, preventing unauthorized access by clients.

BEGIN;

-- Check if policy exists before creating to match idempotency pattern
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'clients' 
    AND policyname = 'allow_internal_users_select_clients'
  ) THEN
    CREATE POLICY "allow_internal_users_select_clients" ON public.clients
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role::text IN ('admin', 'project_manager', 'admin_office', 'site_supervisor', 'supervisor')
        )
      );
  END IF;
END $$;

COMMIT;
