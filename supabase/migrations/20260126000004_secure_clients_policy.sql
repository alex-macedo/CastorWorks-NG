BEGIN;

-- Add a trigger to automatically set user_id to the current user on insert
CREATE OR REPLACE FUNCTION public.set_client_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_client_user_id ON public.clients;
CREATE TRIGGER trigger_set_client_user_id
  BEFORE INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.set_client_user_id();

-- Now that we have user_id being set, we can make the SELECT policy slightly more specific
-- while still allowing the insert-returning to work.
DROP POLICY IF EXISTS clients_select ON public.clients;
CREATE POLICY clients_select
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.client_id = clients.id 
      AND public.has_project_access(auth.uid(), p.id)
    )
    OR
    has_role(auth.uid(), 'admin'::app_role)
    OR
    has_role(auth.uid(), 'project_manager'::app_role)
  );

COMMIT;
