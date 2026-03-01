-- Google Calendar OAuth Tokens Table
-- Stores OAuth tokens for Google Calendar integration per user/project

-- Create enum for calendar provider
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'calendar_provider_type'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.calendar_provider_type AS ENUM (
      'google',
      'outlook',
      'apple'
    );
  END IF;
END
$$;

-- Create google_calendar_tokens table
CREATE TABLE IF NOT EXISTS public.google_calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  scope TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, project_id)
);

ALTER TABLE public.google_calendar_tokens
  ENABLE ROW LEVEL SECURITY;

-- RLS Policies for google_calendar_tokens
DROP POLICY IF EXISTS "users_manage_own_calendar_tokens"
  ON public.google_calendar_tokens;

DROP POLICY IF EXISTS "admin_manage_all_calendar_tokens"
  ON public.google_calendar_tokens;

-- Users can manage their own tokens
CREATE POLICY "users_manage_own_calendar_tokens"
ON public.google_calendar_tokens
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can manage all tokens
CREATE POLICY "admin_manage_all_calendar_tokens"
ON public.google_calendar_tokens
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_google_calendar_tokens_updated_at
  ON public.google_calendar_tokens;

CREATE TRIGGER update_google_calendar_tokens_updated_at
BEFORE UPDATE ON public.google_calendar_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_user_id
  ON public.google_calendar_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_project_id
  ON public.google_calendar_tokens(project_id);

-- Add google_calendar_email to projects table (for sharing)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS google_calendar_id TEXT,
  ADD COLUMN IF NOT EXISTS google_calendar_email TEXT;

-- Add sync preferences to integration_settings for Google Calendar
UPDATE public.integration_settings
SET configuration = jsonb_build_object(
  'provider', 'google',
  'client_id', '',
  'client_secret', '',
  'redirect_uri', '',
  'scopes', 'https://www.googleapis.com/auth/calendar.events'
)
WHERE integration_type = 'google_calendar'
  AND (configuration IS NULL OR configuration = '{}'::jsonb);

COMMENT ON TABLE public.google_calendar_tokens IS 'Stores OAuth tokens for Google Calendar integration per user/project';
