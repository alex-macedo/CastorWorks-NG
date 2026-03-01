-- RLS hardening for documentation pages
ALTER TABLE public.page ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_section ENABLE ROW LEVEL SECURITY;

-- Pages policy (service role only)
DROP POLICY IF EXISTS "Enable read access for anon and authenticated" ON public.page;
DROP POLICY IF EXISTS "service_read_pages" ON public.page;
CREATE POLICY "service_read_pages"
  ON public.page
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'service_role');

-- Page sections policy (service role only)
DROP POLICY IF EXISTS "Enable read access for anon and authenticated" ON public.page_section;
DROP POLICY IF EXISTS "authenticated_select_page_sections" ON public.page_section;
CREATE POLICY "authenticated_select_page_sections"
  ON public.page_section
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'service_role');
