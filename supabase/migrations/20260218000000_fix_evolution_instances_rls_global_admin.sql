-- Fix evolution_instances RLS to allow global_admin (in addition to admin)
-- PGRST116 occurs when users with global_admin role cannot read evolution_instances
-- because the policy only allowed has_role(uid, 'admin')

BEGIN;

-- Drop existing policy
DROP POLICY IF EXISTS "Admins can manage evolution instances" ON public.evolution_instances;

-- Recreate with admin OR global_admin
CREATE POLICY "Admins can manage evolution instances"
  ON public.evolution_instances FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'global_admin'::app_role)
  );

COMMIT;
