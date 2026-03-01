BEGIN;

-- Re-enable RLS on clients table with proper policy
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Ensure the insert policy is scoped to authorized roles
DROP POLICY IF EXISTS clients_insert ON public.clients;

CREATE POLICY clients_insert
  ON public.clients
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'));

COMMIT;
