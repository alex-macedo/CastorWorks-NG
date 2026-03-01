-- Create admin_events table if not exists for audit logging
CREATE TABLE IF NOT EXISTS public.admin_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL,
  payload JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_events ENABLE ROW LEVEL SECURITY;

-- Only admins and project managers can view audit logs
DROP POLICY IF EXISTS "Admins and PMs can view audit logs" ON public.admin_events;
CREATE POLICY "Admins and PMs can view audit logs"
ON public.admin_events
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'project_manager'::app_role)
);

-- Authenticated users can insert audit logs
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.admin_events;
CREATE POLICY "Authenticated users can insert audit logs"
ON public.admin_events
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'admin_events'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.admin_events ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
END;
$$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_admin_events_event_key ON public.admin_events(event_key);
CREATE INDEX IF NOT EXISTS idx_admin_events_created_at ON public.admin_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_events_user_id ON public.admin_events(user_id);
