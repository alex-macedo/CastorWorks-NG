-- ============================================================================
-- SECURE MIGRATION EXAMPLE (FOLLOWS BEST PRACTICES)
-- This file should PASS the security scanner
-- ============================================================================

-- Example: User-scoped table with proper RLS policies
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_enabled BOOLEAN DEFAULT true,
  email_digest TEXT DEFAULT 'daily',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS (REQUIRED!)
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- ✅ SECURE: Users can only view their own settings
CREATE POLICY "Users view own settings"
  ON public.user_settings
  FOR SELECT
  USING (user_id = auth.uid());

-- ✅ SECURE: Users can only insert their own settings
CREATE POLICY "Users insert own settings"
  ON public.user_settings
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ✅ SECURE: Users can only update their own settings
CREATE POLICY "Users update own settings"
  ON public.user_settings
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ✅ SECURE: Users can only delete their own settings
CREATE POLICY "Users delete own settings"
  ON public.user_settings
  FOR DELETE
  USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);

-- Add updated_at trigger
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add helpful comment
COMMENT ON TABLE public.user_settings IS 
  'User notification and email settings. RLS ensures users can only access their own settings.';
