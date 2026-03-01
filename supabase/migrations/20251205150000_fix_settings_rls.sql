-- Fix company_settings RLS
DROP POLICY IF EXISTS "authenticated_select_company_settings" ON public.company_settings;

CREATE POLICY "authenticated_select_company_settings"
  ON public.company_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL); -- Allow all authenticated users to read settings

-- Fix app_settings RLS
DROP POLICY IF EXISTS "authenticated_select_app_settings" ON public.app_settings;

CREATE POLICY "authenticated_select_app_settings"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL); -- Allow all authenticated users to read settings
