-- Add notification preference columns to user_preferences table
-- These are user-specific notification settings (unlike app_settings which is system-wide)

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS notifications_project_updates BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notifications_financial_alerts BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notifications_schedule_changes BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notifications_material_delivery BOOLEAN DEFAULT false;

-- Add comments for clarity
COMMENT ON COLUMN public.user_preferences.notifications_project_updates IS 'User preference for project update notifications';
COMMENT ON COLUMN public.user_preferences.notifications_financial_alerts IS 'User preference for financial alert notifications';
COMMENT ON COLUMN public.user_preferences.notifications_schedule_changes IS 'User preference for schedule change notifications';
COMMENT ON COLUMN public.user_preferences.notifications_material_delivery IS 'User preference for material delivery notifications';
