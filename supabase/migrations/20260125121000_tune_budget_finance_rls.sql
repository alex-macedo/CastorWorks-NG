BEGIN;

-- Budget + Finance tables

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='budget_phase_totals' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.budget_phase_totals', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.budget_phase_totals ENABLE ROW LEVEL SECURITY;
CREATE POLICY budget_phase_totals_select
  ON public.budget_phase_totals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM project_budgets pb
      WHERE pb.id = budget_phase_totals.budget_id
        AND has_project_access(auth.uid(), pb.project_id)
    )
  );
CREATE POLICY budget_phase_totals_mutate
  ON public.budget_phase_totals
  FOR ALL
  USING (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin'));

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='budget_templates' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.budget_templates', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.budget_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY budget_templates_select
  ON public.budget_templates
  FOR SELECT
  USING (created_by = auth.uid() OR is_public = true OR has_role(auth.uid(), 'admin'));
CREATE POLICY budget_templates_insert
  ON public.budget_templates
  FOR INSERT
  WITH CHECK (created_by = auth.uid());
CREATE POLICY budget_templates_update
  ON public.budget_templates
  FOR UPDATE
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  WITH CHECK (created_by = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY budget_templates_delete
  ON public.budget_templates
  FOR DELETE
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'));

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='budget_template_cost_codes' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.budget_template_cost_codes', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.budget_template_cost_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY budget_template_cost_codes_select
  ON public.budget_template_cost_codes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM budget_templates bt
      WHERE bt.id = budget_template_cost_codes.template_id
        AND (bt.created_by = auth.uid() OR bt.is_public = true OR has_role(auth.uid(), 'admin'))
    )
  );
CREATE POLICY budget_template_cost_codes_insert
  ON public.budget_template_cost_codes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM budget_templates bt
      WHERE bt.id = budget_template_cost_codes.template_id
        AND bt.created_by = auth.uid()
    )
  );
CREATE POLICY budget_template_cost_codes_update
  ON public.budget_template_cost_codes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM budget_templates bt
      WHERE bt.id = budget_template_cost_codes.template_id
        AND bt.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM budget_templates bt
      WHERE bt.id = budget_template_cost_codes.template_id
        AND bt.created_by = auth.uid()
    )
  );
CREATE POLICY budget_template_cost_codes_delete
  ON public.budget_template_cost_codes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM budget_templates bt
      WHERE bt.id = budget_template_cost_codes.template_id
        AND (bt.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='budget_template_items' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.budget_template_items', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.budget_template_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY budget_template_items_select
  ON public.budget_template_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM budget_templates bt
      WHERE bt.id = budget_template_items.template_id
        AND (bt.created_by = auth.uid() OR bt.is_public = true OR has_role(auth.uid(), 'admin'))
    )
  );
CREATE POLICY budget_template_items_insert
  ON public.budget_template_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM budget_templates bt
      WHERE bt.id = budget_template_items.template_id
        AND bt.created_by = auth.uid()
    )
  );
CREATE POLICY budget_template_items_update
  ON public.budget_template_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM budget_templates bt
      WHERE bt.id = budget_template_items.template_id
        AND bt.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM budget_templates bt
      WHERE bt.id = budget_template_items.template_id
        AND bt.created_by = auth.uid()
    )
  );
CREATE POLICY budget_template_items_delete
  ON public.budget_template_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM budget_templates bt
      WHERE bt.id = budget_template_items.template_id
        AND (bt.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='budget_template_phases' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.budget_template_phases', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.budget_template_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY budget_template_phases_select
  ON public.budget_template_phases
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM budget_templates bt
      WHERE bt.id = budget_template_phases.template_id
        AND (bt.created_by = auth.uid() OR bt.is_public = true OR has_role(auth.uid(), 'admin'))
    )
  );
CREATE POLICY budget_template_phases_insert
  ON public.budget_template_phases
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM budget_templates bt
      WHERE bt.id = budget_template_phases.template_id
        AND bt.created_by = auth.uid()
    )
  );
CREATE POLICY budget_template_phases_update
  ON public.budget_template_phases
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM budget_templates bt
      WHERE bt.id = budget_template_phases.template_id
        AND bt.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM budget_templates bt
      WHERE bt.id = budget_template_phases.template_id
        AND bt.created_by = auth.uid()
    )
  );
CREATE POLICY budget_template_phases_delete
  ON public.budget_template_phases
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM budget_templates bt
      WHERE bt.id = budget_template_phases.template_id
        AND (bt.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='quotes' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.quotes', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY quotes_select
  ON public.quotes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM purchase_request_items pri
      JOIN project_purchase_requests pr ON pr.id = pri.request_id
      WHERE pri.id = quotes.purchase_request_item_id
        AND has_project_access(auth.uid(), pr.project_id)
    )
  );
CREATE POLICY quotes_insert
  ON public.quotes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM purchase_request_items pri
      JOIN project_purchase_requests pr ON pr.id = pri.request_id
      WHERE pri.id = quotes.purchase_request_item_id
        AND has_project_access(auth.uid(), pr.project_id)
    )
  );
CREATE POLICY quotes_update
  ON public.quotes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM purchase_request_items pri
      JOIN project_purchase_requests pr ON pr.id = pri.request_id
      WHERE pri.id = quotes.purchase_request_item_id
        AND has_project_admin_access(auth.uid(), pr.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM purchase_request_items pri
      JOIN project_purchase_requests pr ON pr.id = pri.request_id
      WHERE pri.id = quotes.purchase_request_item_id
        AND has_project_admin_access(auth.uid(), pr.project_id)
    )
  );
CREATE POLICY quotes_delete
  ON public.quotes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM purchase_request_items pri
      JOIN project_purchase_requests pr ON pr.id = pri.request_id
      WHERE pri.id = quotes.purchase_request_item_id
        AND has_project_admin_access(auth.uid(), pr.project_id)
    )
  );

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='quote_requests' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.quote_requests', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY quote_requests_select
  ON public.quote_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM project_purchase_requests pr
      WHERE pr.id = quote_requests.purchase_request_id
        AND has_project_access(auth.uid(), pr.project_id)
    )
  );
CREATE POLICY quote_requests_insert
  ON public.quote_requests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM project_purchase_requests pr
      WHERE pr.id = quote_requests.purchase_request_id
        AND has_project_access(auth.uid(), pr.project_id)
    )
  );
CREATE POLICY quote_requests_update
  ON public.quote_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM project_purchase_requests pr
      WHERE pr.id = quote_requests.purchase_request_id
        AND has_project_admin_access(auth.uid(), pr.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM project_purchase_requests pr
      WHERE pr.id = quote_requests.purchase_request_id
        AND has_project_admin_access(auth.uid(), pr.project_id)
    )
  );
CREATE POLICY quote_requests_delete
  ON public.quote_requests
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM project_purchase_requests pr
      WHERE pr.id = quote_requests.purchase_request_id
        AND has_project_admin_access(auth.uid(), pr.project_id)
    )
  );

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='recurring_expense_patterns' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.recurring_expense_patterns', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.recurring_expense_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY recurring_expense_patterns_select
  ON public.recurring_expense_patterns
  FOR SELECT
  USING (has_project_access(auth.uid(), project_id));
CREATE POLICY recurring_expense_patterns_insert
  ON public.recurring_expense_patterns
  FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id));
CREATE POLICY recurring_expense_patterns_update
  ON public.recurring_expense_patterns
  FOR UPDATE
  USING (has_project_access(auth.uid(), project_id))
  WITH CHECK (has_project_access(auth.uid(), project_id));
CREATE POLICY recurring_expense_patterns_delete
  ON public.recurring_expense_patterns
  FOR DELETE
  USING (has_project_admin_access(auth.uid(), project_id));

COMMIT;
