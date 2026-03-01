-- Story 3.1: Create Purchase Orders Table
-- Epic 3: Purchase Order Generation & Supplier Communication
--
-- This migration creates the purchase_orders table and related infrastructure
-- for tracking purchase orders generated from approved quotes.

-- ============================================================================
-- 1. Create Purchase Orders Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Purchase Order Number (unique, auto-generated)
  purchase_order_number TEXT UNIQUE NOT NULL,

  -- Foreign Keys
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE RESTRICT,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  purchase_request_id UUID NOT NULL REFERENCES public.project_purchase_requests(id) ON DELETE CASCADE,

  -- Financial Information
  subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  tax_amount NUMERIC(12, 2) DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  currency_id TEXT NOT NULL DEFAULT 'BRL',

  -- Payment Terms
  payment_terms TEXT,
  payment_due_date DATE,

  -- Delivery Information
  delivery_address TEXT,
  delivery_instructions TEXT,
  expected_delivery_date DATE,
  actual_delivery_date DATE,

  -- Status and Workflow
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'acknowledged', 'in_transit', 'delivered', 'cancelled', 'disputed')),

  -- Communication Timestamps
  sent_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  acknowledgment_method TEXT, -- 'email', 'whatsapp', 'manual'

  -- Document Management
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,
  document_version INTEGER DEFAULT 1,

  -- Terms and Notes
  terms_and_conditions TEXT,
  special_instructions TEXT,
  notes TEXT,

  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Metadata for extensibility
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Additional validation constraints
  CONSTRAINT valid_delivery_dates CHECK (
    actual_delivery_date IS NULL OR
    expected_delivery_date IS NULL OR
    actual_delivery_date >= expected_delivery_date - INTERVAL '30 days'
  ),
  CONSTRAINT valid_acknowledgment CHECK (
    (status != 'acknowledged' OR acknowledged_at IS NOT NULL) AND
    (acknowledged_at IS NULL OR sent_at IS NOT NULL)
  ),
  CONSTRAINT valid_cancellation CHECK (
    (status != 'cancelled' OR (cancelled_at IS NOT NULL AND cancellation_reason IS NOT NULL)) AND
    (cancelled_at IS NULL OR cancellation_reason IS NOT NULL)
  )
);

-- Add comment on table
COMMENT ON TABLE public.purchase_orders IS 'Stores purchase orders generated from approved quotes';

-- ============================================================================
-- 2. Create Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_purchase_orders_project_id ON public.purchase_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_quote_id ON public.purchase_orders(quote_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_purchase_request_id ON public.purchase_orders(purchase_request_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_at ON public.purchase_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_sent_at ON public.purchase_orders(sent_at DESC) WHERE sent_at IS NOT NULL;

-- ============================================================================
-- 3. Create Helper Function for PO Number Generation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_po_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_number INTEGER;
  po_number TEXT;
  max_attempts INTEGER := 10;
  attempt INTEGER := 0;
BEGIN
  LOOP
    -- Get next sequential number based on current year
    SELECT COALESCE(
      MAX(
        CAST(
          SUBSTRING(
            purchase_order_number
            FROM 'PO-' || TO_CHAR(NOW(), 'YYYY') || '-(\d+)'
          ) AS INTEGER
        )
      ), 0
    ) + 1
    INTO next_number
    FROM public.purchase_orders
    WHERE purchase_order_number LIKE 'PO-' || TO_CHAR(NOW(), 'YYYY') || '-%';

    -- Format: PO-2025-000001
    po_number := 'PO-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(next_number::TEXT, 6, '0');

    -- Try to use this number (handle race conditions)
    BEGIN
      -- Test if number already exists
      PERFORM 1 FROM public.purchase_orders WHERE purchase_order_number = po_number;
      IF NOT FOUND THEN
        RETURN po_number;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Continue to next attempt
      NULL;
    END;

    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique PO number after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.generate_po_number() IS 'Generates a unique purchase order number in format PO-YYYY-000001';

-- ============================================================================
-- 4. Create Trigger for Updated At Timestamp
-- ============================================================================

DROP TRIGGER IF EXISTS update_purchase_orders_updated_at ON public.purchase_orders;
CREATE TRIGGER update_purchase_orders_updated_at
BEFORE UPDATE ON public.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 5. Create Function to Auto-Set PO Number
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_po_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only set PO number if not provided
  IF NEW.purchase_order_number IS NULL OR NEW.purchase_order_number = '' THEN
    NEW.purchase_order_number := public.generate_po_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_purchase_order_number ON public.purchase_orders;
CREATE TRIGGER set_purchase_order_number
BEFORE INSERT ON public.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_po_number();

-- ============================================================================
-- 6. Enable Row Level Security
-- ============================================================================

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. Create RLS Policies
-- ============================================================================

DROP POLICY IF EXISTS "Project managers can view their project purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Project managers can create purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Project managers can update their purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Admins can delete purchase orders" ON public.purchase_orders;

DROP POLICY IF EXISTS "Project scoped purchase order read" ON public.purchase_orders;
DROP POLICY IF EXISTS "Project admins can create purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Project admins can update purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Project admins can delete purchase orders" ON public.purchase_orders;

-- Policy: Project members can view purchase orders they have access to
CREATE POLICY "Project scoped purchase order read"
ON public.purchase_orders
FOR SELECT
USING (
  public.has_project_access(auth.uid(), project_id)
);

-- Policy: Project admins can create purchase orders
CREATE POLICY "Project admins can create purchase orders"
ON public.purchase_orders
FOR INSERT
WITH CHECK (
  public.has_project_admin_access(auth.uid(), project_id)
);

-- Policy: Project admins can update purchase orders
CREATE POLICY "Project admins can update purchase orders"
ON public.purchase_orders
FOR UPDATE
USING (
  public.has_project_admin_access(auth.uid(), project_id)
)
WITH CHECK (
  public.has_project_admin_access(auth.uid(), project_id)
);

-- Policy: Project admins can delete purchase orders
CREATE POLICY "Project admins can delete purchase orders"
ON public.purchase_orders
FOR DELETE
USING (
  public.has_project_admin_access(auth.uid(), project_id)
);

-- ============================================================================
-- 8. Grant Permissions
-- ============================================================================

-- Grant usage on the table
GRANT SELECT, INSERT, UPDATE ON public.purchase_orders TO authenticated;
GRANT DELETE ON public.purchase_orders TO service_role;

-- Grant execute permission on helper functions
GRANT EXECUTE ON FUNCTION public.generate_po_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_po_number() TO authenticated;
