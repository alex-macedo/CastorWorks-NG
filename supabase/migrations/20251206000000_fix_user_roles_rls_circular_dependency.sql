-- Fix RLS circular dependency in user_roles SELECT policy
-- Allow users to view their own roles without requiring has_role() check

BEGIN;

-- Drop the problematic policy that creates circular dependency
DROP POLICY IF EXISTS "Users and admins can view roles" ON user_roles;

-- Create new policy that allows self-queries without has_role() dependency
CREATE POLICY "Users can view own roles, admins can view all"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

COMMIT;