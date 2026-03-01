
-- Migration: Fix permissive RLS policies
-- Created: 2026-02-10

BEGIN;

-- 1. Fix financial_collection_sequences
DROP POLICY IF EXISTS "Users can view collection sequences for accessible projects" ON public.financial_collection_sequences;
DROP POLICY IF EXISTS "Authenticated users can view collection sequences" ON public.financial_collection_sequences;
DROP POLICY IF EXISTS "Admins can manage collection sequences" ON public.financial_collection_sequences;

CREATE POLICY "Users can view collection sequences for accessible projects"
  ON public.financial_collection_sequences FOR SELECT
  TO authenticated
  USING (
    project_id IS NULL OR has_project_access(auth.uid(), project_id) OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can manage collection sequences"
  ON public.financial_collection_sequences FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));


-- 2. Fix financial_collection_actions
DROP POLICY IF EXISTS "Users can view collection actions for accessible invoices" ON public.financial_collection_actions;
DROP POLICY IF EXISTS "Admins can manage collection actions" ON public.financial_collection_actions;

CREATE POLICY "Users can view collection actions for accessible projects"
  ON public.financial_collection_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.financial_ar_invoices i
      WHERE i.id = invoice_id
      AND (has_project_access(auth.uid(), i.project_id) OR has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Admins can manage collection actions"
  ON public.financial_collection_actions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));


-- 3. Fix evolution_notification_logs
DROP POLICY IF EXISTS "Admins can view notification logs" ON public.evolution_notification_logs;
DROP POLICY IF EXISTS "Admins can insert notification logs" ON public.evolution_notification_logs;
DROP POLICY IF EXISTS "Service role can insert notification logs" ON public.evolution_notification_logs;

CREATE POLICY "Admins can view notification logs"
  ON public.evolution_notification_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert notification logs"
  ON public.evolution_notification_logs FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert notification logs"
  ON public.evolution_notification_logs FOR INSERT
  TO service_role
  WITH CHECK (auth.role() = 'service_role');

COMMIT;
