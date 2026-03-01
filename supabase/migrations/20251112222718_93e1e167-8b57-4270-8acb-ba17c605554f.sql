-- Drop the existing problematic policy that causes circular dependency
DROP POLICY IF EXISTS "Anyone can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Create new simplified policy without circular dependency
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
