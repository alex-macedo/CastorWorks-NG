-- Add notification check frequency setting to app_settings

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS notification_check_frequency_seconds INTEGER DEFAULT 15;

COMMENT ON COLUMN public.app_settings.notification_check_frequency_seconds IS 'Polling interval for notification checks in seconds.';

UPDATE public.app_settings
SET notification_check_frequency_seconds = 15
WHERE notification_check_frequency_seconds IS NULL;
