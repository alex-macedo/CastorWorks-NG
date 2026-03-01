-- Migration: Create RPC functions for quote approval and rejection transactions
-- Story 2.7: Edge Functions for Approval and Rejection Processing
-- Created: 2025-11-07

-- =============================================================================
-- Function: approve_quote_transaction
-- =============================================================================
-- Handles the complete approval workflow in a single database transaction:
-- 1. Validates the token
-- 2. Updates the selected quote to 'approved'
-- 3. Updates all other quotes for the same purchase request to 'rejected'
-- 4. Updates the purchase request status to 'approved'
-- 5. Marks the approval token as used (approved_at timestamp)
-- 6. Returns success/error status with details

CREATE OR REPLACE FUNCTION approve_quote_transaction(
  _token text,
  _quote_id uuid,
  _customer_note text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _token_record approval_tokens%ROWTYPE;
  _quote_record quotes%ROWTYPE;
  _purchase_request_id uuid;
  _project_id uuid;
  _result json;
BEGIN
  -- Step 1: Validate token using existing validation function
  SELECT * INTO _token_record
  FROM approval_tokens
  WHERE token = _token
    AND expires_at > NOW()
    AND approved_at IS NULL;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid, expired, or already used token',
      'code', 'INVALID_TOKEN'
    );
  END IF;

  -- Step 2: Fetch and validate the selected quote
  SELECT * INTO _quote_record
  FROM quotes
  WHERE id = _quote_id
    AND purchase_request_id = _token_record.purchase_request_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Quote not found or does not match this approval token',
      'code', 'QUOTE_NOT_FOUND'
    );
  END IF;

  -- Step 3: Get purchase request and project info
  SELECT id, project_id INTO _purchase_request_id, _project_id
  FROM project_purchase_requests
  WHERE id = _token_record.purchase_request_id;

  -- Step 4: Begin transaction updates

  -- Update selected quote to 'approved'
  UPDATE quotes
  SET
    status = 'approved',
    updated_at = NOW()
  WHERE id = _quote_id;

  -- Update all other quotes for this PR to 'rejected'
  UPDATE quotes
  SET
    status = 'rejected',
    updated_at = NOW()
  WHERE purchase_request_id = _purchase_request_id
    AND id != _quote_id
    AND status NOT IN ('approved', 'rejected'); -- Don't update already processed quotes

  -- Update purchase request status to 'approved'
  UPDATE project_purchase_requests
  SET
    status = 'approved',
    updated_at = NOW()
  WHERE id = _purchase_request_id;

  -- Mark approval token as used
  UPDATE approval_tokens
  SET approved_at = NOW()
  WHERE token = _token;

  -- Step 5: Build success response
  _result := json_build_object(
    'success', true,
    'message', 'Quote approved successfully',
    'quote_id', _quote_id,
    'purchase_request_id', _purchase_request_id,
    'project_id', _project_id,
    'total_amount', _quote_record.total_amount,
    'currency', _quote_record.currency_id,
    'customer_email', _token_record.customer_email,
    'customer_note', _customer_note,
    'approved_at', NOW()
  );

  RETURN _result;

EXCEPTION
  WHEN OTHERS THEN
    -- Return error if anything fails (transaction will rollback)
    RETURN json_build_object(
      'success', false,
      'error', 'Database error during approval',
      'details', SQLERRM,
      'code', 'DB_ERROR'
    );
END;
$$;

-- =============================================================================
-- Function: reject_quotes_transaction
-- =============================================================================
-- Handles the complete rejection workflow in a single database transaction:
-- 1. Validates the token
-- 2. Updates all quotes for the purchase request to 'rejected'
-- 3. Updates the purchase request status to 'rejected'
-- 4. Marks the approval token as used (approved_at timestamp for consistency)
-- 5. Returns success/error status with details

CREATE OR REPLACE FUNCTION reject_quotes_transaction(
  _token text,
  _rejection_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _token_record approval_tokens%ROWTYPE;
  _purchase_request_id uuid;
  _project_id uuid;
  _quote_count integer;
  _result json;
BEGIN
  -- Step 1: Validate rejection reason
  IF _rejection_reason IS NULL OR trim(_rejection_reason) = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Rejection reason is required',
      'code', 'MISSING_REASON'
    );
  END IF;

  -- Step 2: Validate token
  SELECT * INTO _token_record
  FROM approval_tokens
  WHERE token = _token
    AND expires_at > NOW()
    AND approved_at IS NULL;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid, expired, or already used token',
      'code', 'INVALID_TOKEN'
    );
  END IF;

  -- Step 3: Get purchase request and project info
  SELECT id, project_id INTO _purchase_request_id, _project_id
  FROM project_purchase_requests
  WHERE id = _token_record.purchase_request_id;

  -- Step 4: Count quotes to be rejected
  SELECT COUNT(*) INTO _quote_count
  FROM quotes
  WHERE purchase_request_id = _purchase_request_id
    AND status NOT IN ('rejected'); -- Only count non-rejected quotes

  -- Step 5: Begin transaction updates

  -- Update all quotes for this PR to 'rejected'
  UPDATE quotes
  SET
    status = 'rejected',
    updated_at = NOW()
  WHERE purchase_request_id = _purchase_request_id
    AND status NOT IN ('rejected'); -- Don't re-reject already rejected quotes

  -- Update purchase request status to 'rejected'
  UPDATE project_purchase_requests
  SET
    status = 'rejected',
    updated_at = NOW()
  WHERE id = _purchase_request_id;

  -- Mark approval token as used (using approved_at for consistency)
  UPDATE approval_tokens
  SET approved_at = NOW()
  WHERE token = _token;

  -- Step 6: Build success response
  _result := json_build_object(
    'success', true,
    'message', 'Quotes rejected successfully',
    'purchase_request_id', _purchase_request_id,
    'project_id', _project_id,
    'quote_count', _quote_count,
    'rejection_reason', _rejection_reason,
    'customer_email', _token_record.customer_email,
    'rejected_at', NOW()
  );

  RETURN _result;

EXCEPTION
  WHEN OTHERS THEN
    -- Return error if anything fails (transaction will rollback)
    RETURN json_build_object(
      'success', false,
      'error', 'Database error during rejection',
      'details', SQLERRM,
      'code', 'DB_ERROR'
    );
END;
$$;

-- =============================================================================
-- Grant permissions
-- =============================================================================
-- These functions use SECURITY DEFINER to run with creator's privileges
-- They're called from edge functions with service role, so they need
-- to be accessible to authenticated users and service role

GRANT EXECUTE ON FUNCTION approve_quote_transaction(text, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION reject_quotes_transaction(text, text) TO authenticated, service_role;

-- =============================================================================
-- Comments for documentation
-- =============================================================================
COMMENT ON FUNCTION approve_quote_transaction IS
'Approves a selected quote and rejects all other quotes for the purchase request.
Validates the approval token, updates quote statuses, purchase request status,
and marks the token as used. All operations happen atomically in a single transaction.
Story 2.7: Edge Functions for Approval and Rejection Processing';

COMMENT ON FUNCTION reject_quotes_transaction IS
'Rejects all quotes for a purchase request with a customer-provided reason.
Validates the approval token, updates quote statuses, purchase request status,
and marks the token as used. All operations happen atomically in a single transaction.
Story 2.7: Edge Functions for Approval and Rejection Processing';
