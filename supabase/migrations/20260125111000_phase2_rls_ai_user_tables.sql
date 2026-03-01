BEGIN;

-- Phase 2: AI user tables + provider configs

DO $$ BEGIN
  DELETE FROM pg_policies WHERE schemaname='public' AND tablename='ai_provider_configs';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
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

DO $$ BEGIN
  DELETE FROM pg_policies WHERE schemaname='public' AND tablename='ai_configurations';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
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

DO $$ BEGIN
  DELETE FROM pg_policies WHERE schemaname='public' AND tablename='ai_chat_messages';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
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

DO $$ BEGIN
  DELETE FROM pg_policies WHERE schemaname='public' AND tablename='ai_feedback';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_select_ai_feedback
  ON public.ai_feedback
  FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY user_insert_ai_feedback
  ON public.ai_feedback
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DO $$ BEGIN
  DELETE FROM pg_policies WHERE schemaname='public' AND tablename='ai_usage_logs';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_select_ai_usage_logs
  ON public.ai_usage_logs
  FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY user_insert_ai_usage_logs
  ON public.ai_usage_logs
  FOR INSERT
  WITH CHECK (user_id = auth.uid() OR auth.role() = 'service_role');

DO $$ BEGIN
  DELETE FROM pg_policies WHERE schemaname='public' AND tablename='ai_usage';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_service_select_ai_usage
  ON public.ai_usage
  FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');
CREATE POLICY service_insert_ai_usage
  ON public.ai_usage
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

COMMIT;
