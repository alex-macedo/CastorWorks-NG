-- ============================================================================
-- CastorWorks Finance Module - Simplified for Existing Schema
-- Migration: 20260207000001
-- Description: Creates 8 financial tables aligned with existing RLS patterns
-- Uses has_project_access() and has_role() helpers from existing schema
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. FINANCIAL_ACCOUNTS (Admin-only, no company scoping for now)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('checking', 'savings', 'credit_card', 'cash', 'investment')),
  bank_name text,
  account_number text,
  agency text,
  current_balance numeric(15,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_accounts_active ON public.financial_accounts(is_active);

ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view financial accounts"
  ON public.financial_accounts FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert financial accounts"
  ON public.financial_accounts FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update financial accounts"
  ON public.financial_accounts FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete financial accounts"
  ON public.financial_accounts FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 2. FINANCIAL_AR_INVOICES (Project-scoped)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_ar_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  client_name text NOT NULL,
  issue_date date NOT NULL,
  due_date date NOT NULL,
  total_amount numeric(15,2) NOT NULL,
  amount_paid numeric(15,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  status text NOT NULL CHECK (status IN ('draft', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue', 'cancelled', 'disputed')),
  collection_stage integer NOT NULL DEFAULT 0,
  days_overdue integer NOT NULL DEFAULT 0,
  late_payment_probability numeric(5,2),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ar_invoices_project ON public.financial_ar_invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_status ON public.financial_ar_invoices(status);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_due_date ON public.financial_ar_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_overdue ON public.financial_ar_invoices(days_overdue) WHERE days_overdue > 0;

ALTER TABLE public.financial_ar_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view AR invoices for accessible projects"
  ON public.financial_ar_invoices FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can insert AR invoices for accessible projects"
  ON public.financial_ar_invoices FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can update AR invoices for accessible projects"
  ON public.financial_ar_invoices FOR UPDATE
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Only admins can delete AR invoices"
  ON public.financial_ar_invoices FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 3. FINANCIAL_AP_BILLS (Project-scoped)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_ap_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  bill_number text NOT NULL,
  vendor_name text NOT NULL,
  vendor_cnpj text,
  issue_date date NOT NULL,
  due_date date NOT NULL,
  total_amount numeric(15,2) NOT NULL,
  amount_paid numeric(15,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'scheduled', 'partially_paid', 'paid', 'overdue', 'cancelled', 'disputed')),
  risk_score numeric(5,2),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ap_bills_project ON public.financial_ap_bills(project_id);
CREATE INDEX IF NOT EXISTS idx_ap_bills_status ON public.financial_ap_bills(status);
CREATE INDEX IF NOT EXISTS idx_ap_bills_due_date ON public.financial_ap_bills(due_date);
CREATE INDEX IF NOT EXISTS idx_ap_bills_vendor ON public.financial_ap_bills(vendor_cnpj) WHERE vendor_cnpj IS NOT NULL;

ALTER TABLE public.financial_ap_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view AP bills for accessible projects"
  ON public.financial_ap_bills FOR SELECT
  USING (project_id IS NULL OR has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can insert AP bills for accessible projects"
  ON public.financial_ap_bills FOR INSERT
  WITH CHECK (project_id IS NULL OR has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can update AP bills for accessible projects"
  ON public.financial_ap_bills FOR UPDATE
  USING (project_id IS NULL OR has_project_access(auth.uid(), project_id));

CREATE POLICY "Only admins can delete AP bills"
  ON public.financial_ap_bills FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 4. FINANCIAL_PAYMENT_EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ar_invoice_id uuid REFERENCES public.financial_ar_invoices(id) ON DELETE CASCADE,
  ap_bill_id uuid REFERENCES public.financial_ap_bills(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  payment_date date NOT NULL,
  amount numeric(15,2) NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  payment_method text,
  reference_number text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_direction_check CHECK (
    (ar_invoice_id IS NOT NULL AND ap_bill_id IS NULL) OR
    (ar_invoice_id IS NULL AND ap_bill_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_payment_events_ar ON public.financial_payment_events(ar_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_ap ON public.financial_payment_events(ap_bill_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_account ON public.financial_payment_events(account_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_date ON public.financial_payment_events(payment_date);

ALTER TABLE public.financial_payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment events through invoice/bill access"
  ON public.financial_payment_events FOR SELECT
  USING (
    (ar_invoice_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.financial_ar_invoices ar
      WHERE ar.id = financial_payment_events.ar_invoice_id
      AND has_project_access(auth.uid(), ar.project_id)
    )) OR
    (ap_bill_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.financial_ap_bills ap
      WHERE ap.id = financial_payment_events.ap_bill_id
      AND (ap.project_id IS NULL OR has_project_access(auth.uid(), ap.project_id))
    ))
  );

CREATE POLICY "Users can insert payment events for accessible records"
  ON public.financial_payment_events FOR INSERT
  WITH CHECK (
    (ar_invoice_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.financial_ar_invoices ar
      WHERE ar.id = financial_payment_events.ar_invoice_id
      AND has_project_access(auth.uid(), ar.project_id)
    )) OR
    (ap_bill_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.financial_ap_bills ap
      WHERE ap.id = financial_payment_events.ap_bill_id
      AND (ap.project_id IS NULL OR has_project_access(auth.uid(), ap.project_id))
    ))
  );

CREATE POLICY "Only admins can delete payment events"
  ON public.financial_payment_events FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 5. FINANCIAL_RECONCILIATION_ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_reconciliation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.financial_accounts(id) ON DELETE CASCADE,
  transaction_date date NOT NULL,
  description text NOT NULL,
  amount numeric(15,2) NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  reconciled boolean NOT NULL DEFAULT false,
  reconciled_at timestamptz,
  reconciled_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_account ON public.financial_reconciliation_items(account_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_status ON public.financial_reconciliation_items(reconciled);
CREATE INDEX IF NOT EXISTS idx_reconciliation_date ON public.financial_reconciliation_items(transaction_date);

ALTER TABLE public.financial_reconciliation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can access reconciliation items"
  ON public.financial_reconciliation_items FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 6. FINANCIAL_CASHFLOW_SNAPSHOTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_cashflow_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  week_number integer NOT NULL,
  projected_inflow numeric(15,2) NOT NULL DEFAULT 0,
  projected_outflow numeric(15,2) NOT NULL DEFAULT 0,
  projected_balance numeric(15,2) NOT NULL,
  confidence_level numeric(5,2) NOT NULL,
  risk_level text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cashflow_project ON public.financial_cashflow_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_cashflow_week ON public.financial_cashflow_snapshots(week_start_date);
CREATE INDEX IF NOT EXISTS idx_cashflow_risk ON public.financial_cashflow_snapshots(risk_level);

ALTER TABLE public.financial_cashflow_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cashflow for accessible projects"
  ON public.financial_cashflow_snapshots FOR SELECT
  USING (project_id IS NULL OR has_project_access(auth.uid(), project_id));

CREATE POLICY "Only admins can modify cashflow snapshots"
  ON public.financial_cashflow_snapshots FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 7. FINANCIAL_AI_ACTION_QUEUE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_ai_action_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('collection_reminder', 'payment_schedule', 'cashflow_alert', 'margin_warning', 'reconciliation_match', 'budget_reallocation', 'risk_escalation')),
  action_mode text NOT NULL DEFAULT 'approval_required' CHECK (action_mode IN ('advice_only', 'approval_required', 'semi_auto')),
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'rejected', 'executing', 'completed', 'failed', 'expired')),
  risk_level text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  rationale text NOT NULL,
  proposed_action text,
  estimated_impact numeric(15,2),
  confidence_score numeric(5,2),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  rejected_by uuid REFERENCES auth.users(id),
  rejected_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_queue_project ON public.financial_ai_action_queue(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_queue_status ON public.financial_ai_action_queue(status);
CREATE INDEX IF NOT EXISTS idx_ai_queue_type ON public.financial_ai_action_queue(action_type);
CREATE INDEX IF NOT EXISTS idx_ai_queue_risk ON public.financial_ai_action_queue(risk_level);

ALTER TABLE public.financial_ai_action_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view AI actions for accessible projects"
  ON public.financial_ai_action_queue FOR SELECT
  USING (project_id IS NULL OR has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can approve/reject AI actions for accessible projects"
  ON public.financial_ai_action_queue FOR UPDATE
  USING (project_id IS NULL OR has_project_access(auth.uid(), project_id));

CREATE POLICY "Only admins can insert AI actions"
  ON public.financial_ai_action_queue FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete AI actions"
  ON public.financial_ai_action_queue FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 8. FINANCIAL_AI_ACTION_LOGS (Immutable audit trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_ai_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES public.financial_ai_action_queue(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('proposed', 'approved', 'rejected', 'executing', 'completed', 'failed', 'expired')),
  actor_id uuid REFERENCES auth.users(id),
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_action ON public.financial_ai_action_logs(action_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_event ON public.financial_ai_action_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created ON public.financial_ai_action_logs(created_at);

ALTER TABLE public.financial_ai_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs for accessible actions"
  ON public.financial_ai_action_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.financial_ai_action_queue q
      WHERE q.id = financial_ai_action_logs.action_id
      AND (q.project_id IS NULL OR has_project_access(auth.uid(), q.project_id))
    )
  );

CREATE POLICY "Only admins can insert audit logs"
  ON public.financial_ai_action_logs FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Block UPDATE and DELETE on audit logs (immutable)
CREATE POLICY "No one can update audit logs"
  ON public.financial_ai_action_logs FOR UPDATE
  USING (false);

CREATE POLICY "No one can delete audit logs"
  ON public.financial_ai_action_logs FOR DELETE
  USING (false);

COMMIT;
