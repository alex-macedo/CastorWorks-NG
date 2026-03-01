-- Story 3.4: Add sent tracking fields to purchase_orders table
-- Epic 3: Purchase Order Generation & Supplier Communication
--
-- This migration adds fields to track when and by whom a PO was sent to the supplier

-- Add sent_at timestamp field
ALTER TABLE public.purchase_orders
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- Add sent_by user ID field
ALTER TABLE public.purchase_orders
ADD COLUMN IF NOT EXISTS sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for sent_at for efficient querying
CREATE INDEX IF NOT EXISTS idx_purchase_orders_sent_at
ON public.purchase_orders(sent_at);

-- Add index for sent_by for efficient querying
CREATE INDEX IF NOT EXISTS idx_purchase_orders_sent_by
ON public.purchase_orders(sent_by);

-- Add comments
COMMENT ON COLUMN public.purchase_orders.sent_at IS 'Timestamp when PO was sent to supplier via email';
COMMENT ON COLUMN public.purchase_orders.sent_by IS 'User ID of project manager who sent the PO';

-- Verification query
-- SELECT id, purchase_order_number, status, sent_at, sent_by FROM public.purchase_orders LIMIT 5;
