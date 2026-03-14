-- Create public waitlist capture table for CastorWorks landing page.

CREATE TABLE IF NOT EXISTS public.waiting_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  email TEXT NOT NULL,
  cell_phone TEXT NOT NULL,
  more_info_request TEXT,
  source TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.waiting_list IS 'Public waitlist leads captured from the CastorWorks landing page.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_waiting_list_email_unique
  ON public.waiting_list ((lower(btrim(email))));

CREATE INDEX IF NOT EXISTS idx_waiting_list_status
  ON public.waiting_list (status);

CREATE INDEX IF NOT EXISTS idx_waiting_list_created_at
  ON public.waiting_list (created_at DESC);

ALTER TABLE public.waiting_list ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "waiting_list_admin_select" ON public.waiting_list;
CREATE POLICY "waiting_list_admin_select"
  ON public.waiting_list
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'global_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

DROP TRIGGER IF EXISTS trg_waiting_list_updated_at ON public.waiting_list;
CREATE TRIGGER trg_waiting_list_updated_at
  BEFORE UPDATE ON public.waiting_list
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
