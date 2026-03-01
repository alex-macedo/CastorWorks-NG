-- Fix purchase orders and suppliers access for office admin role
-- 
-- PROBLEM ANALYSIS:
-- 1. has_project_access() only allows 'admin' and 'project_manager' roles 
--    but 'admin_office' role should also view purchase orders
-- 2. Suppliers policies reference non-existent 'procurement' role instead of 'admin_office'
-- 
-- SOLUTION:
-- 1. Update has_project_access() to include admin_office role
-- 2. Update has_project_admin_access() to include admin_office role  
-- 3. Fix suppliers policies to use admin_office instead of procurement

-- Update has_project_access function to include admin_office role
CREATE OR REPLACE FUNCTION public.has_project_access(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Admins, project managers, and office admins can access all projects
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND role IN ('admin', 'project_manager', 'admin_office')
  )
  OR
  -- Others can only access projects they own
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id AND owner_id = _user_id
  )
$$;

-- Update has_project_admin_access to include admin_office for consistency
-- Office admins should be able to create/edit purchase orders
CREATE OR REPLACE FUNCTION public.has_project_admin_access(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Admins, project managers, and office admins can admin all projects
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND role IN ('admin', 'project_manager', 'admin_office')
  )
  OR
  -- Project owners can admin their own projects
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id AND owner_id = _user_id
  )
$$;

-- Fix suppliers policies to use admin_office instead of non-existent procurement role
DO $$
BEGIN
  -- Only execute if suppliers table exists
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'suppliers'
  ) THEN
    -- Drop existing policies that reference 'procurement'
    DROP POLICY IF EXISTS "Role-based select suppliers" ON suppliers;
    DROP POLICY IF EXISTS "Role-based insert suppliers" ON suppliers;
    DROP POLICY IF EXISTS "Role-based update suppliers" ON suppliers;
    DROP POLICY IF EXISTS "Role-based delete suppliers" ON suppliers;

    -- Create corrected policies using admin_office
    CREATE POLICY "Role-based select suppliers"
      ON suppliers FOR SELECT
      USING (
        has_role(auth.uid(), 'admin')
        OR has_role(auth.uid(), 'admin_office')
        OR has_role(auth.uid(), 'project_manager')
      );

    CREATE POLICY "Role-based insert suppliers"
      ON suppliers FOR INSERT
      WITH CHECK (
        has_role(auth.uid(), 'admin') 
        OR has_role(auth.uid(), 'admin_office')
        OR has_role(auth.uid(), 'project_manager')
      );

    CREATE POLICY "Role-based update suppliers"
      ON suppliers FOR UPDATE
      USING (
        has_role(auth.uid(), 'admin') 
        OR has_role(auth.uid(), 'admin_office')
        OR has_role(auth.uid(), 'project_manager')
      )
      WITH CHECK (
        has_role(auth.uid(), 'admin') 
        OR has_role(auth.uid(), 'admin_office')
        OR has_role(auth.uid(), 'project_manager')
      );

    CREATE POLICY "Role-based delete suppliers"
      ON suppliers FOR DELETE
      USING (
        has_role(auth.uid(), 'admin') 
        OR has_role(auth.uid(), 'admin_office')
        OR has_role(auth.uid(), 'project_manager')
      );
  END IF;
END $$;

-- Add comments to document the changes
COMMENT ON FUNCTION public.has_project_access(_user_id uuid, _project_id uuid) 
IS 'Checks if user has access to a project. Allows admins, project managers, office admins, and project owners.';

COMMENT ON FUNCTION public.has_project_admin_access(_user_id uuid, _project_id uuid) 
IS 'Checks if user has admin access to a project. Allows admins, project managers, office admins, and project owners.';