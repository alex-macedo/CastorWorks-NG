-- Fix conflicting RLS policies on user_roles table
-- Remove policies that create circular dependencies with has_role() function

BEGIN;

-- Drop conflicting policies that call has_role()
DROP POLICY IF EXISTS "users_view_own_roles_or_admin" ON user_roles;
DROP POLICY IF EXISTS "Users can view own roles, admins can view all" ON user_roles;

-- Keep only the simple authenticated policy that allows users to query their own roles
-- The has_role() function will work because it runs with SECURITY DEFINER privileges

COMMIT;