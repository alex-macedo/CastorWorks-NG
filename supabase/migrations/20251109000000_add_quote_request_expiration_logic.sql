-- Function to check and mark expired quote requests
-- This function is called periodically or on-demand to update expired quotes
CREATE OR REPLACE FUNCTION check_and_mark_expired_quote_requests()
RETURNS TABLE(
  expired_quote_id UUID,
  purchase_request_id UUID,
  supplier_id UUID,
  request_number TEXT,
  project_manager_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH expired_quotes AS (
    UPDATE public.quote_requests qr
    SET
      status = 'expired',
      updated_at = NOW()
    WHERE
      qr.status IN ('sent', 'draft')
      AND qr.response_deadline < NOW()
      AND qr.status != 'expired'
    RETURNING qr.id, qr.purchase_request_id, qr.supplier_id, qr.request_number
  )
  SELECT
    eq.id as expired_quote_id,
    eq.purchase_request_id,
    eq.supplier_id,
    eq.request_number,
    NULL::text as project_manager_email
  FROM expired_quotes eq;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_and_mark_expired_quote_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_mark_expired_quote_requests() TO service_role;

-- Create a view for expired quote requests with project manager details
CREATE OR REPLACE VIEW public.expired_quote_requests_with_manager AS
SELECT
  qr.id,
  qr.purchase_request_id,
  qr.supplier_id,
  qr.request_number,
  qr.response_deadline,
  qr.status,
  qr.created_at,
  s.name as supplier_name,
  s.email as supplier_email,
  pr.project_id,
  NULL::text as project_name,
  NULL::uuid as manager_id,
  NULL::text as manager_email,
  NULL::text as manager_name
FROM public.quote_requests qr
JOIN public.suppliers s ON s.id = qr.supplier_id
JOIN public.project_purchase_requests pr ON pr.id = qr.purchase_request_id
WHERE qr.status = 'expired';

-- Grant select permission on the view
GRANT SELECT ON public.expired_quote_requests_with_manager TO authenticated;
GRANT SELECT ON public.expired_quote_requests_with_manager TO service_role;

-- Create a table for tracking expiration notifications sent
CREATE TABLE IF NOT EXISTS public.quote_expiration_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id UUID NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  project_manager_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL DEFAULT 'expiration', -- 'expiration', 'approaching_deadline'
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notification_method TEXT, -- 'email', 'in-app', 'both'
  status TEXT DEFAULT 'sent', -- 'sent', 'failed', 'pending'
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quote_expiration_notif_quote ON public.quote_expiration_notifications(quote_request_id);
CREATE INDEX IF NOT EXISTS idx_quote_expiration_notif_manager ON public.quote_expiration_notifications(project_manager_id);
CREATE INDEX IF NOT EXISTS idx_quote_expiration_notif_sent_at ON public.quote_expiration_notifications(sent_at);

-- Enable RLS
ALTER TABLE public.quote_expiration_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own quote expiration notifications" ON public.quote_expiration_notifications;
-- RLS policy: Users can view their own notifications
CREATE POLICY "Users can view their own quote expiration notifications"
ON public.quote_expiration_notifications FOR SELECT
USING (
  project_manager_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::app_role
  )
);

DROP POLICY IF EXISTS "Service role can create quote expiration notifications" ON public.quote_expiration_notifications;
-- RLS policy: Service role can insert notifications
CREATE POLICY "Service role can create quote expiration notifications"
ON public.quote_expiration_notifications FOR INSERT
WITH CHECK (auth.role() = 'service_role'); -- Service role will create these via edge functions

-- Comment on function
COMMENT ON FUNCTION check_and_mark_expired_quote_requests() IS
'Checks quote_requests table for expired quotes (response_deadline < NOW) and marks them as expired. Returns list of expired quotes with project manager details for notification purposes.';
