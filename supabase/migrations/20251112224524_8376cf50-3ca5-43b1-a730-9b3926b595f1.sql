-- Add supervisor interface mode preference to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS supervisor_interface_mode TEXT DEFAULT 'auto' CHECK (supervisor_interface_mode IN ('auto', 'mobile', 'desktop'));

COMMENT ON COLUMN public.user_preferences.supervisor_interface_mode IS 'Site supervisor interface preference: auto (device detection), mobile (force mobile view), or desktop (force desktop view)';