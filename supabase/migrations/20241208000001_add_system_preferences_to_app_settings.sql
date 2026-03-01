-- Add system preferences fields to app_settings table
-- These are system-wide defaults that only admins can update but all users can view

BEGIN;

-- Add system preference columns to app_settings
ALTER TABLE public.app_settings 
  ADD COLUMN IF NOT EXISTS system_language TEXT DEFAULT 'en-US';

ALTER TABLE public.app_settings 
  ADD COLUMN IF NOT EXISTS system_currency TEXT DEFAULT 'USD';

ALTER TABLE public.app_settings 
  ADD COLUMN IF NOT EXISTS system_date_format TEXT DEFAULT 'MM/DD/YYYY';

ALTER TABLE public.app_settings 
  ADD COLUMN IF NOT EXISTS system_time_zone TEXT DEFAULT 'America/New_York';

ALTER TABLE public.app_settings 
  ADD COLUMN IF NOT EXISTS system_weather_location TEXT DEFAULT 'New York, USA';

ALTER TABLE public.app_settings 
  ADD COLUMN IF NOT EXISTS system_temperature_unit TEXT DEFAULT 'F';

ALTER TABLE public.app_settings 
  ADD COLUMN IF NOT EXISTS system_number_format TEXT DEFAULT 'compact';

-- Update RLS policies to allow all authenticated users to view app_settings
-- but only admins can update them
DROP POLICY IF EXISTS "authenticated_select_app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "admin_update_app_settings" ON public.app_settings;

-- Allow all authenticated users to view system settings
CREATE POLICY "authenticated_select_app_settings"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL); -- All authenticated users can view

-- Only admins can update system settings
CREATE POLICY "admin_update_app_settings"
  ON public.app_settings
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Update the default row with proper system defaults
UPDATE public.app_settings 
SET 
  system_language = 'en-US',
  system_currency = 'USD',
  system_date_format = 'MM/DD/YYYY',
  system_time_zone = 'America/New_York',
  system_weather_location = 'New York, USA',
  system_temperature_unit = 'F',
  system_number_format = 'compact',
  updated_at = now()
WHERE id IS NOT NULL;

-- Ensure there's always a row in app_settings
INSERT INTO public.app_settings (
  system_language,
  system_currency, 
  system_date_format,
  system_time_zone,
  system_weather_location,
  system_temperature_unit,
  system_number_format
)
SELECT 
  'en-US',
  'USD',
  'MM/DD/YYYY', 
  'America/New_York',
  'New York, USA',
  'F',
  'compact'
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings);

COMMIT;