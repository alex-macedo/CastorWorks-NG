-- Story 4.8: Create Payment Transactions Table
-- Epic 4: Delivery Confirmation & Payment Processing
--
-- This migration creates the payment_transactions table to track supplier payments
-- and automatically creates payment records when deliveries are confirmed.

-- ============================================================================
-- 1. Create Payment Transactions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  delivery_confirmation_id UUID REFERENCES public.delivery_confirmations(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Financial Information
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency_id TEXT NOT NULL DEFAULT 'BRL',

  -- Payment Terms and Scheduling
  payment_terms TEXT NOT NULL DEFAULT 'Net 30',
  -- Examples: 'Net 30', 'Net 60', 'Net 90', 'Immediate', 'Net 15'
  due_date DATE NOT NULL,

  -- Payment Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'scheduled', 'processing', 'completed', 'failed', 'cancelled')),

  -- Payment Execution Details
  payment_method TEXT,
  -- Examples: 'Bank Transfer', 'Check', 'Credit Card', 'Other'
  transaction_reference TEXT, -- External payment ID or reference number
  paid_at TIMESTAMPTZ,

  -- Notes and Documentation
  notes TEXT,
  receipt_url TEXT, -- URL to uploaded receipt/proof of payment

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Validation Constraints
  CONSTRAINT valid_payment_date CHECK (
    paid_at IS NULL OR paid_at >= created_at
  ),
  CONSTRAINT valid_completed_payment CHECK (
    (status != 'completed' OR (paid_at IS NOT NULL))
  ),
  CONSTRAINT valid_failed_payment CHECK (
    (status != 'failed' OR notes IS NOT NULL)
  ),
  CONSTRAINT valid_due_date CHECK (
    due_date >= CURRENT_DATE - INTERVAL '1 year'
  )
);

-- Add comment on table
COMMENT ON TABLE public.payment_transactions IS 'Tracks supplier payment obligations, due dates, and execution status';

-- Add column comments
COMMENT ON COLUMN public.payment_transactions.payment_terms IS 'Payment terms from supplier (e.g., Net 30, Net 60, Immediate)';
COMMENT ON COLUMN public.payment_transactions.due_date IS 'Calculated payment due date based on delivery date and payment terms';
COMMENT ON COLUMN public.payment_transactions.transaction_reference IS 'External payment system reference or transaction ID';
COMMENT ON COLUMN public.payment_transactions.receipt_url IS 'URL to payment receipt or proof of payment document';

-- ============================================================================
-- 2. Create Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_payment_transactions_po_id ON public.payment_transactions(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_delivery_id ON public.payment_transactions(delivery_confirmation_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_project_id ON public.payment_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_due_date ON public.payment_transactions(due_date) WHERE status IN ('pending', 'scheduled');
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON public.payment_transactions(created_at DESC);

-- Composite index for payment dashboard queries
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status_due_date ON public.payment_transactions(status, due_date)
  WHERE status IN ('pending', 'scheduled');

-- ============================================================================
-- 3. Create Trigger for Updated At Timestamp
-- ============================================================================

DROP TRIGGER IF EXISTS update_payment_transactions_updated_at ON public.payment_transactions;

CREATE TRIGGER update_payment_transactions_updated_at
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 4. Create Function to Calculate Payment Due Date
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_payment_due_date(
  p_delivery_date DATE,
  p_payment_terms TEXT
)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_days INTEGER;
  v_due_date DATE;
BEGIN
  -- Parse payment terms to extract number of days
  -- Supports: 'Net 30', 'Net 60', 'Net 90', 'Net 15', 'Immediate', etc.

  IF p_payment_terms IS NULL THEN
    -- Default to 30 days if no terms specified
    v_days := 30;
  ELSIF LOWER(p_payment_terms) = 'immediate' OR LOWER(p_payment_terms) = 'due on receipt' THEN
    v_days := 0;
  ELSIF p_payment_terms ~* '^net\s*(\d+)' THEN
    -- Extract number from "Net XX" format
    v_days := (regexp_match(p_payment_terms, '(\d+)', 'i'))[1]::INTEGER;
  ELSE
    -- Default to 30 days for unknown formats
    v_days := 30;
  END IF;

  v_due_date := p_delivery_date + (v_days || ' days')::INTERVAL;

  RETURN v_due_date;
END;
$$;

COMMENT ON FUNCTION public.calculate_payment_due_date IS 'Calculates payment due date based on delivery date and payment terms (e.g., Net 30)';

-- ============================================================================
-- 5. Create Function to Calculate Payment Amount
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_payment_amount(
  p_purchase_order_id UUID,
  p_delivery_confirmation_id UUID
)
RETURNS NUMERIC(12, 2)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_po_total NUMERIC(12, 2);
  v_delivery_status TEXT;
  v_delivery_percentage INTEGER;
  v_payment_amount NUMERIC(12, 2);
BEGIN
  -- Get PO total amount
  SELECT total_amount INTO v_po_total
  FROM public.purchase_orders
  WHERE id = p_purchase_order_id;

  IF v_po_total IS NULL THEN
    RAISE EXCEPTION 'Purchase order not found: %', p_purchase_order_id;
  END IF;

  -- If no delivery confirmation, payment is for full PO amount
  IF p_delivery_confirmation_id IS NULL THEN
    RETURN v_po_total;
  END IF;

  -- Get delivery status and percentage from metadata
  SELECT
    metadata->>'delivery_status',
    (metadata->>'delivery_percentage')::INTEGER
  INTO v_delivery_status, v_delivery_percentage
  FROM public.delivery_confirmations
  WHERE id = p_delivery_confirmation_id;

  -- Calculate pro-rated amount for partial deliveries
  IF v_delivery_status = 'partial' AND v_delivery_percentage IS NOT NULL THEN
    v_payment_amount := v_po_total * (v_delivery_percentage::NUMERIC / 100);
  ELSIF v_delivery_status = 'rejected' THEN
    v_payment_amount := 0;
  ELSE
    -- Full delivery
    v_payment_amount := v_po_total;
  END IF;

  RETURN v_payment_amount;
END;
$$;

COMMENT ON FUNCTION public.calculate_payment_amount IS 'Calculates payment amount based on delivery status (full/partial/rejected)';

-- ============================================================================
-- 6. Create Function to Auto-Create Payment Transaction on Delivery
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_payment_on_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_terms TEXT;
  v_due_date DATE;
  v_amount NUMERIC(12, 2);
  v_currency TEXT;
  v_delivery_status TEXT;
BEGIN
  -- Get delivery status from metadata
  v_delivery_status := NEW.metadata->>'delivery_status';

  -- Don't create payment for rejected deliveries
  IF v_delivery_status = 'rejected' THEN
    RETURN NEW;
  END IF;

  -- Get PO payment terms and currency
  SELECT payment_terms, currency_id
  INTO v_payment_terms, v_currency
  FROM public.purchase_orders
  WHERE id = NEW.purchase_order_id;

  -- Calculate due date based on delivery date and payment terms
  v_due_date := public.calculate_payment_due_date(NEW.delivery_date, v_payment_terms);

  -- Calculate payment amount (pro-rated for partial deliveries)
  v_amount := public.calculate_payment_amount(NEW.purchase_order_id, NEW.id);

  -- Skip if amount is zero
  IF v_amount <= 0 THEN
    RETURN NEW;
  END IF;

  -- Create payment transaction
  INSERT INTO public.payment_transactions (
    purchase_order_id,
    delivery_confirmation_id,
    project_id,
    amount,
    currency_id,
    payment_terms,
    due_date,
    status,
    created_by,
    metadata
  ) VALUES (
    NEW.purchase_order_id,
    NEW.id,
    NEW.project_id,
    v_amount,
    v_currency,
    v_payment_terms,
    v_due_date,
    'pending',
    NEW.confirmed_by_user_id,
    jsonb_build_object(
      'delivery_status', v_delivery_status,
      'auto_created', true,
      'created_from_delivery', NEW.id
    )
  );

  -- Log activity
  INSERT INTO public.project_activities (
    project_id,
    activity_type,
    description,
    metadata
  ) VALUES (
    NEW.project_id,
    'payment_transaction_created',
    'Payment transaction created for delivery confirmation',
    jsonb_build_object(
      'delivery_confirmation_id', NEW.id,
      'purchase_order_id', NEW.purchase_order_id,
      'amount', v_amount,
      'currency', v_currency,
      'due_date', v_due_date,
      'payment_terms', v_payment_terms
    )
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.create_payment_on_delivery() IS 'Automatically creates payment transaction when delivery is confirmed';

DROP TRIGGER IF EXISTS trigger_create_payment_on_delivery ON public.delivery_confirmations;

CREATE TRIGGER trigger_create_payment_on_delivery
AFTER INSERT ON public.delivery_confirmations
FOR EACH ROW
EXECUTE FUNCTION public.create_payment_on_delivery();

-- ============================================================================
-- 7. Enable Row Level Security
-- ============================================================================

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 8. Create RLS Policies
-- ============================================================================

DROP POLICY IF EXISTS "Admins and accountants can view all payments" ON public.payment_transactions;
DROP POLICY IF EXISTS "Project managers can view their project payments" ON public.payment_transactions;
DROP POLICY IF EXISTS "Admins and accountants can create payments" ON public.payment_transactions;
DROP POLICY IF EXISTS "Admins and accountants can update payments" ON public.payment_transactions;
DROP POLICY IF EXISTS "Admins can delete payments" ON public.payment_transactions;

DROP POLICY IF EXISTS "Project members can view payments" ON public.payment_transactions;
DROP POLICY IF EXISTS "Finance roles can audit payments" ON public.payment_transactions;
DROP POLICY IF EXISTS "Project admins can create payments" ON public.payment_transactions;
DROP POLICY IF EXISTS "Project admins can update payments" ON public.payment_transactions;
DROP POLICY IF EXISTS "Project admins can delete payments" ON public.payment_transactions;

-- Project scoped readers
CREATE POLICY "Project members can view payments"
ON public.payment_transactions
FOR SELECT
USING (
  public.has_project_access(auth.uid(), project_id)
);

-- Finance roles retain global read access
CREATE POLICY "Finance roles can audit payments"
ON public.payment_transactions
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'accountant'::app_role)
);

-- Project scoped creators
CREATE POLICY "Project admins can create payments"
ON public.payment_transactions
FOR INSERT
WITH CHECK (
  public.has_project_admin_access(auth.uid(), project_id)
);

-- Project scoped updates
CREATE POLICY "Project admins can update payments"
ON public.payment_transactions
FOR UPDATE
USING (
  public.has_project_admin_access(auth.uid(), project_id)
)
WITH CHECK (
  public.has_project_admin_access(auth.uid(), project_id)
);

-- Project scoped deletes
CREATE POLICY "Project admins can delete payments"
ON public.payment_transactions
FOR DELETE
USING (
  public.has_project_admin_access(auth.uid(), project_id)
);

-- ============================================================================
-- 9. Grant Permissions
-- ============================================================================

GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT INSERT, UPDATE ON public.payment_transactions TO authenticated;
GRANT DELETE ON public.payment_transactions TO service_role;

GRANT EXECUTE ON FUNCTION public.calculate_payment_due_date TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_payment_amount TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_payment_on_delivery TO authenticated;

-- ============================================================================
-- 10. Create View for Payment Dashboard
-- ============================================================================

CREATE OR REPLACE VIEW public.payment_dashboard_view AS
SELECT
  pt.id,
  pt.purchase_order_id,
  pt.delivery_confirmation_id,
  pt.project_id,
  pt.amount,
  pt.currency_id,
  pt.payment_terms,
  pt.due_date,
  pt.status,
  pt.payment_method,
  pt.transaction_reference,
  pt.paid_at,
  pt.created_at,
  -- Calculate days until due
  pt.due_date - CURRENT_DATE AS days_until_due,
  -- Determine if overdue
  CASE
    WHEN pt.status IN ('completed', 'cancelled') THEN FALSE
    WHEN pt.due_date < CURRENT_DATE THEN TRUE
    ELSE FALSE
  END AS is_overdue,
  -- Alert level (red, orange, yellow, green)
  CASE
    WHEN pt.status IN ('completed', 'cancelled') THEN 'none'
    WHEN pt.due_date < CURRENT_DATE THEN 'red'
    WHEN pt.due_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'orange'
    WHEN pt.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'yellow'
    ELSE 'green'
  END AS alert_level,
  -- Join with related tables
  po.purchase_order_number,
  po.supplier_id,
  s.name AS supplier_name,
  s.email AS supplier_email,
  NULL::text AS project_name,
  NULL::uuid AS project_manager_id
FROM public.payment_transactions pt
INNER JOIN public.purchase_orders po ON pt.purchase_order_id = po.id
INNER JOIN public.suppliers s ON po.supplier_id = s.id
INNER JOIN public.projects p ON pt.project_id = p.id;

COMMENT ON VIEW public.payment_dashboard_view IS 'Enriched payment data for dashboard with calculated fields and alert levels';

-- Grant access to view
GRANT SELECT ON public.payment_dashboard_view TO authenticated;
