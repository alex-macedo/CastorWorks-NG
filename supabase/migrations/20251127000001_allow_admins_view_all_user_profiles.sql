-- Migration: Allow admins and project managers to view all user profiles and roles
-- This is needed for the Client Access Management page where admins need to see
-- client users to grant them access to projects

-- Update user_profiles RLS policy
-- Drop the overly restrictive policy that only allows users to see their own profile
DROP POLICY IF EXISTS "authenticated_select_user_profiles" ON public.user_profiles;

-- Create a new policy that allows:
-- 1. Users to view their own profile
-- 2. Admins to view all profiles
-- 3. Project managers to view all profiles
DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.user_profiles;

CREATE POLICY "user_profiles_select_policy"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'project_manager'::app_role)
);

-- Update user_roles RLS policy to also include project managers
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

DROP POLICY IF EXISTS "Users can view their own roles or admins/pms can view all" ON public.user_roles;

CREATE POLICY "Users can view their own roles or admins/pms can view all"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'project_manager'::app_role)
);

-- Add comments explaining the policies
COMMENT ON POLICY "user_profiles_select_policy" ON public.user_profiles IS
  'Allows users to view their own profile, and allows admins and project managers to view all profiles for user management purposes';

COMMENT ON POLICY "Users can view their own roles or admins/pms can view all" ON public.user_roles IS
  'Allows users to view their own roles, and allows admins and project managers to view all roles for user management purposes';
