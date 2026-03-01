-- Allow all authenticated users to view app_settings and company_settings
-- This is required for the client portal and other roles to render the UI correctly (logos, system preferences)

-- ==== APP_SETTINGS TABLE ====
DROP POLICY IF EXISTS "All users can view app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated users can view app settings" ON public.app_settings;

CREATE POLICY "Authenticated users can view app settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ==== COMPANY_SETTINGS TABLE ====
DROP POLICY IF EXISTS "All users can view company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Authenticated users can view company settings" ON public.company_settings;

CREATE POLICY "Authenticated users can view company settings"
  ON public.company_settings FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);
