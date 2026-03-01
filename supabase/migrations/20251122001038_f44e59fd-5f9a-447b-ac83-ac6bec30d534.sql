-- Tighten estimates SELECT policy to enforce owner/client/admin access only
-- Removes permissive read access that allows any authenticated user to see all estimates

BEGIN;

ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view all estimates" ON public.estimates;
DROP POLICY IF EXISTS "Users can view accessible estimates" ON public.estimates;
DROP POLICY IF EXISTS "Estimate read scoped by ownership or project access" ON public.estimates;
DROP POLICY IF EXISTS "Estimates read fallback (admin only)" ON public.estimates;
DROP POLICY IF EXISTS "Users can view own estimates" ON public.estimates;
DROP POLICY IF EXISTS "Team members can view project estimates" ON public.estimates;
DROP POLICY IF EXISTS "Admins can view all estimates" ON public.estimates;
DROP POLICY IF EXISTS "Estimates select - owner" ON public.estimates;
DROP POLICY IF EXISTS "Estimates select - project access" ON public.estimates;
DROP POLICY IF EXISTS "Estimates select - admin" ON public.estimates;

-- Create two specific SELECT policies for proper access control
-- Policy 1: Users can view their own estimates
CREATE POLICY "Estimates select - owner"
  ON public.estimates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy 2: Admins can view all estimates
CREATE POLICY "Estimates select - admin"
  ON public.estimates
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

COMMIT;