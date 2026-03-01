BEGIN;

-- Ensure SELECT policy scopes to accessible projects
DROP POLICY IF EXISTS clients_select ON public.clients;

CREATE POLICY clients_select
  ON public.clients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM projects p
      WHERE p.client_id = clients.id
        AND has_project_access(auth.uid(), p.id)
    )
  );

-- Ensure INSERT policy exists and is scoped to authorized roles
DROP POLICY IF EXISTS clients_insert ON public.clients;

CREATE POLICY clients_insert
  ON public.clients
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'));

COMMIT;
