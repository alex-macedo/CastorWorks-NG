-- Create quote_approval_logs table for audit trail
CREATE TABLE IF NOT EXISTS quote_approval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('approved', 'rejected')),
  approver_name VARCHAR(255) NOT NULL,
  approver_email VARCHAR(255),
  reason TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quote_approval_logs_quote_id ON quote_approval_logs(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_approval_logs_created_at ON quote_approval_logs(created_at DESC);

-- Enable RLS
ALTER TABLE quote_approval_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow project-scoped access to approval logs (via quotes)
DROP POLICY IF EXISTS "project_scoped_select_approval_logs"
ON quote_approval_logs;

CREATE POLICY "project_scoped_select_approval_logs"
ON quote_approval_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM quotes q
    JOIN purchase_request_items pri ON pri.id = q.purchase_request_item_id
    JOIN project_purchase_requests ppr ON ppr.id = pri.request_id
    WHERE q.id = quote_approval_logs.quote_id
    AND has_project_access(auth.uid(), ppr.project_id)
  )
);

-- Create policy to allow project-scoped creation of approval logs
DROP POLICY IF EXISTS "project_scoped_insert_approval_logs"
ON quote_approval_logs;

CREATE POLICY "project_scoped_insert_approval_logs"
ON quote_approval_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM quotes q
    JOIN purchase_request_items pri ON pri.id = q.purchase_request_item_id
    JOIN project_purchase_requests ppr ON ppr.id = pri.request_id
    WHERE q.id = quote_approval_logs.quote_id
    AND has_project_access(auth.uid(), ppr.project_id)
  )
);

-- Add comment
COMMENT ON TABLE quote_approval_logs IS 'Audit trail for quote approvals and rejections';
