BEGIN;

-- Client / Portal tables

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='clients' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.clients', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
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
CREATE POLICY clients_insert
  ON public.clients
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'));
CREATE POLICY clients_update
  ON public.clients
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'));
CREATE POLICY clients_delete
  ON public.clients
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='client_tasks' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.client_tasks', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.client_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY client_tasks_select
  ON public.client_tasks
  FOR SELECT
  USING (has_project_access(auth.uid(), project_id));
CREATE POLICY client_tasks_insert
  ON public.client_tasks
  FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id));
CREATE POLICY client_tasks_update
  ON public.client_tasks
  FOR UPDATE
  USING (created_by = auth.uid() OR has_project_admin_access(auth.uid(), project_id))
  WITH CHECK (created_by = auth.uid() OR has_project_admin_access(auth.uid(), project_id));
CREATE POLICY client_tasks_delete
  ON public.client_tasks
  FOR DELETE
  USING (created_by = auth.uid() OR has_project_admin_access(auth.uid(), project_id));

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='client_project_access' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.client_project_access', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.client_project_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY client_project_access_select
  ON public.client_project_access
  FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'));
CREATE POLICY client_project_access_insert
  ON public.client_project_access
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'));
CREATE POLICY client_project_access_delete
  ON public.client_project_access
  FOR DELETE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'));

DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'folder_client_access') THEN
    FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='folder_client_access' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.folder_client_access', r.policyname);
    END LOOP;

    ALTER TABLE public.folder_client_access ENABLE ROW LEVEL SECURITY;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_folders') THEN
      CREATE POLICY folder_client_access_select
        ON public.folder_client_access
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1
            FROM document_folders df
            WHERE df.id = folder_client_access.folder_id
              AND has_project_access(auth.uid(), df.project_id)
          )
        );
      CREATE POLICY folder_client_access_insert
        ON public.folder_client_access
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1
            FROM document_folders df
            WHERE df.id = folder_client_access.folder_id
              AND has_project_admin_access(auth.uid(), df.project_id)
          )
        );
      CREATE POLICY folder_client_access_delete
        ON public.folder_client_access
        FOR DELETE
        USING (
          EXISTS (
            SELECT 1
            FROM document_folders df
            WHERE df.id = folder_client_access.folder_id
              AND has_project_admin_access(auth.uid(), df.project_id)
          )
        );
    END IF;
  END IF;
END $$;

COMMIT;
