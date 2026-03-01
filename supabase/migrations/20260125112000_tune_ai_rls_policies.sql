BEGIN;

-- Update permissive policy detection to ignore valid SELECT/DELETE policies
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
      (p.cmd IN ('SELECT', 'DELETE') AND (p.qual IS NULL OR p.qual = 'true'))
      OR (p.cmd IN ('INSERT', 'UPDATE') AND (p.with_check IS NULL OR p.with_check = 'true'))
      OR (p.cmd = 'ALL' AND (
        p.qual IS NULL OR p.qual = 'true' OR p.with_check IS NULL OR p.with_check = 'true'
      ))
    )
    AND p.tablename NOT LIKE '%_templates'
  ORDER BY p.tablename, p.policyname;
$$;

-- Drop all existing policies for AI-related tables to avoid duplicates
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='ai_provider_configs' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.ai_provider_configs', r.policyname);
  END LOOP;
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='ai_configurations' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.ai_configurations', r.policyname);
  END LOOP;
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='ai_chat_messages' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.ai_chat_messages', r.policyname);
  END LOOP;
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='ai_feedback' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.ai_feedback', r.policyname);
  END LOOP;
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='ai_usage_logs' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.ai_usage_logs', r.policyname);
  END LOOP;
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='ai_usage' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.ai_usage', r.policyname);
  END LOOP;
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='ai_insights' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.ai_insights', r.policyname);
  END LOOP;
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='ai_recommendations' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.ai_recommendations', r.policyname);
  END LOOP;
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='ai_model_performance' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.ai_model_performance', r.policyname);
  END LOOP;
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='ai_training_data' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.ai_training_data', r.policyname);
  END LOOP;
END $$;

-- Recreate AI provider config policies (admin/service only)
ALTER TABLE public.ai_provider_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_service_select_ai_provider_configs
  ON public.ai_provider_configs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');
CREATE POLICY admin_service_mutate_ai_provider_configs
  ON public.ai_provider_configs
  FOR ALL
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role')
  WITH CHECK (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');

-- AI configurations (user-owned)
ALTER TABLE public.ai_configurations ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_select_ai_configurations
  ON public.ai_configurations
  FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY user_insert_ai_configurations
  ON public.ai_configurations
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY user_update_ai_configurations
  ON public.ai_configurations
  FOR UPDATE
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY user_delete_ai_configurations
  ON public.ai_configurations
  FOR DELETE
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- AI chat messages (user-owned)
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_select_ai_chat_messages
  ON public.ai_chat_messages
  FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY user_insert_ai_chat_messages
  ON public.ai_chat_messages
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY user_delete_ai_chat_messages
  ON public.ai_chat_messages
  FOR DELETE
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- AI feedback (user-owned, admin read)
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_select_ai_feedback
  ON public.ai_feedback
  FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY user_insert_ai_feedback
  ON public.ai_feedback
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- AI usage logs (user-owned or service inserts)
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_select_ai_usage_logs
  ON public.ai_usage_logs
  FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY user_insert_ai_usage_logs
  ON public.ai_usage_logs
  FOR INSERT
  WITH CHECK (user_id = auth.uid() OR auth.role() = 'service_role');

-- AI usage (service/admin only)
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_service_select_ai_usage
  ON public.ai_usage
  FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');
CREATE POLICY service_insert_ai_usage
  ON public.ai_usage
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- AI monitoring/admin tables
ALTER TABLE public.ai_model_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_service_select_ai_model_performance
  ON public.ai_model_performance
  FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');
CREATE POLICY admin_service_mutate_ai_model_performance
  ON public.ai_model_performance
  FOR ALL
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role')
  WITH CHECK (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');

ALTER TABLE public.ai_training_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_service_select_ai_training_data
  ON public.ai_training_data
  FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');
CREATE POLICY admin_service_mutate_ai_training_data
  ON public.ai_training_data
  FOR ALL
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role')
  WITH CHECK (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_service_select_ai_insights
  ON public.ai_insights
  FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');
CREATE POLICY admin_service_mutate_ai_insights
  ON public.ai_insights
  FOR ALL
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role')
  WITH CHECK (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');

ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_service_select_ai_recommendations
  ON public.ai_recommendations
  FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');
CREATE POLICY admin_service_mutate_ai_recommendations
  ON public.ai_recommendations
  FOR ALL
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role')
  WITH CHECK (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');

COMMIT;
