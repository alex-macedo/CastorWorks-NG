BEGIN;

ALTER TABLE public.sinapi_catalog ENABLE ROW LEVEL SECURITY;

-- Remove legacy permissive/service_role policies
DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='sinapi_catalog';
  IF FOUND THEN
    DELETE FROM pg_policies WHERE schemaname='public' AND tablename='sinapi_catalog';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- SELECT: allow all authenticated users to read OR restrict to admins depending on product requirements.
-- Default: admin-only SELECT for tighter security.
CREATE POLICY admin_select_sinapi_catalog
  ON public.sinapi_catalog
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- INSERT/UPDATE/DELETE: admin-only modifications
CREATE POLICY admin_insert_sinapi_catalog
  ON public.sinapi_catalog
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY admin_update_sinapi_catalog
  ON public.sinapi_catalog
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY admin_delete_sinapi_catalog
  ON public.sinapi_catalog
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

COMMIT;
