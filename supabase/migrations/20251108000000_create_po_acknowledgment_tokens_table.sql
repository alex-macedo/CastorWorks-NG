-- Story 3.9: Create PO Acknowledgment Tokens Table
-- Epic 3: Purchase Order Generation & Supplier Communication
--
-- This migration creates the po_acknowledgment_tokens table for supplier PO acknowledgments

-- ============================================================================
-- 1. Create PO Acknowledgment Tokens Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.po_acknowledgment_tokens (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Key
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,

  -- Token Details
  token TEXT UNIQUE NOT NULL,
  supplier_email TEXT NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  accessed_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,

  -- Acknowledgment Details
  acknowledgment_method TEXT CHECK (acknowledgment_method IN ('link', 'email', 'manual')),
  notes TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Constraints
  CONSTRAINT valid_expiration CHECK (expires_at > created_at),
  CONSTRAINT valid_acknowledgment CHECK (
    (acknowledged_at IS NULL) OR (acknowledged_at >= created_at AND acknowledged_at <= expires_at + INTERVAL '1 day')
  )
);

-- Add comment on table
COMMENT ON TABLE public.po_acknowledgment_tokens IS 'Stores secure tokens for supplier PO acknowledgment';

-- ============================================================================
-- 2. Create Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_po_acknowledgment_tokens_po_id ON public.po_acknowledgment_tokens(purchase_order_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_po_acknowledgment_tokens_token ON public.po_acknowledgment_tokens(token);
CREATE INDEX IF NOT EXISTS idx_po_acknowledgment_tokens_expires_at ON public.po_acknowledgment_tokens(expires_at)
  WHERE acknowledged_at IS NULL;

-- ============================================================================
-- 3. Create Trigger for Updated At
-- ============================================================================

-- Note: This table doesn't need updated_at as tokens are create-once, acknowledge-once

-- ============================================================================
-- 4. Enable Row Level Security
-- ============================================================================

ALTER TABLE public.po_acknowledgment_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. Create RLS Policies
-- ============================================================================

-- Edge function will handle public token validation using service_role
DROP POLICY IF EXISTS "project_scoped_select_tokens" ON public.po_acknowledgment_tokens;
-- Authenticated users can view tokens for their projects
CREATE POLICY "project_scoped_select_tokens"
ON public.po_acknowledgment_tokens
FOR SELECT
TO authenticated
USING (
  purchase_order_id IN (
    SELECT po.id FROM public.purchase_orders po
    WHERE has_project_access(auth.uid(), po.project_id)
  )
);

DROP POLICY IF EXISTS "Service role can manage tokens" ON public.po_acknowledgment_tokens;
-- Only service role can create/update tokens
CREATE POLICY "Service role can manage tokens"
ON public.po_acknowledgment_tokens
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 6. Create Function to Clean Up Expired Tokens
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_po_acknowledgment_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete tokens expired more than 90 days ago
  DELETE FROM public.po_acknowledgment_tokens
  WHERE expires_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_po_acknowledgment_tokens() IS 'Deletes PO acknowledgment tokens expired more than 90 days ago';

-- ============================================================================
-- 7. Grant Permissions
-- ============================================================================

GRANT SELECT ON public.po_acknowledgment_tokens TO anon, authenticated;
GRANT ALL ON public.po_acknowledgment_tokens TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_po_acknowledgment_tokens() TO service_role;
