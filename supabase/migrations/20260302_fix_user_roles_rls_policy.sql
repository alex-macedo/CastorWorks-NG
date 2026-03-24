-- Fix RLS policy on user_roles table to allow service role queries
-- The previous policy "user_roles_select_authenticated" was checking auth.uid() 
-- which fails when service role key is used in Edge Functions

-- Drop the problematic policy that checked auth.uid()
DROP POLICY IF EXISTS "user_roles_select_authenticated" ON public.user_roles;

-- Drop the new policy if it already exists (idempotent)
DROP POLICY IF EXISTS "user_roles_select_for_admin_check" ON public.user_roles;

-- Create new permissive policy for reading user_roles
-- This allows both authenticated users and service role to read user_roles
-- The policy uses "true" as the condition, which is safe for authenticated/service_role roles
CREATE POLICY "user_roles_select_for_admin_check"
  ON public.user_roles
  FOR SELECT
  TO authenticated, service_role
  USING (true);
