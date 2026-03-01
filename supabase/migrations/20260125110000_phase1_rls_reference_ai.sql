BEGIN;

-- Phase 1: Reference tables + AI monitoring (admin/service role)

-- INSS reference tables (authenticated read, admin/service write)
DO $$ BEGIN
  DELETE FROM pg_policies WHERE schemaname='public' AND tablename='inss_category_reductions';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.inss_category_reductions ENABLE ROW LEVEL SECURITY;
CREATE POLICY authenticated_select_inss_category_reductions
  ON public.inss_category_reductions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY admin_service_insert_inss_category_reductions
  ON public.inss_category_reductions
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');
CREATE POLICY admin_service_update_inss_category_reductions
  ON public.inss_category_reductions
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role')
  WITH CHECK (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');
CREATE POLICY admin_service_delete_inss_category_reductions
  ON public.inss_category_reductions
  FOR DELETE
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');

DO $$ BEGIN
  DELETE FROM pg_policies WHERE schemaname='public' AND tablename='inss_destination_factors';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.inss_destination_factors ENABLE ROW LEVEL SECURITY;
CREATE POLICY authenticated_select_inss_destination_factors
  ON public.inss_destination_factors
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY admin_service_insert_inss_destination_factors
  ON public.inss_destination_factors
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');
CREATE POLICY admin_service_update_inss_destination_factors
  ON public.inss_destination_factors
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role')
  WITH CHECK (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');
CREATE POLICY admin_service_delete_inss_destination_factors
  ON public.inss_destination_factors
  FOR DELETE
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');

DO $$ BEGIN
  DELETE FROM pg_policies WHERE schemaname='public' AND tablename='inss_fator_ajuste_rules';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.inss_fator_ajuste_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY authenticated_select_inss_fator_ajuste_rules
  ON public.inss_fator_ajuste_rules
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY admin_service_insert_inss_fator_ajuste_rules
  ON public.inss_fator_ajuste_rules
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');
CREATE POLICY admin_service_update_inss_fator_ajuste_rules
  ON public.inss_fator_ajuste_rules
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role')
  WITH CHECK (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');
CREATE POLICY admin_service_delete_inss_fator_ajuste_rules
  ON public.inss_fator_ajuste_rules
  FOR DELETE
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');

DO $$ BEGIN
  DELETE FROM pg_policies WHERE schemaname='public' AND tablename='inss_fator_social_brackets';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.inss_fator_social_brackets ENABLE ROW LEVEL SECURITY;
CREATE POLICY authenticated_select_inss_fator_social_brackets
  ON public.inss_fator_social_brackets
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY admin_service_insert_inss_fator_social_brackets
  ON public.inss_fator_social_brackets
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');
CREATE POLICY admin_service_update_inss_fator_social_brackets
  ON public.inss_fator_social_brackets
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role')
  WITH CHECK (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');
CREATE POLICY admin_service_delete_inss_fator_social_brackets
  ON public.inss_fator_social_brackets
  FOR DELETE
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');

DO $$ BEGIN
  DELETE FROM pg_policies WHERE schemaname='public' AND tablename='inss_labor_percentages';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.inss_labor_percentages ENABLE ROW LEVEL SECURITY;
CREATE POLICY authenticated_select_inss_labor_percentages
  ON public.inss_labor_percentages
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY admin_service_insert_inss_labor_percentages
  ON public.inss_labor_percentages
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');
CREATE POLICY admin_service_update_inss_labor_percentages
  ON public.inss_labor_percentages
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role')
  WITH CHECK (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');
CREATE POLICY admin_service_delete_inss_labor_percentages
  ON public.inss_labor_percentages
  FOR DELETE
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');

DO $$ BEGIN
  DELETE FROM pg_policies WHERE schemaname='public' AND tablename='inss_prefab_rules';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.inss_prefab_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY authenticated_select_inss_prefab_rules
  ON public.inss_prefab_rules
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY admin_service_insert_inss_prefab_rules
  ON public.inss_prefab_rules
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');
CREATE POLICY admin_service_update_inss_prefab_rules
  ON public.inss_prefab_rules
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role')
  WITH CHECK (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');
CREATE POLICY admin_service_delete_inss_prefab_rules
  ON public.inss_prefab_rules
  FOR DELETE
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');

DO $$ BEGIN
  DELETE FROM pg_policies WHERE schemaname='public' AND tablename='inss_rates_history';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.inss_rates_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY authenticated_select_inss_rates_history
  ON public.inss_rates_history
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY admin_service_insert_inss_rates_history
  ON public.inss_rates_history
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');
CREATE POLICY admin_service_update_inss_rates_history
  ON public.inss_rates_history
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role')
  WITH CHECK (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');
CREATE POLICY admin_service_delete_inss_rates_history
  ON public.inss_rates_history
  FOR DELETE
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');

DO $$ BEGIN
  DELETE FROM pg_policies WHERE schemaname='public' AND tablename='inss_usinados_rules';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.inss_usinados_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY authenticated_select_inss_usinados_rules
  ON public.inss_usinados_rules
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY admin_service_insert_inss_usinados_rules
  ON public.inss_usinados_rules
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');
CREATE POLICY admin_service_update_inss_usinados_rules
  ON public.inss_usinados_rules
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role')
  WITH CHECK (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');
CREATE POLICY admin_service_delete_inss_usinados_rules
  ON public.inss_usinados_rules
  FOR DELETE
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');

-- AI monitoring tables (admin/service role)
DO $$ BEGIN
  DELETE FROM pg_policies WHERE schemaname='public' AND tablename='ai_model_performance';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
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

DO $$ BEGIN
  DELETE FROM pg_policies WHERE schemaname='public' AND tablename='ai_training_data';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
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

DO $$ BEGIN
  DELETE FROM pg_policies WHERE schemaname='public' AND tablename='ai_insights';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
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

DO $$ BEGIN
  DELETE FROM pg_policies WHERE schemaname='public' AND tablename='ai_recommendations';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
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

-- Reminder logs restricted to service/admin
DO $$ BEGIN
  DELETE FROM pg_policies WHERE schemaname='public' AND tablename='reminder_logs';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_service_select_reminder_logs
  ON public.reminder_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR auth.role() = 'service_role');
CREATE POLICY service_insert_reminder_logs
  ON public.reminder_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY service_update_reminder_logs
  ON public.reminder_logs
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY service_delete_reminder_logs
  ON public.reminder_logs
  FOR DELETE
  USING (auth.role() = 'service_role');

COMMIT;
