-- Phase 1: Security Monitoring Database Setup

-- Create security_events table for tracking security incidents
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('auth_failed', 'rls_violation', 'suspicious_access', 'rate_limit_exceeded', 'account_locked', 'privilege_escalation')),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address text,
  user_agent text,
  resource_accessed text,
  action_attempted text,
  policy_violated text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity) WHERE severity IN ('high', 'critical');
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_security_events_unresolved ON public.security_events(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.security_events(event_type);

-- Enable RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view security events
DROP POLICY IF EXISTS "Admins can view all security events" ON public.security_events;
CREATE POLICY "Admins can view all security events"
  ON public.security_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- System (authenticated users) can insert security events
DROP POLICY IF EXISTS "System can insert security events" ON public.security_events;
CREATE POLICY "System can insert security events"
  ON public.security_events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admins can update security events (for resolution)
DROP POLICY IF EXISTS "Admins can update security events" ON public.security_events;
CREATE POLICY "Admins can update security events"
  ON public.security_events FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Create failed_login_attempts table for tracking brute force attempts
CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  user_agent text,
  attempt_count integer DEFAULT 1,
  first_attempt timestamptz DEFAULT now(),
  last_attempt timestamptz DEFAULT now(),
  is_blocked boolean DEFAULT false,
  blocked_until timestamptz
);

CREATE INDEX IF NOT EXISTS idx_failed_logins_email ON public.failed_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_failed_logins_ip ON public.failed_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_failed_logins_blocked ON public.failed_login_attempts(is_blocked) WHERE is_blocked = true;
CREATE INDEX IF NOT EXISTS idx_failed_logins_last_attempt ON public.failed_login_attempts(last_attempt DESC);

-- No RLS on failed_login_attempts - system-level tracking only

-- Create security_metrics view for dashboard analytics
CREATE OR REPLACE VIEW public.security_metrics AS
SELECT
  COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours') as events_24h,
  COUNT(*) FILTER (WHERE created_at > now() - interval '1 hour') as events_1h,
  COUNT(*) FILTER (WHERE severity = 'critical' AND created_at > now() - interval '24 hours') as critical_24h,
  COUNT(*) FILTER (WHERE severity = 'high' AND created_at > now() - interval '24 hours') as high_24h,
  COUNT(*) FILTER (WHERE event_type = 'auth_failed' AND created_at > now() - interval '24 hours') as failed_auth_24h,
  COUNT(*) FILTER (WHERE event_type = 'rls_violation' AND created_at > now() - interval '24 hours') as rls_violations_24h,
  COUNT(*) FILTER (WHERE event_type = 'suspicious_access' AND created_at > now() - interval '24 hours') as suspicious_access_24h,
  COUNT(DISTINCT user_id) FILTER (WHERE created_at > now() - interval '24 hours') as affected_users_24h,
  COUNT(*) FILTER (WHERE resolved = false) as unresolved_events
FROM public.security_events;

-- Create function to detect overly permissive RLS policies
CREATE OR REPLACE FUNCTION public.get_permissive_policies()
RETURNS TABLE (
  schemaname text,
  tablename text,
  policyname text,
  permissive text,
  roles text[],
  cmd text,
  qual text,
  with_check text
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.schemaname::text,
    p.tablename::text,
    p.policyname::text,
    p.permissive::text,
    p.roles::text[],
    p.cmd::text,
    p.qual::text,
    p.with_check::text
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND (
      p.qual = 'true' 
      OR p.with_check = 'true'
      OR p.qual IS NULL
      OR p.with_check IS NULL
    )
    AND p.tablename NOT LIKE '%_templates'
  ORDER BY p.tablename, p.policyname;
$$;

-- Log this security remediation
INSERT INTO public.admin_events (event_key, payload) 
VALUES ('security_monitoring_setup', '{"action": "Phase 1 database setup completed", "tables": ["security_events", "failed_login_attempts"], "views": ["security_metrics"], "functions": ["get_permissive_policies"]}');
