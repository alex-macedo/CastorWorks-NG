-- Story 2.1: Create approval_tokens Table
-- Epic 2: Customer Approval Portal & Workflow
-- Generated: 2025-11-05
--
-- This migration creates the approval_tokens table for managing secure customer access
-- to quote approval without requiring full user accounts.
--
-- Security Note: Table has public read access (RLS policies in 20251104065737)
-- Token validation and expiration checking happen in Edge Functions.

BEGIN;

-- =====================================================================
-- SECTION 1: Create approval_tokens Table
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.approval_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_request_id UUID NOT NULL REFERENCES public.project_purchase_requests(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accessed_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_approval_tokens_token 
  ON public.approval_tokens(token);

CREATE INDEX IF NOT EXISTS idx_approval_tokens_purchase_request 
  ON public.approval_tokens(purchase_request_id);

CREATE INDEX IF NOT EXISTS idx_approval_tokens_expires_at 
  ON public.approval_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_approval_tokens_customer_email 
  ON public.approval_tokens(customer_email);

-- Enable RLS (policies already exist in 20251104065737_procurement_rls_policies.sql)
ALTER TABLE public.approval_tokens ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- SECTION 2: Helper Function for Generating Secure Tokens
-- =====================================================================

-- Generate cryptographically secure random token (32 characters minimum)
-- Uses gen_random_uuid() for entropy and encodes as base64-like string
CREATE OR REPLACE FUNCTION public.generate_approval_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token_bytes BYTEA;
  token_string TEXT;
BEGIN
  -- Generate 24 random bytes (will be ~32 chars when base64 encoded)
  token_bytes := gen_random_bytes(24);
  
  -- Convert to base64 and remove any special characters that might cause URL issues
  token_string := encode(token_bytes, 'base64');
  token_string := replace(token_string, '/', '_');
  token_string := replace(token_string, '+', '-');
  token_string := replace(token_string, '=', '');
  
  RETURN token_string;
END;
$$;

-- =====================================================================
-- SECTION 3: Cleanup Function for Expired Tokens
-- =====================================================================

-- Delete tokens expired >90 days ago to prevent table bloat
-- Approved tokens are kept for audit purposes
-- Should be run periodically via cron or Edge Function scheduler
CREATE OR REPLACE FUNCTION public.cleanup_expired_approval_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.approval_tokens
  WHERE expires_at < (NOW() - INTERVAL '90 days')
    AND approved_at IS NULL; -- Keep approved tokens for audit trail
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- =====================================================================
-- SECTION 4: Trigger for updated_at Timestamp
-- =====================================================================

DROP TRIGGER IF EXISTS update_approval_tokens_updated_at ON public.approval_tokens;

CREATE TRIGGER update_approval_tokens_updated_at
  BEFORE UPDATE ON public.approval_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- SECTION 5: Helper Function to Check Token Validity
-- =====================================================================

-- Check if a token is valid (exists, not expired, not already approved)
-- Returns token record if valid, NULL if invalid
CREATE OR REPLACE FUNCTION public.validate_approval_token(_token TEXT)
RETURNS TABLE (
  id UUID,
  purchase_request_id UUID,
  customer_email TEXT,
  customer_phone TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  accessed_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  is_valid BOOLEAN,
  validation_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.purchase_request_id,
    t.customer_email,
    t.customer_phone,
    t.expires_at,
    t.accessed_at,
    t.approved_at,
    CASE
      WHEN t.id IS NULL THEN FALSE
      WHEN t.expires_at < NOW() THEN FALSE
      WHEN t.approved_at IS NOT NULL THEN FALSE
      ELSE TRUE
    END AS is_valid,
    CASE
      WHEN t.id IS NULL THEN 'Token not found'
      WHEN t.expires_at < NOW() THEN 'Token has expired'
      WHEN t.approved_at IS NOT NULL THEN 'Quote already approved'
      ELSE 'Token is valid'
    END AS validation_message
  FROM public.approval_tokens t
  WHERE t.token = _token;
END;
$$;

-- =====================================================================
-- SECTION 6: Table Comments for Documentation
-- =====================================================================

COMMENT ON TABLE public.approval_tokens IS 
  'Secure tokens for customer quote approval access. Tokens expire after 7 days and provide public access to quote approval portal without user accounts.';

COMMENT ON COLUMN public.approval_tokens.token IS 
  'Cryptographically secure random token (min 32 chars) for URL access. Generated via generate_approval_token() function.';

COMMENT ON COLUMN public.approval_tokens.purchase_request_id IS 
  'Purchase request that customer is approving quotes for.';

COMMENT ON COLUMN public.approval_tokens.customer_email IS 
  'Customer email address for sending approval link and notifications.';

COMMENT ON COLUMN public.approval_tokens.customer_phone IS 
  'Optional customer phone number for WhatsApp notifications.';

COMMENT ON COLUMN public.approval_tokens.expires_at IS 
  'Token expiration timestamp. Default 7 days from creation. Token cannot be used after this time.';

COMMENT ON COLUMN public.approval_tokens.accessed_at IS 
  'Timestamp when customer first accessed the approval portal via this token. Used for analytics.';

COMMENT ON COLUMN public.approval_tokens.approved_at IS 
  'Timestamp when customer approved a quote via this token. NULL if not yet approved. One-time use.';

COMMIT;

-- =====================================================================
-- Verification Queries (for manual testing)
-- =====================================================================

-- Test token generation:
-- SELECT generate_approval_token();

-- Test token validation:
-- SELECT * FROM validate_approval_token('your-token-here');

-- Check expired tokens:
-- SELECT COUNT(*) FROM approval_tokens WHERE expires_at < NOW();

-- Run cleanup:
-- SELECT cleanup_expired_approval_tokens();
