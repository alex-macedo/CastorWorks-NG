-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_number TEXT NOT NULL UNIQUE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  currency_id TEXT NOT NULL DEFAULT 'BRL',
  payment_terms TEXT DEFAULT 'Net 30',
  status TEXT NOT NULL DEFAULT 'draft',
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ
);

-- Create delivery_confirmations table
CREATE TABLE IF NOT EXISTS public.delivery_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  delivery_date DATE NOT NULL,
  delivered_by TEXT,
  received_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  delivery_status TEXT NOT NULL DEFAULT 'full',
  notes TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  delivery_confirmation_id UUID REFERENCES public.delivery_confirmations(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL,
  currency_id TEXT NOT NULL DEFAULT 'BRL',
  payment_terms TEXT DEFAULT 'Net 30',
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  transaction_reference TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_project_id ON public.purchase_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_at ON public.purchase_orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_confirmations_po_id ON public.delivery_confirmations(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_confirmations_delivery_date ON public.delivery_confirmations(delivery_date);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_po_id ON public.payment_transactions(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_project_id ON public.payment_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_due_date ON public.payment_transactions(due_date);

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_purchase_orders_updated_at ON public.purchase_orders;
CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_delivery_confirmations_updated_at ON public.delivery_confirmations;
CREATE TRIGGER update_delivery_confirmations_updated_at
  BEFORE UPDATE ON public.delivery_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_transactions_updated_at ON public.payment_transactions;
CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for purchase_orders, delivery_confirmations, and payment_transactions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'purchase_orders'
  ) THEN
    DROP POLICY IF EXISTS "Users can view purchase orders for accessible projects" ON public.purchase_orders;
    DROP POLICY IF EXISTS "Admins and PMs can insert purchase orders" ON public.purchase_orders;
    DROP POLICY IF EXISTS "Admins and PMs can update purchase orders" ON public.purchase_orders;
    DROP POLICY IF EXISTS "Admins can delete purchase orders" ON public.purchase_orders;

    EXECUTE '
      CREATE POLICY "Users can view purchase orders for accessible projects"
      ON public.purchase_orders
      FOR SELECT
      USING (has_project_access(auth.uid(), project_id))
    ';

    EXECUTE '
      CREATE POLICY "Admins and PMs can insert purchase orders"
      ON public.purchase_orders
      FOR INSERT
      WITH CHECK (
        (has_role(auth.uid(), ''admin'') OR has_role(auth.uid(), ''project_manager''))
        AND has_project_access(auth.uid(), project_id)
      )
    ';

    EXECUTE '
      CREATE POLICY "Admins and PMs can update purchase orders"
      ON public.purchase_orders
      FOR UPDATE
      USING (
        (has_role(auth.uid(), ''admin'') OR has_role(auth.uid(), ''project_manager''))
        AND has_project_access(auth.uid(), project_id)
      )
    ';

    EXECUTE '
      CREATE POLICY "Admins can delete purchase orders"
      ON public.purchase_orders
      FOR DELETE
      USING (has_role(auth.uid(), ''admin'') AND has_project_access(auth.uid(), project_id))
    ';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'delivery_confirmations'
  ) THEN
    DROP POLICY IF EXISTS "Users can view delivery confirmations for accessible projects" ON public.delivery_confirmations;
    DROP POLICY IF EXISTS "Admins, PMs, and supervisors can insert delivery confirmations" ON public.delivery_confirmations;
    DROP POLICY IF EXISTS "Admins and PMs can update delivery confirmations" ON public.delivery_confirmations;
    DROP POLICY IF EXISTS "Admins can delete delivery confirmations" ON public.delivery_confirmations;

    EXECUTE '
      CREATE POLICY "Users can view delivery confirmations for accessible projects"
      ON public.delivery_confirmations
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.purchase_orders po
          WHERE po.id = delivery_confirmations.purchase_order_id
            AND has_project_access(auth.uid(), po.project_id)
        )
      )
    ';

    EXECUTE '
      CREATE POLICY "Admins, PMs, and supervisors can insert delivery confirmations"
      ON public.delivery_confirmations
      FOR INSERT
      WITH CHECK (
        (has_role(auth.uid(), ''admin'') OR has_role(auth.uid(), ''project_manager'') OR has_role(auth.uid(), ''site_supervisor''))
        AND EXISTS (
          SELECT 1 FROM public.purchase_orders po
          WHERE po.id = delivery_confirmations.purchase_order_id
            AND has_project_access(auth.uid(), po.project_id)
        )
      )
    ';

    EXECUTE '
      CREATE POLICY "Admins and PMs can update delivery confirmations"
      ON public.delivery_confirmations
      FOR UPDATE
      USING (
        (has_role(auth.uid(), ''admin'') OR has_role(auth.uid(), ''project_manager''))
        AND EXISTS (
          SELECT 1 FROM public.purchase_orders po
          WHERE po.id = delivery_confirmations.purchase_order_id
            AND has_project_access(auth.uid(), po.project_id)
        )
      )
    ';

    EXECUTE '
      CREATE POLICY "Admins can delete delivery confirmations"
      ON public.delivery_confirmations
      FOR DELETE
      USING (
        has_role(auth.uid(), ''admin'')
        AND EXISTS (
          SELECT 1 FROM public.purchase_orders po
          WHERE po.id = delivery_confirmations.purchase_order_id
            AND has_project_access(auth.uid(), po.project_id)
        )
      )
    ';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'payment_transactions'
  ) THEN
    DROP POLICY IF EXISTS "Users can view payment transactions for accessible projects" ON public.payment_transactions;
    DROP POLICY IF EXISTS "Admins and office staff can insert payment transactions" ON public.payment_transactions;
    DROP POLICY IF EXISTS "Admins and office staff can update payment transactions" ON public.payment_transactions;
    DROP POLICY IF EXISTS "Admins can delete payment transactions" ON public.payment_transactions;

    EXECUTE '
      CREATE POLICY "Users can view payment transactions for accessible projects"
      ON public.payment_transactions
      FOR SELECT
      USING (has_project_access(auth.uid(), project_id))
    ';

    EXECUTE '
      CREATE POLICY "Admins and office staff can insert payment transactions"
      ON public.payment_transactions
      FOR INSERT
      WITH CHECK (
        (has_role(auth.uid(), ''admin'') OR has_role(auth.uid(), ''admin_office'') OR has_role(auth.uid(), ''accountant''))
        AND has_project_access(auth.uid(), project_id)
      )
    ';

    EXECUTE '
      CREATE POLICY "Admins and office staff can update payment transactions"
      ON public.payment_transactions
      FOR UPDATE
      USING (
        (has_role(auth.uid(), ''admin'') OR has_role(auth.uid(), ''admin_office'') OR has_role(auth.uid(), ''accountant''))
        AND has_project_access(auth.uid(), project_id)
      )
    ';

    EXECUTE '
      CREATE POLICY "Admins can delete payment transactions"
      ON public.payment_transactions
      FOR DELETE
      USING (has_role(auth.uid(), ''admin'') AND has_project_access(auth.uid(), project_id))
    ';
  END IF;
END;
$$;
